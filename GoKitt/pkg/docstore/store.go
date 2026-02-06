// Package docstore provides in-memory document storage for GoKitt WASM.
// Notes are hydrated once at startup, then scanned on-demand from Go memory.
package docstore

import (
	"sync"
)

// Store holds raw note documents in memory.
// Thread-safe for concurrent access from WASM callbacks.
type Store struct {
	mu   sync.RWMutex
	docs map[string]*Document
}

// Document represents a raw note stored in Go memory.
type Document struct {
	ID      string // Note ID (matches Dexie/Nebula ID)
	Text    string // Plain text content
	Version int64  // For change detection
}

// New creates an empty document store.
func New() *Store {
	return &Store{
		docs: make(map[string]*Document),
	}
}

// Hydrate bulk-loads documents into the store.
// Called once at startup with all notes.
func (s *Store) Hydrate(docs []Document) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, doc := range docs {
		s.docs[doc.ID] = &Document{
			ID:      doc.ID,
			Text:    doc.Text,
			Version: doc.Version,
		}
	}
	return len(docs)
}

// Upsert adds or updates a single document.
// Called when user saves a note.
func (s *Store) Upsert(id, text string, version int64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.docs[id] = &Document{
		ID:      id,
		Text:    text,
		Version: version,
	}
}

// Remove deletes a document from the store.
func (s *Store) Remove(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.docs, id)
}

// Get retrieves a document by ID.
// Returns nil if not found.
func (s *Store) Get(id string) *Document {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.docs[id]
}

// GetText retrieves just the text content by ID.
// Returns empty string if not found.
func (s *Store) GetText(id string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if doc, ok := s.docs[id]; ok {
		return doc.Text
	}
	return ""
}

// Count returns the number of documents in the store.
func (s *Store) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return len(s.docs)
}

// AllIDs returns all document IDs.
func (s *Store) AllIDs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ids := make([]string, 0, len(s.docs))
	for id := range s.docs {
		ids = append(ids, id)
	}
	return ids
}

// Clear removes all documents.
func (s *Store) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.docs = make(map[string]*Document)
}
