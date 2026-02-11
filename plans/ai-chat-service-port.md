# AI Chat Service Port to Go

## Overview

Port [`src/app/lib/services/ai-chat.service.ts`](src/app/lib/services/ai-chat.service.ts) from TypeScript/CozoDB to Go/GoSQLite.

**Key Changes:**
- CozoDB → GoSQLite (OPFS-backed)
- TypeScript signals → Go methods + WASM bridge
- Integrate with Memory Extractor for automatic extraction

---

## Architecture Mapping

### TypeScript → Go Equivalents

| TypeScript | Go | Notes |
|------------|-----|-------|
| `session` | `Thread` | Already implemented |
| `ChatMessage` | `ThreadMessage` | Already implemented |
| `sessionId` | `Thread.ID` | UUID format |
| `cozoDb.run()` | `store.AddMessage()` | SQLite operations |
| `signal<ChatMessage[]>` | WASM return values | No reactive signals in Go |

### Data Model Comparison

**TypeScript ChatMessage:**
```typescript
interface ChatMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: number;
    narrativeId: string;
    metadata?: Record<string, unknown>;
}
```

**Go ThreadMessage (already implemented):**
```go
type ThreadMessage struct {
    ID        string `json:"id"`
    ThreadID  string `json:"threadId"`  // = sessionId
    Role      string `json:"role"`
    Content   string `json:"content"`
    CreatedAt int64  `json:"createdAt"`
}
```

**Missing fields to add:**
- `NarrativeID` - for scope filtering
- `Metadata` - for extensibility

---

## Implementation Plan

### Phase 1: Extend ThreadMessage Schema

Add missing fields to match TypeScript:

```go
type ThreadMessage struct {
    ID          string                 `json:"id"`
    ThreadID    string                 `json:"threadId"`
    Role        string                 `json:"role"`
    Content     string                 `json:"content"`
    CreatedAt   int64                  `json:"createdAt"`
    NarrativeID string                 `json:"narrativeId,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
}
```

Update SQLite schema:
```sql
ALTER TABLE thread_messages ADD COLUMN narrative_id TEXT;
ALTER TABLE thread_messages ADD COLUMN metadata TEXT;
```

### Phase 2: Create ChatService

```go
// GoKitt/pkg/chat/service.go
package chat

type ChatService struct {
    store     store.Storer
    extractor *memory.Extractor
}

func NewChatService(s store.Storer, e *memory.Extractor) *ChatService

// Session management
func (s *ChatService) CreateThread(worldID, narrativeID string) (*Thread, error)
func (s *ChatService) GetThread(id string) (*Thread, error)
func (s *ChatService) ListThreads(worldID string) ([]*Thread, error)
func (s *ChatService) DeleteThread(id string) error

// Message operations
func (s *ChatService) AddMessage(threadID, role, content, narrativeID string) (*ThreadMessage, error)
func (s *ChatService) GetMessages(threadID string) ([]*ThreadMessage, error)
func (s *ChatService) UpdateMessage(messageID, content string) error
func (s *ChatService) AppendMessage(messageID, chunk string) error

// Memory integration
func (s *ChatService) GetContextWithMemories(threadID string) (string, error)

// Export
func (s *ChatService) ExportThread(threadID string) (string, error)
```

### Phase 3: Memory Integration

When adding a user message:
1. Store message in SQLite
2. Call `extractor.ProcessMessage()` (async)
3. Memories automatically linked to thread

When building context for LLM:
1. Get thread messages
2. Get memories for thread
3. Format as system prompt context

### Phase 4: WASM Bridge

```go
// Thread management
func jsCreateThread(this js.Value, args []js.Value) interface{}
func jsGetThread(this js.Value, args []js.Value) interface{}
func jsListThreads(this js.Value, args []js.Value) interface{}
func jsDeleteThread(this js.Value, args []js.Value) interface{}

// Message operations
func jsAddMessage(this js.Value, args []js.Value) interface{}
func jsGetMessages(this js.Value, args []js.Value) interface{}
func jsUpdateMessage(this js.Value, args []js.Value) interface{}

// Memory context
func jsGetMemories(this js.Value, args []js.Value) interface{}
func jsGetContextWithMemories(this js.Value, args []js.Value) interface{}
```

### Phase 5: TypeScript Wrapper

Create thin TypeScript wrapper that calls Go WASM:

```typescript
// src/app/lib/services/go-chat.service.ts
@Injectable({ providedIn: 'root' })
export class GoChatService {
    private wasmReady = signal(false);
    
    // Passthrough to Go WASM
    async createThread(worldId?: string, narrativeId?: string): Promise<Thread>
    async addMessage(threadId: string, role: string, content: string): Promise<ThreadMessage>
    async getMessages(threadId: string): Promise<ThreadMessage[]>
    async getMemories(threadId: string): Promise<Memory[]>
    // ...
}
```

---

## Files to Create/Modify

### New Go Files
| File | Purpose |
|------|---------|
| `GoKitt/pkg/chat/service.go` | ChatService implementation |
| `GoKitt/pkg/chat/service_test.go` | Unit tests |

### Modified Go Files
| File | Changes |
|------|---------|
| `GoKitt/internal/store/models.go` | Add NarrativeID, Metadata to ThreadMessage |
| `GoKitt/internal/store/sqlite_store.go` | Update schema, CRUD for new fields |
| `GoKitt/cmd/wasm/main.go` | Add chat WASM functions |

### New TypeScript Files
| File | Purpose |
|------|---------|
| `src/app/lib/services/go-chat.service.ts` | WASM wrapper |

### Modified TypeScript Files
| File | Changes |
|------|---------|
| `src/app/components/right-sidebar/ai-chat-panel/ai-chat-panel.component.ts` | Use GoChatService |

---

## Migration Strategy

1. **Parallel Operation** - Both services exist during transition
2. **Feature Flag** - Toggle between Cozo and Go backends
3. **Data Sync** - One-time migration script for existing chats
4. **Cutover** - Switch default to Go, deprecate Cozo chat

---

## API Comparison

### Current TypeScript API
```typescript
// Session
newSession(): void
sessionId: Signal<string>

// Messages
addUserMessage(content: string): Promise<ChatMessage>
addAssistantMessage(content: string): Promise<ChatMessage>
updateMessageContent(id: string, content: string): void
appendMessageContent(id: string, chunk: string): void
finalizeMessage(id: string): Promise<void>

// History
messages: Signal<ChatMessage[]>
loadSessionMessages(): Promise<void>
clearSession(): Promise<void>
getAllSessions(): string[]
switchSession(id: string): Promise<void>
exportHistory(): string
```

### New Go API (via WASM)
```javascript
// Thread (session)
await gokitt.createThread(worldId, narrativeId) // returns threadId
await gokitt.getThread(threadId)
await gokitt.listThreads(worldId)
await gokitt.deleteThread(threadId)

// Messages
await gokitt.addMessage(threadId, role, content, narrativeId)
await gokitt.getMessages(threadId)
await gokitt.updateMessage(messageId, content)
await gokitt.appendMessage(messageId, chunk)

// Memory
await gokitt.getMemories(threadId)
await gokitt.getContextWithMemories(threadId)

// Export
await gokitt.exportThread(threadId)
```

---

## Edge Cases

1. **Streaming messages** - Append chunks, finalize on complete
2. **Memory extraction failure** - Log, don't block message save
3. **Large threads** - Pagination for message loading
4. **Cross-thread memories** - Future: share memories across threads
