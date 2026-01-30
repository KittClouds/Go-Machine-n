import { Injectable } from '@angular/core';
import { db, Span, Entity, Claim, Wormhole } from '../dexie/db';

/**
 * Dependency Graph Node for reactive invalidation
 */
interface ProjectionDependency {
    sourceSpanId: string;
    // what derived artifacts depend on this span?
    dependents: {
        type: 'entity' | 'claim' | 'cst_node';
        id: string;
    }[];
}

/**
 * Per-World Projection Cache
 * Stores derived artifacts (CST, PCST) and dependency graph to minimize re-compute.
 */
interface WorldProjectionState {
    worldId: string;

    // Cache for Concrete Syntax Trees or Projected CSTs
    // Key: noteId, Value: Computed Tree
    cstCache: Map<string, any>;

    // Dependency Graph: Which spans effect which higher-order constructs
    // Key: spanId, Value: Dependencies
    dependencyGraph: Map<string, ProjectionDependency>;

    // Entity/Claim Projection Cache (hot objects)
    entityProjectionCache: Map<string, Entity>;
    claimProjectionCache: Map<string, Claim>;
}

@Injectable({
    providedIn: 'root'
})
export class ProjectionCacheService {
    // In-memory cache of projections (cleared on reload, rehydrated lazily)
    private worlds = new Map<string, WorldProjectionState>();

    constructor() { }

    private getWorld(worldId: string): WorldProjectionState {
        if (!this.worlds.has(worldId)) {
            this.worlds.set(worldId, {
                worldId,
                cstCache: new Map(),
                dependencyGraph: new Map(),
                entityProjectionCache: new Map(),
                claimProjectionCache: new Map()
            });
        }
        return this.worlds.get(worldId)!;
    }

    /**
     * INVALIDATION: Called when a span is modified/detached (e.g. by re-anchoring)
     * Triggers updates only for affected derived artifacts.
     */
    invalidateSpan(worldId: string, spanId: string) {
        const world = this.getWorld(worldId);
        const deps = world.dependencyGraph.get(spanId);

        if (deps) {
            deps.dependents.forEach(dep => {
                if (dep.type === 'entity') world.entityProjectionCache.delete(dep.id);
                if (dep.type === 'claim') world.claimProjectionCache.delete(dep.id);
                // CST invalidation might be more granular (node level) or note level
            });
        }
    }

    /**
     * CROSS-WORLD QUERY: world -> spans -> wormholes -> target spans -> target entities
     * Optimized for performance using indices.
     */
    async crossWorldQuery(
        sourceWorldId: string,
        start: number,
        end: number
    ): Promise<{ spans: Span[], entities: Entity[] }> {
        // 1. Get Source Spans (using compound index [worldId+start+end])
        // Dexie doesn't strictly support 3-field compound range efficiently in one go without 'between',
        // but we can query by worldId and filter, or if we set up [worldId+noteId], etc.
        // For now assuming [worldId+start+end] index exists

        const sourceSpans = await db.spans
            .where('[worldId+start+end]')
            .between([sourceWorldId, start, -Infinity], [sourceWorldId, end, Infinity])
            .toArray();

        // 2. Find Wormholes (Contracts)
        const spanIds = sourceSpans.map(s => s.id);
        const wormholes = await db.wormholes
            .where('srcSpanId')
            .anyOf(spanIds)
            .toArray();

        // 3. Resolve Target Spans from Wormholes
        const targetSpanIds = wormholes.map(w => w.dstSpanId);
        const targetSpans = await db.spans.bulkGet(targetSpanIds);
        // Note: Dexie bulkGet returns (Span | undefined)[]

        const validTargetSpans = targetSpans.filter(s => !!s) as Span[];

        // 4. Resolve Target Entities (if any claim links/mentions exist)
        // This usually goes through SpanMention table
        const targetSpanIdsList = validTargetSpans.map(s => s.id);
        const mentions = await db.spanMentions
            .where('spanId')
            .anyOf(targetSpanIdsList)
            .toArray();

        const entityIds = mentions
            .map(m => m.candidateEntityId)
            .filter(id => !!id) as string[];

        const entities = await db.entities.bulkGet(entityIds);

        return {
            spans: validTargetSpans,
            entities: entities.filter(e => !!e) as Entity[]
        };
    }
}
