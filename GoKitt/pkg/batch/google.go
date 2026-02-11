//go:build js && wasm
// +build js,wasm

package batch

import (
	"context"
	"encoding/json"
	"fmt"
	"syscall/js"
)

// googleRequest represents the request body for Google GenAI API.
type googleRequest struct {
	Contents          []googleContent         `json:"contents"`
	SystemInstruction *googleContent          `json:"systemInstruction,omitempty"`
	GenerationConfig  *googleGenerationConfig `json:"generationConfig,omitempty"`
}

type googleContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []googlePart `json:"parts"`
}

type googlePart struct {
	Text string `json:"text"`
}

type googleGenerationConfig struct {
	Temperature     float64 `json:"temperature,omitempty"`
	MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
}

// googleResponse represents the response from Google GenAI API.
type googleResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

// callGoogle makes a non-streaming request to Google GenAI API.
func (s *Service) callGoogle(_ context.Context, userPrompt, systemPrompt string) (string, error) {
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		s.config.GoogleModel,
		s.config.GoogleAPIKey,
	)

	// Build request body
	req := googleRequest{
		Contents: []googleContent{
			{
				Role:  "user",
				Parts: []googlePart{{Text: userPrompt}},
			},
		},
		GenerationConfig: &googleGenerationConfig{
			Temperature:     0.3,
			MaxOutputTokens: 4096,
		},
	}

	// Add system prompt if provided
	if systemPrompt != "" {
		req.SystemInstruction = &googleContent{
			Parts: []googlePart{{Text: systemPrompt}},
		}
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("batch: failed to marshal Google request: %w", err)
	}

	// Use browser fetch via syscall/js
	response, err := s.jsFetch(url, string(reqBody))
	if err != nil {
		return "", fmt.Errorf("batch: Google API request failed: %w", err)
	}

	// Parse response
	var resp googleResponse
	if err := json.Unmarshal([]byte(response), &resp); err != nil {
		return "", fmt.Errorf("batch: failed to parse Google response: %w", err)
	}

	// Check for API error
	if resp.Error != nil {
		return "", fmt.Errorf("batch: Google API error %d: %s", resp.Error.Code, resp.Error.Message)
	}

	// Extract text from response
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("batch: empty response from Google")
	}

	text := resp.Candidates[0].Content.Parts[0].Text
	return text, nil
}

// jsFetch performs a fetch request using the browser's fetch API.
func (s *Service) jsFetch(url, body string) (string, error) {
	// Get fetch function from global scope
	fetch := js.Global().Get("fetch")
	if fetch.IsUndefined() {
		return "", fmt.Errorf("batch: fetch not available")
	}

	// Create headers object
	headers := js.Global().Get("Object").New()
	headers.Set("Content-Type", "application/json")

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
