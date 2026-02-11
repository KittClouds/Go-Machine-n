# Unified LLM Extractor Service Plan

## Overview

Combine `LlmEntityExtractorService` and `LlmRelationExtractorService` into a single `LlmExtractorService` that handles both entity and relationship extraction.

## Current State Analysis

### Shared Code (Duplicated)
- `isExtracting` / `extractionProgress` signals
- `isConfigured()` / `getProviderInfo()` methods
- `getNoteIdsInNarrative()` / `getDescendantFolderIds()` helpers
- JSON parsing with markdown removal and repair logic
- Narrative traversal logic

### Unique to Entity Extractor
- Entity-specific prompts
- `ExtractedEntity` interface
- Entity deduplication by label
- Registry commit for entities

### Unique to Relation Extractor
- Relation-specific prompts
- `ExtractedRelation` interface
- CST validation with GoKitt
- Relation deduplication by (subject, type, object)
- Auto-creates missing entities during commit

---

## Proposed Design

### New File: `src/app/lib/services/llm-extractor.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class LlmExtractorService {
    private llmBatch = inject(LlmBatchService);
    private goKitt = inject(GoKittService);
    
    // Unified state
    isExtracting = signal(false);
    extractionProgress = signal({ current: 0, total: 0, phase: 'idle' as 'idle' | 'entities' | 'relations' });
    
    // =========================================================================
    // Configuration
    // =========================================================================
    
    isConfigured(): boolean;
    getProviderInfo(): { provider: string; model: string };
    
    // =========================================================================
    // Single Note Extraction
    // =========================================================================
    
    /** Extract entities only from a single note */
    async extractEntitiesFromNote(noteId: string, text: string): Promise<ExtractedEntity[]>;
    
    /** Extract relations only from a single note */
    async extractRelationsFromNote(noteId: string, text: string, knownEntities?: string[]): Promise<ExtractedRelation[]>;
    
    /** Extract BOTH entities and relations in one call (efficient) */
    async extractFromNote(noteId: string, text: string): Promise<{
        entities: ExtractedEntity[];
        relations: ExtractedRelation[];
    }>;
    
    // =========================================================================
    // Narrative Extraction (Batch)
    // =========================================================================
    
    /** Extract entities from all notes in a narrative */
    async extractEntitiesFromNarrative(narrativeId: string): Promise<ExtractionResult>;
    
    /** Extract relations from all notes in a narrative */
    async extractRelationsFromNarrative(narrativeId: string): Promise<RelationExtractionResult>;
    
    /** Extract BOTH entities and relations from narrative (full pipeline) */
    async extractFromNarrative(narrativeId: string): Promise<{
        entities: ExtractionResult;
        relations: RelationExtractionResult;
    }>;
    
    // =========================================================================
    // Registry Commit
    // =========================================================================
    
    /** Commit entities to registry */
    commitEntitiesToRegistry(entities: ExtractedEntity[]): Promise<CommitResult>;
    
    /** Commit relations to registry (auto-creates missing entities) */
    commitRelationsToRegistry(relations: ExtractedRelation[]): Promise<RelationCommitResult>;
    
    /** Full pipeline: extract + commit */
    async extractAndCommit(narrativeId: string): Promise<{
        entities: { extracted: number; committed: CommitResult };
        relations: { extracted: number; committed: RelationCommitResult };
    }>;
    
    // =========================================================================
    // CST Validation
    // =========================================================================
    
    /** Validate relations against CST */
    async validateWithCST(noteId: string, relations: ExtractedRelation[]): Promise<ExtractedRelation[]>;
}
```

### Combined Extraction Prompt

Instead of two separate LLM calls, use a single prompt that extracts both:

```
SYSTEM: You are a knowledge graph extraction assistant. Extract entities AND relationships from narrative text.

USER: Extract from this text:
1. Named entities (characters, locations, items, factions, events, concepts)
2. Relationships between entities

Return JSON:
{
  "entities": [
    {"label": "...", "kind": "CHARACTER|NPC|LOCATION|...", "confidence": 0.0-1.0}
  ],
  "relations": [
    {"subject": "...", "object": "...", "relationType": "LEADS|...", "verb": "...", "confidence": 0.0-1.0}
  ]
}

TEXT:
{truncatedText}
```

---

## Migration Plan

### Phase 1: Create Unified Service
1. Create `llm-extractor.service.ts` with combined logic
2. Copy shared helpers (narrative traversal, JSON repair)
3. Implement combined extraction prompt
4. Implement all public methods

### Phase 2: Update Consumers
Search for usages of:
- `LlmEntityExtractorService` → `LlmExtractorService`
- `LlmRelationExtractorService` → `LlmExtractorService`

### Phase 3: Deprecate Old Services
1. Mark old services with `@deprecated` JSDoc
2. Have them delegate to `LlmExtractorService` internally
3. Remove in future release

---

## Files to Create/Modify

### Create
| File | Purpose |
|------|---------|
| `src/app/lib/services/llm-extractor.service.ts` | Unified extraction service |

### Modify
| File | Changes |
|------|---------|
| Consumers of entity extractor | Use new unified service |
| Consumers of relation extractor | Use new unified service |

### Deprecate (Later Delete)
| File | Reason |
|------|--------|
| `src/app/lib/services/llm-entity-extractor.service.ts` | Replaced by unified service |
| `src/app/lib/services/llm-relation-extractor.service.ts` | Replaced by unified service |

---

## Benefits

1. **Reduced LLM Calls** - Single extraction pass instead of two
2. **Shared Context** - Entities and relations extracted together for better coherence
3. **Less Code Duplication** - Single source of truth for extraction logic
4. **Simpler Consumer API** - One service to inject instead of two
5. **Unified Progress Tracking** - Single progress signal for full pipeline

---

## Ready for Implementation?

Shall I proceed with creating the unified `LlmExtractorService`?
