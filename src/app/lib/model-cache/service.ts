/**
 * ModelCacheService - High-level API for model caching
 * 
 * Provides methods for storing and retrieving ML model blobs
 * from the isolated IndexedDB cache.
 */

import { modelCacheDb, CachedModel, CacheStats } from './db';

export class ModelCacheService {
    private static instance: ModelCacheService;

    static getInstance(): ModelCacheService {
        if (!this.instance) {
            this.instance = new ModelCacheService();
        }
        return this.instance;
    }

    // =========================================================================
    // CACHE OPERATIONS
    // =========================================================================

    /**
     * Check if a model exists in cache
     */
    async has(id: string): Promise<boolean> {
        const count = await modelCacheDb.models.where('id').equals(id).count();
        return count > 0;
    }

    /**
     * Get a model blob from cache
     */
    async get(id: string): Promise<Blob | null> {
        const cached = await modelCacheDb.models.get(id);
        return cached?.blob ?? null;
    }

    /**
     * Get full cached model metadata
     */
    async getModel(id: string): Promise<CachedModel | null> {
        return (await modelCacheDb.models.get(id)) ?? null;
    }

    /**
     * Store a model in cache
     */
    async put(
        id: string,
        type: CachedModel['type'],
        url: string,
        blob: Blob,
        version?: string
    ): Promise<void> {
        const model: CachedModel = {
            id,
            type,
            url,
            blob,
            size: blob.size,
            cachedAt: Date.now(),
            version,
            contentType: blob.type,
        };

        await modelCacheDb.models.put(model);
        console.log(`[ModelCache] ✓ Cached ${id} (${this.formatBytes(blob.size)})`);
    }

    /**
     * Delete a specific model from cache
     */
    async delete(id: string): Promise<void> {
        await modelCacheDb.models.delete(id);
        console.log(`[ModelCache] Deleted ${id}`);
    }

    /**
     * Clear all cached models
     */
    async clear(): Promise<void> {
        const count = await modelCacheDb.models.count();
        await modelCacheDb.models.clear();
        console.log(`[ModelCache] Cleared ${count} cached models`);
    }

    /**
     * Clear models by type
     */
    async clearByType(type: CachedModel['type']): Promise<number> {
        const models = await modelCacheDb.models.where('type').equals(type).toArray();
        const ids = models.map(m => m.id);
        await modelCacheDb.models.bulkDelete(ids);
        console.log(`[ModelCache] Cleared ${ids.length} ${type} models`);
        return ids.length;
    }

    // =========================================================================
    // STATS
    // =========================================================================

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        const models = await modelCacheDb.models.toArray();

        const byType: Record<string, { count: number; bytes: number }> = {};
        let totalBytes = 0;

        for (const model of models) {
            totalBytes += model.size;

            if (!byType[model.type]) {
                byType[model.type] = { count: 0, bytes: 0 };
            }
            byType[model.type].count++;
            byType[model.type].bytes += model.size;
        }

        return {
            count: models.length,
            totalBytes,
            byType,
        };
    }

    /**
     * Log cache stats to console
     */
    async logStats(): Promise<void> {
        const stats = await this.getStats();
        console.log(`[ModelCache] 📊 Stats:`);
        console.log(`  Total: ${stats.count} models, ${this.formatBytes(stats.totalBytes)}`);
        for (const [type, data] of Object.entries(stats.byType)) {
            console.log(`  ${type}: ${data.count} models, ${this.formatBytes(data.bytes)}`);
        }
    }

    // =========================================================================
    // FETCH WITH CACHE
    // =========================================================================

    /**
     * Fetch a model from URL, using cache if available
     * Returns the blob (from cache or network)
     */
    async fetchWithCache(
        id: string,
        url: string,
        type: CachedModel['type'],
        options?: {
            version?: string;
            onProgress?: (loaded: number, total: number) => void;
        }
    ): Promise<Blob> {
        // Check cache first
        const cached = await this.getModel(id);
        if (cached) {
            // Version check if provided
            if (options?.version && cached.version !== options.version) {
                console.log(`[ModelCache] Version mismatch for ${id}, re-fetching...`);
            } else {
                console.log(`[ModelCache] ⚡ Cache hit: ${id}`);
                return cached.blob;
            }
        }

        // Fetch from network
        console.log(`[ModelCache] 🌐 Fetching: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        // Read with progress if callback provided
        let blob: Blob;
        if (options?.onProgress && response.body) {
            const reader = response.body.getReader();
            const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
            const chunks: Uint8Array[] = [];
            let loaded = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                options.onProgress(loaded, contentLength);
            }

            blob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || '' });
        } else {
            blob = await response.blob();
        }

        // Cache it
        await this.put(id, type, url, blob, options?.version);

        return blob;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

// Singleton export
export const modelCache = ModelCacheService.getInstance();
