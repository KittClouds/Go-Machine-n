# Unified Entity-Relation Extraction Service + Agent Tool Calling

## Overview

Single LLM call extracts both entities AND relations from note text.
Replaces the two-call approach of `LlmEntityExtractorService` + `LlmRelationExtractorService`.

Additionally, the `pkg/agent` package provides non-streaming LLM completions with tool-calling
support, replacing `openrouter.service.ts` → `chatWithTools()` for the agentic chat loop.

**Key Design Decisions:**
- **Single LLM call** — Combined prompt extracts entities + relations together (halves API usage)
- **Unified API** — `ExtractFromNote()`, `ExtractEntitiesFromNote()`, `ExtractRelationsFromNote()`
- **Backward compatible** — Convenience methods return entities-only or relations-only
- **Composes with `pkg/batch`** — extraction = domain logic, batch = raw LLM
- **Tool calling via Go** — `agentChatWithTools()` sends messages + tool schemas, returns content + tool_calls
- **Async WASM** — LLM functions return JS Promises via Go goroutines + `makePromise()` helper

---

## Implementation Status

### ✅ Phase 1: Go Extraction Package (COMPLETE)

| File | Purpose |
|------|---------|
| `GoKitt/pkg/extraction/types.go` | EntityKind, RelationType, ExtractedEntity, ExtractedRelation, ExtractionResult |
| `GoKitt/pkg/extraction/prompts.go` | SystemPrompt, BuildUserPrompt (combined prompt) |
| `GoKitt/pkg/extraction/parser.go` | ParseResponse, code fence stripping, JSON repair |
| `GoKitt/pkg/extraction/service.go` | Service struct with ExtractFromNote, ExtractEntitiesFromNote, ExtractRelationsFromNote |
| `GoKitt/pkg/extraction/service_test.go` | 11 tests: parsing, repair, kind validation, prompt construction |

**Build:** `go build ./...` ✅  
**Tests:** `go test ./pkg/extraction/ -v` ✅ All pass

### ✅ Phase 1b: Go Agent Package (COMPLETE)

| File | Purpose |
|------|---------|
| `GoKitt/pkg/agent/service.go` | Service, Message, ToolCall, ToolDefinition, CompletionResult, ChatWithTools, parseCompletionResponse |
| `GoKitt/pkg/agent/service_test.go` | 6 tests: content, tool calls, multiple tools, empty choices, invalid JSON, serialization |

**Build:** `go build ./...` ✅  
**Tests:** `go test ./pkg/agent/ -v` ✅ All pass

### ✅ Phase 1c: Batch Service Extension (COMPLETE)

| File | Change |
|------|--------|
| `GoKitt/pkg/batch/service.go` | Added `CompleteWithTools(ctx, messages, tools)` — passes structured messages + tool schemas, returns raw JSON |

### ✅ Phase 2: WASM Bridge (COMPLETE)

| Export | Go Function | Async? |
|--------|------------|--------|
| `batchInit` | `jsBatchInit` | No (sync config) |
| `extractFromNote` | `jsExtractFromNote` | Yes (Promise) |
| `extractEntities` | `jsExtractEntities` | Yes (Promise) |
| `extractRelations` | `jsExtractRelations` | Yes (Promise) |
| `agentChatWithTools` | `jsAgentChatWithTools` | Yes (Promise) |

- `makePromise()` helper creates JS Promises from Go goroutines
- Version bumped to `0.5.0`

### ✅ Phase 3: TypeScript Wrapper (COMPLETE)

| File | Changes |
|------|---------|
| `src/app/workers/gokitt.worker.ts` | Added message types + handlers for all 5 new WASM functions (await for async) |
| `src/app/services/gokitt.service.ts` | Added `batchInit`, `extractFromNote`, `extractEntities`, `extractRelations`, `agentChatWithTools` + `sendLLMRequest` with 120s timeout |

### ✅ Phase 4: Consumer Migration (COMPLETE)

| Consumer | Before | After |
|----------|--------|-------|
| `llm-entity-extractor.service.ts` | `llmBatch.complete()` + TS parsing | `goKitt.extractEntities()` — Go handles prompt+call+parsing |
| `llm-relation-extractor.service.ts` | `llmBatch.complete()` + TS parsing | `goKitt.extractRelations()` — Go handles prompt+call+parsing |
| `ai-chat-panel.component.ts` | `openRouter.chatWithTools()` | `goKittService.agentChatWithTools()` — Go handles non-streaming tool-call completion |

**Key points:**
- Both extractors lazy-init Go batch service via `ensureGoBatchInit()` using `LlmBatchService` config
- Chat panel lazy-inits Go batch with OpenRouter config from `openRouter.config()`
- TS extractors still stamp `sourceNoteId` (Go doesn't know note IDs)
- Old `parseEntityResponse()`/`parseRelationResponse()` remain as dead code (cleanup in Phase 5)

### ⏸️ Phase 5: Cleanup (PAUSED)
- Delete old `llm-batch.service.ts` (after batch port complete)
- Delete old extractor services (after consumer migration)
- Assess if `openrouter.service.ts` → `chatWithTools()` can be removed

---

## Dependencies

| Dependency | Status |
|-----------|--------|
| `GoKitt/pkg/batch/` (LLM Batch Service) | ✅ Complete |
| `GoKitt/pkg/extraction/` (Unified Extraction) | ✅ Complete |
| `GoKitt/pkg/agent/` (Tool-Calling Agent) | ✅ Complete |
| WASM bridge pattern (`cmd/wasm/main.go`) | ✅ Updated |
| Worker message routing | ✅ Updated |
| TypeScript `GoKittService` | ✅ Updated |

---

## Architecture

```
TypeScript Layer
├── GoKittService (Angular service, full bridge)
│   ├── batchInit()              → Configure LLM provider
│   ├── extractFromNote()        → GoKitt.extractFromNote() → Promise
│   ├── extractEntities()        → GoKitt.extractEntities() → Promise
│   ├── extractRelations()       → GoKitt.extractRelations() → Promise
│   └── agentChatWithTools()     → GoKitt.agentChatWithTools() → Promise
│
├── gokitt.worker.ts (Web Worker)
│   └── Routes messages → calls GoKitt WASM functions
│       └── Awaits Promises for async LLM functions

Go WASM Layer
├── pkg/agent/Service
│   └── ChatWithTools()         → messages + tools → CompletionResult{content, tool_calls}
│       └── batch.CompleteWithTools() → raw JSON → parse response
│
├── pkg/extraction/Service
│   ├── ExtractFromNote()       → single LLM call → ExtractionResult{entities, relations}
│   ├── ExtractEntitiesFromNote() → convenience → []ExtractedEntity
│   └── ExtractRelationsFromNote() → convenience → []ExtractedRelation
│
├── pkg/batch/Service
│   ├── Complete()              → raw LLM call → string
│   ├── CompleteWithTools()     → messages + tools → raw JSON response
│   │   └── jsFetchWithAuth()   → syscall/js fetch (OpenRouter)
│   ├── callGoogle()            → syscall/js fetch
│   └── callOpenRouter()        → syscall/js fetch
```
