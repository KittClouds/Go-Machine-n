// Package memory provides observational memory extraction and management.
package memory

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/kittclouds/gokitt/internal/store"
)

// Extractor coordinates memory extraction from conversations.
type Extractor struct {
	store   store.Storer
	llm     *OpenRouterClient
	enabled bool
}

// ExtractorConfig holds configuration for the extractor.
type ExtractorConfig struct {
	Store         store.Storer
	OpenRouterKey string
	Model         string // From TypeScript UI (e.g., free-tier model)
}

// NewExtractor creates a new memory extractor.
// Both OpenRouterKey and Model MUST be provided from TypeScript settings UI.
// No hardcoded defaults - user selects from free tier models in UI.
func NewExtractor(config ExtractorConfig) *Extractor {
	extractor := &Extractor{
		store:   config.Store,
		enabled: config.OpenRouterKey != "" && config.Model != "",
	}

	if config.OpenRouterKey != "" && config.Model != "" {
		extractor.llm = NewOpenRouterClient(OpenRouterConfig{
			APIKey: config.OpenRouterKey,
			Model:  config.Model, // Must come from TypeScript UI
		})
	}

	return extractor
}

// ProcessMessage extracts memories from a new message and stores them.
func (e *Extractor) ProcessMessage(
	threadID string,
	msg *store.ThreadMessage,
) ([]*store.Memory, error) {
	if !e.enabled || e.llm == nil {
		return nil, nil // Extraction disabled, no error
	}

	// Get recent context for better extraction
	messages, err := e.store.GetThreadMessages(threadID)
	if err != nil {
		return nil, fmt.Errorf("failed to get thread messages: %w", err)
	}

	// Convert to input format
	inputs := make([]MessageInput, len(messages)+1)
	for i, m := range messages {
		inputs[i] = MessageInput{
			Role:    m.Role,
			Content: m.Content,
		}
	}
	// Add the new message
	inputs[len(messages)] = MessageInput{
		Role:    msg.Role,
		Content: msg.Content,
	}

	// Extract via LLM
	result, err := e.llm.ExtractMemories(inputs)
	if err != nil {
		return nil, fmt.Errorf("llm extraction failed: %w", err)
	}

	if len(result.Memories) == 0 {
		return nil, nil
	}

	// Store extracted memories
	now := time.Now().UnixMilli()
	var stored []*store.Memory

	for _, extracted := range result.Memories {
		memory := &store.Memory{
			ID:         generateID(),
			Content:    extracted.Content,
			MemoryType: store.MemoryType(extracted.MemoryType),
			Confidence: extracted.Confidence,
			SourceRole: msg.Role,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		if err := e.store.CreateMemory(memory, threadID, msg.ID); err != nil {
			return nil, fmt.Errorf("failed to store memory: %w", err)
		}

		stored = append(stored, memory)
	}

	return stored, nil
}

// GetContext retrieves relevant memories for a thread.
func (e *Extractor) GetContext(threadID string) ([]*store.Memory, error) {
	return e.store.GetMemoriesForThread(threadID)
}

// FormatContextForLLM formats memories as a context string for LLM prompts.
func FormatContextForLLM(memories []*store.Memory) string {
	if len(memories) == 0 {
		return ""
	}

	context := "Relevant context from previous conversations:\n"
	for _, m := range memories {
		context += fmt.Sprintf("- %s\n", m.Content)
	}
	return context
}

// IsEnabled returns whether extraction is enabled.
func (e *Extractor) IsEnabled() bool {
	return e.enabled && e.llm != nil
}

// generateID creates a random hex ID.
func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}
