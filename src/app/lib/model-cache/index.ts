/**
 * Model Cache - Isolated IndexedDB for ML Model Storage
 * 
 * Public API exports
 */

export { modelCacheDb } from './db';
export type { CachedModel, CacheStats } from './db';
export { modelCache, ModelCacheService } from './service';
