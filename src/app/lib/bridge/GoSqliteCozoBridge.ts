/**
 * GoSqliteCozoBridge - Unified data layer facade
 * 
 * Architecture (Data River):
 * - GoSQLite (Go WASM) = Source of truth for notes, entities, edges
 * - CozoDB = Read-only graph engine (lazy hydration from GoSQLite)
 *            + folders (full schema, Datalog queries for hierarchy)
 * - OPFS = Durable cold storage (debounced whole-DB sync)
 * - Dexie = Boot cache only (warmed by write-back, read on cold start)
 * 
 * Write Flow:
 *   UI → GoSQLite → markDirty() → [debounce] → OPFS
 *                  → [fire-and-forget] → Dexie (boot cache warming)
 *                  → [if entity/edge] → CozoDB invalidate
 *                  → [if folder] → CozoDB upsert (folder reads come from Cozo)
 * 
 * Read Flow:
 *   Notes/Entities/Edges: GoSQLite (direct, fast)
 *   Folders: CozoDB (full schema with hierarchy fields)
 *   Graph Queries: CozoHydrator → CozoDB.query()
 * 
 * Boot Flow:
 *   Dexie (instant) → GoSQLite → verify OPFS → lazy hydrate CozoDB
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { GoKittStoreService, StoreNote, StoreEntity, StoreEdge, StoreFolder } from '../../services/gokitt-store.service';
import { CozoHydrator } from './CozoHydrator';
import { GoOpfsSyncService } from '../opfs/GoOpfsSyncService';
import { DexieToCozo, CozoQueries } from './CozoFieldMapper';
import { cozoDb } from '../cozo/db';
import { db } from '../dexie/db';
import type { Note, Folder, Entity, Edge } from '../dexie/db';

// =============================================================================
// TYPES
// =============================================================================

export type BridgeStatus = 'uninitialized' | 'initializing' | 'ready' | 'error';

export interface HydrationReport {
    notes: number;
    folders: number;
    entities: number;
    edges: number;
    duration: number;
    source: 'idb' | 'opfs' | 'fresh';
}

// =============================================================================
// BRIDGE SERVICE
// =============================================================================

@Injectable({ providedIn: 'root' })
export class GoSqliteCozoBridge {
    private goKittStore = inject(GoKittStoreService);
    private cozoHydrator = inject(CozoHydrator);
    private opfsSync = inject(GoOpfsSyncService);

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    private _status = signal<BridgeStatus>('uninitialized');
    private _lastError = signal<string | null>(null);
    private _bootReport = signal<HydrationReport | null>(null);

    readonly status = this._status.asReadonly();
    readonly lastError = this._lastError.asReadonly();
    readonly isReady = computed(() => this._status() === 'ready');
    readonly isSyncing = computed(() => this.opfsSync.status() === 'syncing');
    readonly bootReport = this._bootReport.asReadonly();

    /** Check if bridge is ready (non-signal version for sync access) */
    isReadySync(): boolean {
        return this._status() === 'ready';
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Initialize the bridge.
     * 
     * Boot sequence:
     * 1. Ensure GoKittStoreService is initialized
     * 2. Boot from fastest source (IDB → OPFS → fresh)
     * 3. Mark ready (CozoDB hydrates lazily on first graph query)
     */
    async init(): Promise<void> {
        if (this._status() !== 'uninitialized') {
            console.log('[GoSqliteBridge] Already initialized, skipping');
            return;
        }

        this._status.set('initializing');

        try {
            // Ensure GoKittStore is initialized
            if (!this.goKittStore.isReady) {
                await this.goKittStore.initialize();
            }

            // Boot from fastest available source
            const startTime = Date.now();
            const bootSource = await this.opfsSync.boot();

            // If we had BootCache data (pre-loaded from Dexie), use it on fresh boot
            if (bootSource === 'fresh') {
                await this.tryBootCache();
            }

            // Build report
            const notes = await this.goKittStore.listNotes();
            const entities = await this.goKittStore.listEntities();
            const report: HydrationReport = {
                notes: notes.length,
                folders: 0,
                entities: entities.length,
                edges: 0,
                duration: Date.now() - startTime,
                source: bootSource,
            };
            this._bootReport.set(report);

            this._status.set('ready');
            console.log('[GoSqliteBridge] ✅ Bridge initialized', report);

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this._lastError.set(message);
            this._status.set('error');
            console.error('[GoSqliteBridge] ❌ Initialization failed:', message);
            throw err;
        }
    }

    /**
     * Try BootCache for cold start (pre-loaded from Dexie before Angular).
     */
    private async tryBootCache(): Promise<void> {
        try {
            const { getBootCache } = await import('../core/boot-cache');
            const bootData = getBootCache();

            if (bootData && (bootData.entities.length > 0 || bootData.edges.length > 0 || bootData.notes.length > 0)) {
                console.log(`[GoSqliteBridge] 🚀 BootCache: ${bootData.entities.length} entities, ${bootData.edges.length} edges, ${bootData.notes.length} notes, ${bootData.folders.length} folders`);

                const notePromises = bootData.notes.map((n: Note) =>
                    this.goKittStore.upsertNote(GoKittStoreService.fromDexieNote(n))
                );
                const entityPromises = bootData.entities.map((e: Entity) =>
                    this.goKittStore.upsertEntity(GoKittStoreService.fromDexieEntity(e))
                );
                const edgePromises = bootData.edges.map((e: Edge) =>
                    this.goKittStore.upsertEdge(GoKittStoreService.fromDexieEdge(e))
                );
                const folderPromises = bootData.folders.map((f: Folder) =>
                    this.goKittStore.upsertFolder(GoKittStoreService.fromDexieFolder(f))
                );

                await Promise.all([...notePromises, ...entityPromises, ...edgePromises, ...folderPromises]);

                // Seed CozoDB with folders from boot cache (folders are read from CozoDB)
                this.seedCozoFolders(bootData.folders);

                // First data loaded — sync to OPFS
                this.opfsSync.markDirty();
            }
        } catch (err) {
            console.warn('[GoSqliteBridge] BootCache not available:', err);
        }
    }

    /**
     * Best-effort bulk insert of folders into CozoDB.
     * Folders are served from CozoDB since GoSqlite lacks the full schema.
     */
    private seedCozoFolders(folders: Folder[]): void {
        if (!cozoDb.isReady()) return;
        for (const folder of folders) {
            try {
                const cozo = DexieToCozo.folder(folder);
                cozoDb.runMutation(CozoQueries.upsertFolder(cozo));
            } catch {
                // Best-effort — skip failures
            }
        }
    }

    // -------------------------------------------------------------------------
    // Write Operations (GoSQLite → markDirty → OPFS, fire-and-forget → Dexie)
    // -------------------------------------------------------------------------

    /**
     * Best-effort Dexie write for boot cache warming.
     * Swallows all errors — this is non-critical cache warming.
     */
    private warmDexie<T>(table: { put: (obj: T) => Promise<unknown> }, obj: T): void {
        try {
            if (!(obj as any)?.id) return; // Key path requires id
            table.put(obj).catch(() => { });
        } catch {
            // Swallow synchronous errors too
        }
    }

    /**
     * Sync a note to GoSQLite, mark dirty for OPFS, and warm Dexie boot cache.
     */
    async syncNote(note: Note): Promise<void> {
        await this.goKittStore.upsertNote(GoKittStoreService.fromDexieNote(note));
        this.opfsSync.markDirty();
        this.warmDexie(db.notes, note);
    }

    /**
     * Sync a folder to GoSQLite + CozoDB (folders are read from CozoDB).
     * Also warms Dexie boot cache.
     */
    async syncFolder(folder: Folder): Promise<void> {
        const storeFolder = GoKittStoreService.fromDexieFolder(folder);
        await this.goKittStore.upsertFolder(storeFolder);
        this.opfsSync.markDirty();

        // CozoDB is the read path for folders — sync there too
        try {
            const cozo = DexieToCozo.folder(folder);
            cozoDb.runMutation(CozoQueries.upsertFolder(cozo));
        } catch (err) {
            console.warn('[GoSqliteBridge] CozoDB folder sync failed:', err);
        }

        this.warmDexie(db.folders, folder);
    }

    /**
     * Sync an entity to GoSQLite.
     * Note: GraphRegistry is the authoritative source for entities.
     */
    async syncEntity(entity: Entity): Promise<void> {
        await this.goKittStore.upsertEntity(GoKittStoreService.fromDexieEntity(entity));
        this.opfsSync.markDirty();
        this.cozoHydrator.invalidate();
        this.warmDexie(db.entities, entity);
    }

    /**
     * Sync an edge to GoSQLite.
     */
    async syncEdge(edge: Edge): Promise<void> {
        await this.goKittStore.upsertEdge(GoKittStoreService.fromDexieEdge(edge));
        this.opfsSync.markDirty();
        this.cozoHydrator.invalidate();
        this.warmDexie(db.edges, edge);
    }

    // -------------------------------------------------------------------------
    // Delete Operations
    // -------------------------------------------------------------------------

    async deleteNote(noteId: string): Promise<void> {
        await this.goKittStore.deleteNote(noteId);
        this.opfsSync.markDirty();
        // Fire-and-forget Dexie cleanup
        db.notes.delete(noteId).catch(() => { });
    }

    async deleteFolder(folderId: string): Promise<void> {
        await this.goKittStore.deleteFolder(folderId);
        this.opfsSync.markDirty();
        // CozoDB folder cleanup
        try {
            cozoDb.runMutation(CozoQueries.deleteFolder(folderId));
        } catch {
            // Best-effort
        }
        // Fire-and-forget Dexie cleanup
        db.folders.delete(folderId).catch(() => { });
    }

    async deleteEntity(entityId: string): Promise<void> {
        await this.goKittStore.deleteEntity(entityId);
        this.opfsSync.markDirty();
        this.cozoHydrator.invalidate();
        // Fire-and-forget Dexie cleanup
        db.entities.delete(entityId).catch(() => { });
    }

    async deleteEdge(edgeId: string): Promise<void> {
        await this.goKittStore.deleteEdge(edgeId);
        this.opfsSync.markDirty();
        this.cozoHydrator.invalidate();
        // Fire-and-forget Dexie cleanup
        db.edges.delete(edgeId).catch(() => { });
    }

    // -------------------------------------------------------------------------
    // Read Operations (from GoSQLite)
    // -------------------------------------------------------------------------

    async getNote(id: string): Promise<StoreNote | null> {
        return this.goKittStore.getNote(id);
    }

    async getAllNotes(): Promise<StoreNote[]> {
        return this.goKittStore.listNotes();
    }

    async getNotesByFolder(folderId: string): Promise<StoreNote[]> {
        return this.goKittStore.listNotes(folderId);
    }

    async getEntity(id: string): Promise<StoreEntity | null> {
        return this.goKittStore.getEntity(id);
    }

    async getAllEntities(): Promise<StoreEntity[]> {
        return this.goKittStore.listEntities();
    }

    async getEdgesForEntity(entityId: string): Promise<StoreEdge[]> {
        return this.goKittStore.listEdgesForEntity(entityId);
    }

    async getFolder(id: string): Promise<StoreFolder | null> {
        return this.goKittStore.getFolder(id);
    }

    async getAllFolders(): Promise<StoreFolder[]> {
        return this.goKittStore.listFolders();
    }

    // -------------------------------------------------------------------------
    // Graph Queries (CozoDB — lazy hydration)
    // -------------------------------------------------------------------------

    /**
     * Run a Datalog query on CozoDB with auto-hydration.
     * Use this for graph traversals, HNSW search, etc.
     */
    queryGraph<T = unknown[]>(
        script: string,
        params?: Record<string, unknown>
    ): T[] {
        // Synchronous path — assumes hydrated.
        // For guaranteed hydration, use queryGraphAsync.
        return this.cozoHydrator.querySync<T>(script, params);
    }

    /**
     * Async Datalog query with guaranteed hydration.
     */
    async queryGraphAsync<T = unknown[]>(
        script: string,
        params?: Record<string, unknown>
    ): Promise<T[]> {
        return this.cozoHydrator.queryAsync<T>(script, params);
    }

    /**
     * Run a Datalog query and return a single row.
     */
    queryOne<T = unknown[]>(
        script: string,
        params?: Record<string, unknown>
    ): T | null {
        return this.cozoHydrator.queryOne<T>(script, params);
    }

    // -------------------------------------------------------------------------
    // Utility Methods
    // -------------------------------------------------------------------------

    /** Force sync to OPFS immediately */
    async flushQueue(): Promise<void> {
        await this.opfsSync.syncNow();
    }

    /** Check if there are pending sync operations */
    hasPendingSync(): boolean {
        return this.opfsSync.isDirty();
    }

    /** Get OPFS sync status */
    getSyncStatus() {
        return {
            status: this.opfsSync.status(),
            lastSync: this.opfsSync.lastSync(),
            isDirty: this.opfsSync.isDirty(),
            cozoStatus: this.cozoHydrator.status(),
        };
    }

    /** Cleanup when service is destroyed */
    destroy(): void {
        this._status.set('uninitialized');
    }
}
