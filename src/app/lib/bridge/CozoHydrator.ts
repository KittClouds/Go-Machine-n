/**
 * CozoHydrator - Lazy graph engine hydration from GoSQLite
 * 
 * CozoDB is now a READ-ONLY graph engine. It hydrates on demand 
 * when graph queries are needed, reading data from GoSQLite (the source of truth).
 * 
 * Architecture:
 * - GoSQLite = Source of truth for all data
 * - CozoDB = Lazy graph computation engine (Datalog queries only)
 * - Hydration happens once per session, re-triggers when invalidated
 */

import { Injectable, inject, signal } from '@angular/core';
import { GoKittStoreService } from '../../services/gokitt-store.service';
import { cozoDb } from '../cozo/db';
import { DexieToCozo, CozoQueries } from './CozoFieldMapper';
import type { Note, Entity, Edge } from '../dexie/db';

export type HydrationStatus = 'empty' | 'hydrating' | 'ready' | 'stale' | 'error';

interface CozoQueryResult<T = unknown[]> {
    ok: boolean;
    rows?: T[];
    headers?: string[];
    took?: number;
    message?: string;
    display?: string;
}

@Injectable({ providedIn: 'root' })
export class CozoHydrator {
    private goKittStore = inject(GoKittStoreService);

    private _status = signal<HydrationStatus>('empty');
    private _lastHydration = signal<number>(0);
    private _hydrationVersion = 0;

    readonly status = this._status.asReadonly();
    readonly lastHydration = this._lastHydration.asReadonly();
    readonly isReady = () => this._status() === 'ready';

    /**
     * Ensure CozoDB is hydrated before a graph query.
     * Call this as a guard before any Datalog query.
     */
    async ensureHydrated(): Promise<void> {
        const status = this._status();
        if (status === 'ready') return;
        if (status === 'hydrating') {
            await this.waitForHydration();
            return;
        }
        await this.hydrate();
    }

    /**
     * Invalidate CozoDB state.
     * Next graph query will trigger re-hydration.
     */
    invalidate(): void {
        if (this._status() === 'ready') {
            this._status.set('stale');
        }
    }

    /**
     * Full hydration: GoSQLite → CozoDB.
     * Reads all entities and edges from GoSQLite and bulk-imports into CozoDB.
     * Notes are NOT hydrated to CozoDB (no graph value for raw note content).
     */
    async hydrate(): Promise<void> {
        // Don't hydrate if CozoDB isn't ready
        if (!cozoDb.isReady()) {
            console.warn('[CozoHydrator] CozoDB not ready, skipping hydration');
            return;
        }

        this._status.set('hydrating');
        const version = ++this._hydrationVersion;
        const start = Date.now();

        try {
            // 1. Read all graph data from GoSQLite
            const [entities, edges] = await Promise.all([
                this.goKittStore.listEntities(),
                this.goKittStore.listAllEdges(),
            ]);

            // 2. Check if we were superseded
            if (version !== this._hydrationVersion) {
                console.log('[CozoHydrator] Hydration superseded, aborting');
                return;
            }

            // 3. Bulk import into CozoDB
            let entityCount = 0;
            let edgeCount = 0;
            let errors = 0;

            // Entities
            for (const entity of entities) {
                try {
                    const dexieEntity: Entity = {
                        id: entity.id,
                        label: entity.label,
                        kind: entity.kind,
                        subtype: entity.subtype,
                        aliases: entity.aliases || [],
                        firstNote: entity.firstNote,
                        totalMentions: entity.totalMentions,
                        createdAt: entity.createdAt,
                        updatedAt: entity.updatedAt,
                        createdBy: entity.createdBy,
                        narrativeId: entity.narrativeId,
                    };
                    const cozoEntity = DexieToCozo.entity(dexieEntity);
                    const result = cozoDb.runMutation(CozoQueries.upsertEntity(cozoEntity));
                    if (result && !result.ok) {
                        errors++;
                    } else {
                        entityCount++;
                    }
                } catch (err) {
                    errors++;
                }
            }

            // Edges
            for (const edge of edges) {
                try {
                    const dexieEdge: Edge = {
                        id: edge.id,
                        sourceId: edge.sourceId,
                        targetId: edge.targetId,
                        relType: edge.relType,
                        confidence: edge.confidence,
                        bidirectional: edge.bidirectional,
                    };
                    const cozoEdge = DexieToCozo.edge(dexieEdge);
                    const result = cozoDb.runMutation(CozoQueries.upsertEdge(cozoEdge));
                    if (result && !result.ok) {
                        errors++;
                    } else {
                        edgeCount++;
                    }
                } catch (err) {
                    errors++;
                }
            }

            this._status.set('ready');
            this._lastHydration.set(Date.now());

            const duration = Date.now() - start;
            console.log(
                `[CozoHydrator] ✅ Hydrated in ${duration}ms: ` +
                `${entityCount} entities, ${edgeCount} edges` +
                (errors > 0 ? ` (${errors} errors)` : '')
            );

        } catch (err) {
            console.error('[CozoHydrator] ❌ Hydration failed:', err);
            this._status.set('error');
        }
    }

    /**
     * Direct Datalog query with auto-hydration guard.
     */
    async queryAsync<T = unknown[]>(
        script: string,
        params?: Record<string, unknown>
    ): Promise<T[]> {
        await this.ensureHydrated();
        return this.querySync<T>(script, params);
    }

    /**
     * Synchronous Datalog query (assumes already hydrated).
     * For hot paths where hydration is guaranteed.
     */
    querySync<T = unknown[]>(
        script: string,
        params?: Record<string, unknown>
    ): T[] {
        try {
            const result = cozoDb.runQuery(script, params || {}) as CozoQueryResult<T>;
            if (!result.ok) {
                console.error('[CozoHydrator] Query failed:', result.message || result.display);
                return [];
            }
            return result.rows || [];
        } catch (err) {
            console.error('[CozoHydrator] Query error:', err);
            return [];
        }
    }

    /**
     * Synchronous single-row query.
     */
    queryOne<T = unknown[]>(
        script: string,
        params?: Record<string, unknown>
    ): T | null {
        const results = this.querySync<T>(script, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Run a CozoDB mutation.
     */
    runMutation(script: string): void {
        try {
            cozoDb.runMutation(script);
        } catch (err) {
            console.error('[CozoHydrator] Mutation error:', err);
        }
    }

    private waitForHydration(): Promise<void> {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (this._status() !== 'hydrating') {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 30000);
        });
    }
}
