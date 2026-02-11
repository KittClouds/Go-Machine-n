# Observational Memory & Chat Service - Implementation Status

## Overview

Porting AI services from TypeScript/CozoDB to Go/SQLite with OpenRouter integration.

**Goal:** All LLM operations use GoSQLite (OPFS-backed). TypeScript handles UI and model config only.

---

## ✅ COMPLETED

### Phase 0: LLM Batch Service (Go Package)

**New Files:**
- [`GoKitt/pkg/batch/service.go`](GoKitt/pkg/batch/service.go) - Provider abstraction + Complete() method
- [`GoKitt/pkg/batch/google.go`](GoKitt/pkg/batch/google.go) - Google GenAI client (syscall/js fetch)
- [`GoKitt/pkg/batch/openrouter.go`](GoKitt/pkg/batch/openrouter.go) - OpenRouter client (syscall/js fetch)
- [`GoKitt/pkg/batch/google_stub.go`](GoKitt/pkg/batch/google_stub.go) - Non-WASM stub
- [`GoKitt/pkg/batch/openrouter_stub.go`](GoKitt/pkg/batch/openrouter_stub.go) - Non-WASM stub

**API:**
```go
type Service struct { config Config }

func NewService(config Config) *Service
func (s *Service) Complete(ctx, userPrompt, systemPrompt) (string, error)
func (s *Service) IsConfigured() bool
func (s *Service) GetCurrentModel() string
```

**Status:** Go package complete, build passes. WASM bridge pending (awaiting other services).

---

### Phase 1: Memory Data Layer

**Files Modified:**
- [`GoKitt/internal/store/models.go`](GoKitt/internal/store/models.go)
- [`GoKitt/internal/store/sqlite_store.go`](GoKitt/internal/store/sqlite_store.go)

**New Go Structs:**
```go
type Memory struct {
    ID, Content, MemoryType, Confidence, SourceRole, EntityID, CreatedAt, UpdatedAt
}

type Thread struct {
    ID, WorldID, NarrativeID, Title, CreatedAt, UpdatedAt
}

type ThreadMessage struct {
    ID, ThreadID, Role, Content, NarrativeID, CreatedAt, UpdatedAt, IsStreaming
}

type MemoryThread struct {
    MemoryID, ThreadID, MessageID, CreatedAt
}
```

**New SQLite Tables:**
- `threads` - LLM conversation threads
- `thread_messages` - Messages with streaming support
- `memories` - Extracted observations
- `memory_threads` - Many-to-many junction

**Store Methods Added:**
- Thread: `CreateThread`, `GetThread`, `DeleteThread`, `ListThreads`
- Messages: `AddMessage`, `GetThreadMessages`, `GetMessage`, `UpdateMessage`, `AppendMessageContent`, `DeleteThreadMessages`
- Memory: `CreateMemory`, `GetMemory`, `DeleteMemory`, `GetMemoriesForThread`, `ListMemoriesByType`

---

### Phase 2: LLM Integration

**New Files:**
- [`GoKitt/pkg/memory/openrouter.go`](GoKitt/pkg/memory/openrouter.go)
- [`GoKitt/go.mod`](GoKitt/go.mod) - Added `github.com/revrost/go-openrouter v1.1.5`

**OpenRouterClient:**
- `NewOpenRouterClient(config)` - Takes API key + model from TypeScript UI
- `ExtractMemories(ctx, messages)` - LLM-based fact extraction
- JSON response parsing with memory type validation

**Key Design Decision:**
- ❌ NO hardcoded model defaults
- ✅ Model + API key MUST come from TypeScript settings UI
- ✅ Supports free tier models (user selects in UI)

---

### Phase 3: Memory Extractor

**New File:**
- [`GoKitt/pkg/memory/extractor.go`](GoKitt/pkg/memory/extractor.go)

**Extractor Service:**
- `NewExtractor(config)` - Requires store + OpenRouter config
- `ProcessMessage(ctx, threadID, msg)` - Extracts memories from user messages
- `GetContext(threadID)` - Retrieves memories for thread
- `FormatContextForLLM(memories)` - Builds context string for prompts

**Memory Types:**
- `fact` - Objective statements
- `preference` - User preferences
- `entity_mention` - Entity references
- `relation` - Entity relationships

---

### Phase 4: Chat Service

**New File:**
- [`GoKitt/pkg/chat/service.go`](GoKitt/pkg/chat/service.go)

**ChatService API:**
```go
// Thread management
CreateThread(worldID, narrativeID) (*Thread, error)
GetThread(id) (*Thread, error)
ListThreads(worldID) ([]*Thread, error)
DeleteThread(id) error

// Messages
AddMessage(ctx, threadID, role, content, narrativeID) (*ThreadMessage, error)
AddUserMessage(ctx, threadID, content, narrativeID) (*ThreadMessage, error)
AddAssistantMessage(ctx, threadID, content, narrativeID) (*ThreadMessage, error)
GetMessages(threadID) ([]*ThreadMessage, error)
UpdateMessage(messageID, content) error
AppendMessageContent(messageID, chunk) error

// Streaming
StartStreamingMessage(threadID, narrativeID) (*ThreadMessage, error)

// Memory integration
GetMemories(threadID) ([]*Memory, error)
GetContextWithMemories(threadID) (string, error)

// Export
ExportThread(threadID) (string, error)
```

**Memory Integration:**
- Auto-extracts memories on user messages (async, non-blocking)
- Memories linked to threads automatically
- Context building for LLM prompts

---

## 🔜 REMAINING WORK

### Phase 5: WASM Bridge (Next)

**File to Modify:**
- [`GoKitt/cmd/wasm/main.go`](GoKitt/cmd/wasm/main.go)

**Functions to Add:**
```go
// Chat operations
jsCreateThread(this, args)      // → ChatService.CreateThread
jsGetThread(this, args)         // → ChatService.GetThread
jsListThreads(this, args)       // → ChatService.ListThreads
jsDeleteThread(this, args)      // → ChatService.DeleteThread
jsAddMessage(this, args)        // → ChatService.AddMessage
jsGetMessages(this, args)       // → ChatService.GetMessages
jsUpdateMessage(this, args)     // → ChatService.UpdateMessage
jsAppendMessage(this, args)     // → ChatService.AppendMessageContent
jsStartStreaming(this, args)    // → ChatService.StartStreamingMessage

// Memory operations
jsGetMemories(this, args)       // → ChatService.GetMemories
jsGetContext(this, args)        // → ChatService.GetContextWithMemories

// Extractor initialization
jsInitExtractor(this, args)     // → NewExtractor with config from TS
```

---

### Phase 6: TypeScript Wrapper

**File to Create:**
- `src/app/lib/services/go-chat.service.ts`

**Purpose:**
- Thin wrapper around Go WASM functions
- Maintains Angular signals for reactivity
- Handles WASM initialization

**API:**
```typescript
@Injectable({ providedIn: 'root' })
export class GoChatService {
    readonly ready = signal(false);
    readonly messages = signal<ThreadMessage[]>([]);
    
    async init(): Promise<void>
    async createThread(worldId?: string, narrativeId?: string): Promise<Thread>
    async addMessage(threadId: string, role: string, content: string): Promise<ThreadMessage>
    async getMessages(threadId: string): Promise<ThreadMessage[]>
    async getMemories(threadId: string): Promise<Memory[]>
    // ...
}
```

---

### Phase 7: UI Integration

**File to Modify:**
- `src/app/components/right-sidebar/ai-chat-panel/ai-chat-panel.component.ts`

**Changes:**
- Replace `AiChatService` with `GoChatService`
- Keep OpenRouterService for streaming (UI layer)
- Chat persistence goes through Go WASM

---

### Phase 8: Cleanup

**After all LLM services ported:**
- Remove CozoDB chat tables
- Remove `src/app/lib/services/ai-chat.service.ts` (old Cozo version)
- Update any remaining Cozo references

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TypeScript Layer                         │
├─────────────────────────────────────────────────────────────┤
│  UI Components (ai-chat-panel, toolbar, etc.)               │
│       ↓                                                      │
│  OpenRouterService (API key, model selection, streaming)    │
│       ↓                                                      │
│  GoChatService (WASM wrapper)                               │
└─────────────────────────────────────────────────────────────┘
                        ↓ WASM Bridge
┌─────────────────────────────────────────────────────────────┐
│                        Go Layer                              │
├─────────────────────────────────────────────────────────────┤
│  ChatService → Thread/ThreadMessage CRUD                    │
│       ↓                                                      │
│  Memory Extractor → OpenRouter API (extraction)             │
│       ↓                                                      │
│  SQLiteStore → OPFS-backed SQLite                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Summary

### Created
| File | Purpose |
|------|---------|
| `GoKitt/pkg/memory/openrouter.go` | OpenRouter client wrapper |
| `GoKitt/pkg/memory/extractor.go` | Memory extraction service |
| `GoKitt/pkg/chat/service.go` | Chat session management |
| `plans/observational-memory-go.md` | Original implementation plan |
| `plans/ai-chat-service-port.md` | Chat service port plan |
| `plans/observational-memory-status.md` | This file |

### Modified
| File | Changes |
|------|---------|
| `GoKitt/go.mod` | Added go-openrouter v1.1.5 |
| `GoKitt/internal/store/models.go` | Added Memory, Thread, ThreadMessage, MemoryThread structs |
| `GoKitt/internal/store/sqlite_store.go` | Added schema + CRUD for memory tables |

### To Create
| File | Purpose |
|------|---------|
| `GoKitt/cmd/wasm/chat_bridge.go` | WASM functions for chat |
| `src/app/lib/services/go-chat.service.ts` | TypeScript WASM wrapper |

### To Modify
| File | Changes |
|------|---------|
| `GoKitt/cmd/wasm/main.go` | Register chat WASM functions |
| `src/app/components/right-sidebar/ai-chat-panel/ai-chat-panel.component.ts` | Use GoChatService |

### To Delete (After Phase 8)
| File | Reason |
|------|--------|
| `src/app/lib/services/ai-chat.service.ts` | Replaced by Go version |

---

## Build Status

```bash
cd GoKitt && go build ./...
# Exit code: 0 ✅
```

All Go code compiles successfully.
