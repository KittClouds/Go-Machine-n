# Phase 5: Dead Code Cleanup Plan

## Summary

Phase 4 successfully migrated all LLM operations to Go WASM. The TypeScript services now delegate to `GoKittService` for actual extraction/chat operations. This left behind dead code that can be safely removed.

---

## Dead Code Analysis

### 1. [`llm-entity-extractor.service.ts`](src/app/lib/services/llm-entity-extractor.service.ts)

| Lines | Dead Code | Reason |
|-------|-----------|--------|
| 37 | `SYSTEM_PROMPT` | Go constructs prompts now |
| 39-61 | `USER_PROMPT_TEMPLATE` | Go constructs prompts now |
| 287-342 | `parseEntityResponse()` | Go returns parsed JSON |
| 347-365 | `repairTruncatedJson()` | Go handles JSON repair |

**Keep:** `extractFromNote()`, `extractFromNarrative()`, `commitToRegistry()`, `ensureGoBatchInit()`, helper methods for folder traversal

---

### 2. [`llm-relation-extractor.service.ts`](src/app/lib/services/llm-relation-extractor.service.ts)

| Lines | Dead Code | Reason |
|-------|-----------|--------|
| 72-91 | `RELATION_TYPES` array | Only used in dead `buildUserPrompt` and `parseRelationResponse` |
| 93 | `RelationType` type | Derived from dead array |
| 99-101 | `SYSTEM_PROMPT` | Go constructs prompts now |
| 103-131 | `buildUserPrompt()` | Go constructs prompts now |
| 470-538 | `parseRelationResponse()` | Go returns parsed JSON |
| 543-546 | `parseKind()` | Only called from dead `parseRelationResponse` |
| 551-571 | `repairTruncatedJson()` | Go handles JSON repair |

**Keep:** `extractFromNote()`, `extractFromNarrative()`, `commitToRegistry()`, `validateWithCST()`, `ensureGoBatchInit()`, helper methods for folder traversal

---

### 3. [`llm-batch.service.ts`](src/app/lib/services/llm-batch.service.ts)

| Lines | Dead Code | Reason |
|-------|-----------|--------|
| 121-129 | `complete()` | No callers - Go handles LLM calls |
| 134-181 | `callGoogleDirect()` | Only called by dead `complete()` |
| 186-236 | `callOpenRouterDirect()` | Only called by dead `complete()` |

**Keep:** All config management (`_config`, `provider`, `googleModel`, `openRouterModel`, `currentModel`, `isConfigured`, `loadConfig`, `saveConfig`, `getConfig`, `updateConfig`), model constants

---

### 4. [`openrouter.service.ts`](src/app/lib/services/openrouter.service.ts)

| Lines | Dead Code | Reason |
|-------|-----------|--------|
| 203-278 | `chatWithTools()` | Migrated to Go via `goKittService.agentChatWithTools()` |

**Keep:** Streaming chat, config management, model list

---

## Execution Order

1. **Entity Extractor Cleanup** - Remove 4 dead code blocks
2. **Relation Extractor Cleanup** - Remove 7 dead code blocks  
3. **LlmBatchService Cleanup** - Remove 3 methods, keep config
4. **OpenRouterService Cleanup** - Remove `chatWithTools()`
5. **Build Verification** - `ng build --configuration=development`
6. **Final Sweep** - Check for orphaned imports

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidentally remove used code | Verified no callers via regex search |
| Orphaned imports | TypeScript compiler will catch |
| Runtime errors | Build verification step |

---

## Files Modified

```
src/app/lib/services/llm-entity-extractor.service.ts   (~80 lines removed)
src/app/lib/services/llm-relation-extractor.service.ts (~170 lines removed)
src/app/lib/services/llm-batch.service.ts              (~120 lines removed)
src/app/lib/services/openrouter.service.ts             (~75 lines removed)
```

**Total: ~445 lines of dead code removed**

---

## Verification Commands

```bash
# After cleanup
ng build --configuration=development

# Search for any remaining references to removed functions
grep -r "parseEntityResponse\|parseRelationResponse\|repairTruncatedJson\|buildUserPrompt" src/
grep -r "llmBatch.complete\|chatWithTools" src/
```

---

## Shall I Proceed?

Switch to **Code mode** to execute this cleanup plan?
