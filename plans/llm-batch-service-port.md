# LLM Batch Service Port Plan

## Overview

Port `LlmBatchService` from TypeScript to Go WASM. This service handles non-streaming LLM calls for entity extraction and relation extraction.

**Key Difference from AI Chat:**
- NO streaming - complete responses only
- Supports both Google GenAI and OpenRouter
- Used by: `LlmEntityExtractorService`, `LlmRelationExtractorService`

---

## Current TypeScript Implementation

**File:** [`src/app/lib/services/llm-batch.service.ts`](src/app/lib/services/llm-batch.service.ts)

### API Surface
```typescript
class LlmBatchService {
    // Signals for UI binding
    readonly provider: Signal<LlmProvider>      // 'google' | 'openrouter'
    readonly currentModel: Signal<string>
    readonly isConfigured: Signal<boolean>
    
    // Config management (localStorage)
    getConfig(): LlmBatchConfig
    updateConfig(partial: Partial<LlmBatchConfig>)
    
    // Core LLM call - NON-STREAMING
    async complete(userPrompt: string, systemPrompt?: string): Promise<string>
}
```

### Provider Implementations
1. **Google GenAI** - Direct fetch to `generativelanguage.googleapis.com`
2. **OpenRouter** - Direct fetch to `openrouter.ai/api/v1/chat/completions`

Both use `stream: false` for complete responses.

---

## Go Implementation Plan

### Phase 1: Go Batch Service

**New File:** `GoKitt/pkg/batch/service.go`

```go
package batch

// Provider type
type Provider string
const (
    ProviderGoogle     Provider = "google"
    ProviderOpenRouter Provider = "openrouter"
)

// Config holds batch LLM settings
type Config struct {
    Provider         Provider
    GoogleAPIKey     string
    GoogleModel      string  // e.g., "gemini-2.0-flash"
    OpenRouterAPIKey string
    OpenRouterModel  string  // e.g., "google/gemini-3-flash-preview"
}

// Service handles non-streaming LLM completions
type Service struct {
    config Config
}

// NewService creates a batch service with config from TypeScript
func NewService(config Config) *Service

// Complete makes a non-streaming LLM completion request
func (s *Service) Complete(ctx context.Context, userPrompt, systemPrompt string) (string, error)

// IsConfigured checks if the current provider has valid credentials
func (s *Service) IsConfigured() bool
```

### Provider Clients

**Option A: Direct HTTP (Recommended for WASM)**
- Use `syscall/js` to call `fetch()` from Go
- Avoids CORS issues in browser
- Consistent with existing OpenRouter pattern in `pkg/memory/openrouter.go`

**Option B: Native Go HTTP**
- Use `net/http` with TinyGo-compatible client
- May have CORS issues in browser

**Recommendation:** Use `syscall/js` for fetch calls - same pattern as existing code.

### Google GenAI Client

**New File:** `GoKitt/pkg/batch/google.go`

```go
package batch

import (
    "context"
    "syscall/js"
)

func (s *Service) callGoogle(ctx context.Context, userPrompt, systemPrompt string) (string, error) {
    // Use js fetch to call:
    // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
    // 
    // Body:
    // {
    //   "contents": [{"role": "user", "parts": [{"text": userPrompt}]}],
    //   "systemInstruction": {"parts": [{"text": systemPrompt}]},
    //   "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096}
    // }
}
```

### OpenRouter Client

**New File:** `GoKitt/pkg/batch/openrouter.go`

```go
package batch

func (s *Service) callOpenRouter(ctx context.Context, userPrompt, systemPrompt string) (string, error) {
    // Use js fetch to call:
    // POST https://openrouter.ai/api/v1/chat/completions
    //
    // Headers:
    //   Authorization: Bearer {apiKey}
    //   HTTP-Referer: window.location.origin
    //   X-Title: KittClouds
    //
    // Body:
    // {
    //   "model": model,
    //   "messages": [{"role": "system", "content": systemPrompt}, {"role": "user", "content": userPrompt}],
    //   "temperature": 0.3,
    //   "max_tokens": 4096,
    //   "stream": false
    // }
}
```

---

### Phase 2: WASM Bridge

**Modify:** `GoKitt/cmd/wasm/main.go`

```go
// Global batch service instance
var batchService *batch.Service

// WASM functions to add:
func jsBatchInit(this js.Value, args []js.Value) interface{} {
    // args[0] = config JSON: {provider, googleApiKey, googleModel, openRouterApiKey, openRouterModel}
    // Creates/reconfigures batch.Service
}

func jsBatchComplete(this js.Value, args []js.Value) interface{} {
    // args[0] = userPrompt
    // args[1] = systemPrompt (optional)
    // Returns Promise<string>
}

func jsBatchIsConfigured(this js.Value, args []js.Value) interface{} {
    // Returns boolean
}

// Register in main():
js.Global().Set("GoKitt", js.ValueOf(map[string]interface{}{
    // ... existing exports ...
    "batchInit":        js.FuncOf(jsBatchInit),
    "batchComplete":    js.FuncOf(jsBatchComplete),
    "batchIsConfigured": js.FuncOf(jsBatchIsConfigured),
}))
```

---

### Phase 3: TypeScript Wrapper

**New File:** `src/app/lib/services/go-batch.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class GoBatchService {
    // Same signal interface as original LlmBatchService
    private _config = signal<BatchConfig>(this.loadConfig());
    
    readonly provider = computed(() => this._config().provider);
    readonly currentModel = computed(() => /* ... */);
    readonly isConfigured = computed(() => /* ... */);
    
    async init(): Promise<void> {
        // Wait for GoKitt WASM ready
        // Call GoKitt.batchInit(config)
    }
    
    async complete(userPrompt: string, systemPrompt?: string): Promise<string> {
        // Call GoKitt.batchComplete(userPrompt, systemPrompt)
        // Return response
    }
    
    updateConfig(partial: Partial<BatchConfig>): void {
        // Update local signal + localStorage
        // Re-call GoKitt.batchInit() with new config
    }
}
```

---

### Phase 4: Update Consumers

**Files to Modify:**
1. [`src/app/lib/services/llm-entity-extractor.service.ts`](src/app/lib/services/llm-entity-extractor.service.ts)
2. [`src/app/lib/services/llm-relation-extractor.service.ts`](src/app/lib/services/llm-relation-extractor.service.ts)

**Changes:**
```typescript
// Before:
private llmBatch = inject(LlmBatchService);

// After:
private goBatch = inject(GoBatchService);

// Update method calls:
const response = await this.goBatch.complete(userPrompt, SYSTEM_PROMPT);
```

---

### Phase 5: Cleanup

After verification:
1. Delete `src/app/lib/services/llm-batch.service.ts`
2. Update any remaining imports

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TypeScript Layer                         │
├─────────────────────────────────────────────────────────────┤
│  LlmEntityExtractorService                                   │
│  LlmRelationExtractorService                                 │
│       ↓                                                      │
│  GoBatchService (WASM wrapper)                              │
│       - Signals for UI binding                              │
│       - Config stored in localStorage                        │
│       - Delegates LLM calls to Go                           │
└─────────────────────────────────────────────────────────────┘
                         ↓ WASM Bridge
┌─────────────────────────────────────────────────────────────┐
│                        Go Layer                              │
├─────────────────────────────────────────────────────────────┤
│  batch.Service                                               │
│       ↓                                                      │
│  google.go → fetch(generativelanguage.googleapis.com)       │
│  openrouter.go → fetch(openrouter.ai)                       │
│       ↓                                                      │
│  syscall/js → Browser fetch API                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Summary

### To Create
| File | Purpose |
|------|---------|
| `GoKitt/pkg/batch/service.go` | Batch service with provider abstraction |
| `GoKitt/pkg/batch/google.go` | Google GenAI client using syscall/js |
| `GoKitt/pkg/batch/openrouter.go` | OpenRouter client using syscall/js |
| `src/app/lib/services/go-batch.service.ts` | TypeScript WASM wrapper |

### To Modify
| File | Changes |
|------|---------|
| `GoKitt/cmd/wasm/main.go` | Add batch WASM functions |
| `src/app/lib/services/llm-entity-extractor.service.ts` | Use GoBatchService |
| `src/app/lib/services/llm-relation-extractor.service.ts` | Use GoBatchService |

### To Delete (After Phase 5)
| File | Reason |
|------|--------|
| `src/app/lib/services/llm-batch.service.ts` | Replaced by Go version |

---

## Key Design Decisions

1. **syscall/js for HTTP** - Use browser's fetch API via syscall/js to avoid CORS issues
2. **Config from TypeScript** - No hardcoded API keys or models; all config passed from TS
3. **Same Signal Interface** - GoBatchService maintains same reactive interface for UI compatibility
4. **LocalStorage in TS** - Config persistence handled by TypeScript, not Go

---

## Testing Strategy

1. **Unit Tests (Go)**
   - Test config parsing
   - Test request body construction
   - Mock js.Value for fetch calls

2. **Integration Tests**
   - Verify WASM initialization
   - Test complete() with real API (manual)
   - Verify error handling

3. **E2E Verification**
   - Entity extraction from note
   - Relation extraction from note
   - Verify no regressions in UI

---

## Ready for Implementation?

Shall I proceed with Phase 1 (Go Batch Service Implementation)?
