/**
 * Bridge Module - Data Layer Orchestration
 * 
 * Architecture:
 * - GoSqliteCozoBridge: Unified facade (GoSQLite → OPFS → CozoDB)
 * - CozoHydrator: Lazy CozoDB hydration from GoSQLite
 * - GoOpfsSyncService: Debounced OPFS persistence
 * - CozoFieldMapper: Field mapping for CozoDB hydration
 */

export { GoSqliteCozoBridge, type BridgeStatus, type HydrationReport } from './GoSqliteCozoBridge';
export { CozoHydrator, type HydrationStatus } from './CozoHydrator';
export { GoOpfsSyncService, type SyncStatus as OpfsSyncStatus } from '../opfs/GoOpfsSyncService';

// CozoFieldMapper (used by CozoHydrator for graph hydration)
export {
    DexieToCozo,
    CozoToDexie,
    CozoQueries,
    type CozoNote,
    type CozoFolder,
    type CozoEntity,
    type CozoEdge,
} from './CozoFieldMapper';
