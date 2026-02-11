/**
 * GoOpfsSyncService - Syncs GoSQLite database to/from OPFS cold storage
 * 
 * Architecture:
 * - GoSQLite (in-memory) = Source of truth during runtime
 * - OPFS = Durable cold storage (survives tab close, clear cache, etc.)
 * - IDB (hackpadfs) = Fast boot cache (used by Go internally)
 * 
 * Sync Strategy:
 * - Write path: GoSQLite.export() → bytes → OPFS (debounced 3s, max 10s)
 * - Boot path: IDB cache (instant) → verify against OPFS in background
 *              OPFS (if IDB empty) → GoSQLite.import()
 * - Tab coordination: BroadcastChannel + navigator.locks
 */

import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { GoKittStoreService } from '../../services/gokitt-store.service';
import { RealOpfsBackend } from './RealOpfsBackend';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'booting';

const OPFS_DB_PATH = 'gokitt/sqlite.db';
const OPFS_CHECKSUM_PATH = 'gokitt/sqlite.checksum';
const SYNC_DEBOUNCE_MS = 3000;
const SYNC_MAX_WAIT_MS = 10000;
const TAB_ID = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

@Injectable({ providedIn: 'root' })
export class GoOpfsSyncService implements OnDestroy {
    private goKittStore = inject(GoKittStoreService);
    private opfs = new RealOpfsBackend();

    private _status = signal<SyncStatus>('idle');
    private _lastSync = signal<number>(0);
    private _dirty = signal(false);
    private _bootSource = signal<'idb' | 'opfs' | 'fresh' | null>(null);

    readonly status = this._status.asReadonly();
    readonly lastSync = this._lastSync.asReadonly();
    readonly isDirty = this._dirty.asReadonly();
    readonly bootSource = this._bootSource.asReadonly();

    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
    private syncChannel: BroadcastChannel | null = null;
    private destroyed = false;

    constructor() {
        // Setup multi-tab coordination
        try {
            this.syncChannel = new BroadcastChannel('gokitt-opfs-sync');
            this.syncChannel.onmessage = (e: MessageEvent) => this.handleTabMessage(e.data);
        } catch {
            console.warn('[GoOpfsSync] BroadcastChannel not available');
        }

        // Sync before tab close
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                if (this._dirty()) {
                    this.performSyncSync(); // Best-effort sync
                }
            });
        }
    }

    /**
     * Boot sequence: Load SQLite state from fastest available source.
     * 
     * GoSQLite uses :memory: — no IDB persistence. Data comes from:
     * 1. OPFS cold storage (durable blob from last session)
     * 2. Dexie BootCache (fallback if OPFS empty — seeded in tryBootCache)
     * 3. Fresh start (no data anywhere)
     */
    async boot(): Promise<'idb' | 'opfs' | 'fresh'> {
        this._status.set('booting');

        try {
            // Step 1: Check if GoSQLite already has data (e.g. from a previous init in this session)
            const noteCount = await this.goKittStore.countNotes();

            if (noteCount > 0) {
                console.log(`[GoOpfsSync] 🚀 SQLite already populated: ${noteCount} notes`);
                this._bootSource.set('idb');
                this._status.set('idle');
                this.backgroundVerify();
                return 'idb';
            }

            // Step 2: Try OPFS
            const hasOpfs = await this.opfs.exists(OPFS_DB_PATH);
            if (hasOpfs) {
                console.log('[GoOpfsSync] 📂 Loading from OPFS...');
                const opfsData = await this.opfs.read(OPFS_DB_PATH);
                if (opfsData && opfsData.byteLength > 0) {
                    await this.goKittStore.importDatabase(new Uint8Array(opfsData));
                    const count = await this.goKittStore.countNotes();
                    console.log(`[GoOpfsSync] ✅ Restored ${count} notes from OPFS (${opfsData.byteLength} bytes)`);
                    this._bootSource.set('opfs');
                    this._status.set('idle');
                    return 'opfs';
                }
            }

            // Step 3: Fresh start
            console.log('[GoOpfsSync] 🆕 Fresh start — no existing data');
            this._bootSource.set('fresh');
            this._status.set('idle');
            return 'fresh';
        } catch (err) {
            console.error('[GoOpfsSync] ❌ Boot failed:', err);
            this._status.set('error');
            return 'fresh';
        }
    }

    /**
     * Mark the database as dirty (needs sync to OPFS).
     * Called after any write operation.
     */
    markDirty(): void {
        this._dirty.set(true);
        this.scheduleSync();
    }

    /**
     * Force an immediate sync to OPFS.
     */
    async syncNow(): Promise<void> {
        this.clearTimers();
        await this.performSync();
    }

    /**
     * Debounced sync scheduling.
     */
    private scheduleSync(): void {
        if (this.destroyed) return;

        // Debounce: reset on each call
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.performSync(), SYNC_DEBOUNCE_MS);

        // Max wait: ensure sync even during continuous activity
        if (!this.maxWaitTimer) {
            this.maxWaitTimer = setTimeout(() => {
                this.maxWaitTimer = null;
                this.performSync();
            }, SYNC_MAX_WAIT_MS);
        }
    }

    /**
     * Perform the actual sync: Export SQLite → Write to OPFS.
     */
    private async performSync(): Promise<void> {
        if (!this._dirty() || this.destroyed) return;

        // Notify other tabs
        this.syncChannel?.postMessage({ type: 'sync-start', tabId: TAB_ID });
        this._status.set('syncing');

        try {
            // Use navigator.locks for proper file locking
            if ('locks' in navigator) {
                await navigator.locks.request('gokitt-opfs-write', async () => {
                    await this.doSync();
                });
            } else {
                await this.doSync();
            }
        } catch (err) {
            console.error('[GoOpfsSync] ❌ Sync failed:', err);
            this._status.set('error');
            // Retry on next schedule
            this.scheduleSync();
        }
    }

    private async doSync(): Promise<void> {
        const bytes = await this.goKittStore.exportDatabase();

        if (!bytes || bytes.length === 0) {
            console.warn('[GoOpfsSync] Export returned empty data, skipping sync');
            return;
        }

        // Write to OPFS
        await this.opfs.write(OPFS_DB_PATH, bytes);

        // Write checksum metadata
        const checksum = new TextEncoder().encode(
            JSON.stringify({ size: bytes.length, ts: Date.now(), tab: TAB_ID })
        );
        await this.opfs.write(OPFS_CHECKSUM_PATH, checksum);

        this._dirty.set(false);
        this._lastSync.set(Date.now());
        this._status.set('idle');

        // Notify other tabs
        this.syncChannel?.postMessage({ type: 'sync-complete', tabId: TAB_ID, size: bytes.length });

        console.log(`[GoOpfsSync] ✅ Synced ${bytes.length} bytes to OPFS`);
    }

    /**
     * Best-effort synchronous sync for beforeunload.
     */
    private performSyncSync(): void {
        // We can't do async in beforeunload reliably, but we can try
        this.performSync().catch(console.error);
    }

    /**
     * Background OPFS verification after IDB boot.
     */
    private async backgroundVerify(): Promise<void> {
        try {
            const opfsExists = await this.opfs.exists(OPFS_DB_PATH);
            if (!opfsExists) {
                console.log('[GoOpfsSync] 🔄 IDB has data but OPFS empty — syncing to OPFS...');
                this._dirty.set(true);
                await this.performSync();
            }
            // If both exist, IDB cache is more recent (it was the running state)
        } catch (err) {
            console.warn('[GoOpfsSync] Background verify failed:', err);
        }
    }

    /**
     * Handle messages from other tabs.
     */
    private handleTabMessage(data: any): void {
        if (data.tabId === TAB_ID) return; // Ignore own messages

        if (data.type === 'sync-complete') {
            console.log(`[GoOpfsSync] 📡 Tab ${data.tabId} synced ${data.size} bytes to OPFS`);
            // Could trigger a re-read from OPFS here if needed
        }
    }

    private clearTimers(): void {
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
        if (this.maxWaitTimer) { clearTimeout(this.maxWaitTimer); this.maxWaitTimer = null; }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.clearTimers();
        this.syncChannel?.close();

        // Force final sync if dirty
        if (this._dirty()) {
            this.performSync().catch(console.error);
        }
    }
}
