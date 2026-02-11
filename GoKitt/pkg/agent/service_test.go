package agent

import (
	"encoding/json"
	"testing"
)

func TestParseCompletionResponse_WithContent(t *testing.T) {
	raw := `{
		"choices": [{
			"message": {
				"content": "Hello! How can I help?",
				"tool_calls": null
			}
		}]
	}`

	result, err := parseCompletionResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Content == nil || *result.Content != "Hello! How can I help?" {
		t.Errorf("expected content 'Hello! How can I help?', got %v", result.Content)
	}
	if len(result.ToolCalls) != 0 {
		t.Errorf("expected no tool calls, got %d", len(result.ToolCalls))
	}
}

func TestParseCompletionResponse_WithToolCalls(t *testing.T) {
	raw := `{
		"choices": [{
			"message": {
				"content": null,
				"tool_calls": [{
					"id": "call_123",
					"type": "function",
					"function": {
						"name": "read_current_note",
						"arguments": "{}"
					}
				}]
			}
		}]
	}`

	result, err := parseCompletionResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Content != nil {
		t.Errorf("expected nil content, got %v", result.Content)
	}
	if len(result.ToolCalls) != 1 {
		t.Fatalf("expected 1 tool call, got %d", len(result.ToolCalls))
	}

	tc := result.ToolCalls[0]
	if tc.ID != "call_123" {
		t.Errorf("expected id 'call_123', got %q", tc.ID)
	}
	if tc.Function.Name != "read_current_note" {
		t.Errorf("expected name 'read_current_note', got %q", tc.Function.Name)
	}
}

func TestParseCompletionResponse_MultipleToolCalls(t *testing.T) {
	raw := `{
		"choices": [{
			"message": {
				"content": null,
				"tool_calls": [
					{
						"id": "call_1",
						"type": "function",
						"function": {
							"name": "search_notes",
							"arguments": "{\"query\": \"dragon\"}"
						}
					},
					{
						"id": "call_2",
						"type": "function",
						"function": {
							"name": "read_note_by_id",
							"arguments": "{\"note_id\": \"abc123\"}"
						}
					}
				]
			}
		}]
	}`

	result, err := parseCompletionResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.ToolCalls) != 2 {
		t.Fatalf("expected 2 tool calls, got %d", len(result.ToolCalls))
	}
	if result.ToolCalls[0].Function.Name != "search_notes" {
		t.Errorf("expected 'search_notes', got %q", result.ToolCalls[0].Function.Name)
	}
	if result.ToolCalls[1].Function.Name != "read_note_by_id" {
		t.Errorf("expected 'read_note_by_id', got %q", result.ToolCalls[1].Function.Name)
	}

	// Verify arguments parse
	var args map[string]string
	if err := json.Unmarshal([]byte(result.ToolCalls[0].Function.Arguments), &args); err != nil {
		t.Fatalf("failed to parse arguments: %v", err)
	}
	if args["query"] != "dragon" {
		t.Errorf("expected query 'dragon', got %q", args["query"])
	}
}

func TestParseCompletionResponse_EmptyChoices(t *testing.T) {
	raw := `{"choices": []}`

	_, err := parseCompletionResponse(raw)
	if err == nil {
		t.Error("expected error for empty choices")
	}
}

func TestParseCompletionResponse_InvalidJSON(t *testing.T) {
	raw := `not json`

	_, err := parseCompletionResponse(raw)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestParseCompletionResponse_ContentWithToolCalls(t *testing.T) {
	// Some models return both content and tool_calls
	raw := `{
		"choices": [{
			"message": {
				"content": "Let me search for that.",
				"tool_calls": [{
					"id": "call_42",
					"type": "function",
					"function": {
						"name": "search_notes",
						"arguments": "{\"query\": \"pirates\"}"
					}
				}]
			}
		}]
	}`

	result, err := parseCompletionResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Content == nil || *result.Content != "Let me search for that." {
		t.Errorf("expected content, got %v", result.Content)
	}
	if len(result.ToolCalls) != 1 {
		t.Errorf("expected 1 tool call, got %d", len(result.ToolCalls))
	}
}

func TestMessageSerialization(t *testing.T) {
	// Verify Message can handle null content (pointer)
	content := "hello"
	msg := Message{Role: "assistant", Content: &content}
	b, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var parsed Message
	if err := json.Unmarshal(b, &parsed); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if parsed.Content == nil || *parsed.Content != "hello" {
		t.Errorf("expected 'hello', got %v", parsed.Content)
	}

	// Test null content
	nullMsg := Message{Role: "assistant", Content: nil}
	b2, err := json.Marshal(nullMsg)
	if err != nil {
		t.Fatalf("marshal null failed: %v", err)
	}

	var parsed2 Message
	if err := json.Unmarshal(b2, &parsed2); err != nil {
		t.Fatalf("unmarshal null failed: %v", err)
	}
	if parsed2.Content != nil {
		t.Errorf("expected nil content, got %v", *parsed2.Content)
	}
}
