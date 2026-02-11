package store

import (
	"testing"
	"time"
)

func TestExportImport(t *testing.T) {
	// Initialize store (in-memory)
	s, err := NewSQLiteStore()
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	// Create some data
	note := &Note{
		ID:        "note1",
		Title:     "Test Note",
		Content:   "Content",
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
		IsCurrent: true,
		Version:   1,
		WorldID:   "world1",
	}
	if err := s.UpsertNote(note); err != nil {
		t.Fatalf("Failed to upsert note: %v", err)
	}

	folder := &Folder{
		ID:        "folder1",
		Name:      "Test Folder",
		WorldID:   "world1",
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}
	if err := s.UpsertFolder(folder); err != nil {
		t.Fatalf("Failed to upsert folder: %v", err)
	}

	// Export
	data, err := s.Export()
	if err != nil {
		t.Fatalf("Export failed: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("Exported data is empty")
	}

	// Create a NEW store to simulate a fresh start/reload
	s2, err := NewSQLiteStore()
	if err != nil {
		t.Fatalf("Failed to create second store: %v", err)
	}

	// Import
	if err := s2.Import(data); err != nil {
		t.Fatalf("Import failed: %v", err)
	}

	// Verify data in new store
	restoredNote, err := s2.GetNote("note1")
	if err != nil {
		t.Fatalf("Failed to get restored note: %v", err)
	}
	if restoredNote.Title != note.Title {
		t.Errorf("Expected title %s, got %s", note.Title, restoredNote.Title)
	}

	folders, err := s2.ListFolders("world1")
	if err != nil {
		t.Fatalf("Failed to list folders: %v", err)
	}
	if len(folders) != 1 {
		t.Errorf("Expected 1 folder, got %d", len(folders))
	}
	if folders[0].Name != folder.Name {
		t.Errorf("Expected folder name %s, got %s", folder.Name, folders[0].Name)
	}
}

func TestFolderCRUD(t *testing.T) {
	s, err := NewSQLiteStore()
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	// Create
	f1 := &Folder{
		ID:      "f1",
		Name:    "Folder 1",
		WorldID: "w1",
	}
	if err := s.UpsertFolder(f1); err != nil {
		t.Fatalf("UpsertFolder failed: %v", err)
	}

	// Read
	folders, err := s.ListFolders("w1")
	if err != nil {
		t.Fatalf("ListFolders failed: %v", err)
	}
	if len(folders) != 1 || folders[0].ID != "f1" {
		t.Errorf("ListFolders mismatch")
	}

	// Update
	f1.Name = "Folder 1 Updated"
	if err := s.UpsertFolder(f1); err != nil {
		t.Fatalf("UpsertFolder update failed: %v", err)
	}
	folders, _ = s.ListFolders("w1")
	if folders[0].Name != "Folder 1 Updated" {
		t.Errorf("Folder update not persisted")
	}

	// Delete
	if err := s.DeleteFolder("f1"); err != nil {
		t.Fatalf("DeleteFolder failed: %v", err)
	}
	folders, _ = s.ListFolders("w1")
	if len(folders) != 0 {
		t.Errorf("Folder not deleted")
	}
}
