//go:build js && wasm
// +build js,wasm

package batch

import (
	"context"
	"encoding/json"
	"fmt"
	"syscall/js"
)

// openRouterRequest represents the request body for OpenRouter API.
type openRouterRequest struct {
	Model       string          `json:"model"`
	Messages    []openRouterMsg `json:"messages"`
	Temperature float64         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens"`
	Stream      bool            `json:"stream"`
}

type openRouterMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// openRouterResponse represents the response from OpenRouter API.
type openRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"error,omitempty"`
}

// callOpenRouter makes a non-streaming request to OpenRouter API.
func (s *Service) callOpenRouter(_ context.Context, userPrompt, systemPrompt string) (string, error) {
	url := "https://openrouter.ai/api/v1/chat/completions"

	// Build messages
	messages := make([]openRouterMsg, 0, 2)
	if systemPrompt != "" {
		messages = append(messages, openRouterMsg{
			Role:    "system",
			Content: systemPrompt,
		})
	}
	messages = append(messages, openRouterMsg{
		Role:    "user",
		Content: userPrompt,
	})

	// Build request body
	req := openRouterRequest{
		Model:       s.config.OpenRouterModel,
		Messages:    messages,
		Temperature: 0.3,
		MaxTokens:   4096,
		Stream:      false, // EXPLICITLY NO STREAMING
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("batch: failed to marshal OpenRouter request: %w", err)
	}

	// Use browser fetch via syscall/js with auth headers
	response, err := s.jsFetchWithAuth(url, string(reqBody), s.config.OpenRouterAPIKey)
	if err != nil {
		return "", fmt.Errorf("batch: OpenRouter API request failed: %w", err)
	}

	// Parse response
	var resp openRouterResponse
	if err := json.Unmarshal([]byte(response), &resp); err != nil {
		return "", fmt.Errorf("batch: failed to parse OpenRouter response: %w", err)
	}

	// Check for API error
	if resp.Error != nil {
		return "", fmt.Errorf("batch: OpenRouter API error %d: %s", resp.Error.Code, resp.Error.Message)
	}

	// Extract text from response
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("batch: empty response from OpenRouter")
	}

	text := resp.Choices[0].Message.Content
	if text == "" {
		return "", fmt.Errorf("batch: empty content in OpenRouter response")
	}

	return text, nil
}

// jsFetchWithAuth performs a fetch request with Authorization header.
// OpenRouter requires Bearer token auth + extra headers.
func (s *Service) jsFetchWithAuth(url, body, apiKey string) (string, error) {
	// Get fetch function from global scope
	fetch := js.Global().Get("fetch")
	if fetch.IsUndefined() {
		return "", fmt.Errorf("batch: fetch not available")
	}

	// Get window.location.origin for HTTP-Referer header
	origin := js.Global().Get("window").Get("location").Get("origin").String()

	// Create headers object
	headers := js.Global().Get("Object").New()
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	headers.Set("HTTP-Referer", origin)
	headers.Set("X-Title", "KittClouds")

	// Create options object
	options := js.Global().Get("Object").New()
	options.Set("method", "POST")
	options.Set("headers", headers)
	options.Set("body", body)

	// Call fetch
	promise := fetch.Invoke(url, options)

	// Wait for response using a channel
	resultCh := make(chan struct {
		response string
		err      error
	})

	// Set up promise handlers
	then := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		response := args[0]

		// Check for HTTP errors
		status := response.Get("status").Int()
		if !response.Get("ok").Bool() {
			// Get error text
			textPromise := response.Call("text")
			textThen := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
				errText := args[0].String()
				resultCh <- struct {
					response string
					err      error
				}{response: "", err: fmt.Errorf("HTTP %d: %s", status, errText)}
				return nil
			})
			defer textThen.Release()
			textPromise.Call("then", textThen)
			return nil
		}

		// Get response text
		textPromise := response.Call("text")

		textThen := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			text := args[0].String()
			resultCh <- struct {
				response string
				err      error
			}{response: text, err: nil}
			return nil
		})
		defer textThen.Release()

		textPromise.Call("then", textThen)
		return nil
	})
	defer then.Release()

	catch := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		errMsg := args[0].Get("message").String()
		resultCh <- struct {
			response string
			err      error
		}{response: "", err: fmt.Errorf("%s", errMsg)}
		return nil
	})
	defer catch.Release()

	promise.Call("then", then).Call("catch", catch)

	// Wait for result
	result := <-resultCh
	return result.response, result.err
}
