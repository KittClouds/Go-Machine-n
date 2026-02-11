//go:build !js && !wasm
// +build !js,!wasm

package batch

import (
	"context"
	"fmt"
)

// callGoogle is a stub for non-WASM builds.
func (s *Service) callGoogle(_ context.Context, _, _ string) (string, error) {
	return "", fmt.Errorf("batch: Google API calls require WASM environment")
}

// jsFetch is a stub for non-WASM builds.
func (s *Service) jsFetch(_, _ string) (string, error) {
	return "", fmt.Errorf("batch: fetch requires WASM environment")
}
