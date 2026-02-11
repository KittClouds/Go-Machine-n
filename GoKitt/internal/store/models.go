// Package store provides SQLite-backed persistence for GoKitt WASM.
// This is the unified data layer replacing Dexie/Nebula in TypeScript.
package store

// Note represents a versioned document in the store.
// Uses temporal table pattern for full version history.
type Note struct {
	ID              string  `json:"id"`
	Version         int     `json:"version"`
	WorldID         string  `json:"worldId"`
	Title           string  `json:"title"`
	Content         string  `json:"content"`
	MarkdownContent string  `json:"markdownContent"`
	FolderID        string  `json:"folderId"`
	EntityKind      string  `json:"entityKind"`
	EntitySubtype   string  `json:"entitySubtype"`
	IsEntity        bool    `json:"isEntity"`
	IsPinned        bool    `json:"isPinned"`
	Favorite        bool    `json:"favorite"`
	OwnerID         string  `json:"ownerId"`
	NarrativeID     string  `json:"narrativeId"`
	Order           float64 `json:"order"`
	CreatedAt       int64   `json:"createdAt"`
	UpdatedAt       int64   `json:"updatedAt"`

	// Temporal fields for version tracking
	ValidFrom    int64  `json:"validFrom"`
	ValidTo      *int64 `json:"validTo,omitempty"`
	IsCurrent    bool   `json:"isCurrent"`
	ChangeReason string `json:"changeReason,omitempty"`
}

// Entity represents a registered entity in the store.
// Maps 1:1 to Dexie Entity interface.
type Entity struct {
	ID            string   `json:"id"`
	Label         string   `json:"label"`
	Kind          string   `json:"kind"`
	Subtype       string   `json:"subtype,omitempty"`
	Aliases       []string `json:"aliases"`
	FirstNote     string   `json:"firstNote"`
	TotalMentions int      `json:"totalMentions"`
	NarrativeID   string   `json:"narrativeId,omitempty"`
	CreatedBy     string   `json:"createdBy"` // "user" | "extraction" | "auto"
	CreatedAt     int64    `json:"createdAt"`
	UpdatedAt     int64    `json:"updatedAt"`
}

// Edge represents a relationship between two entities.
// Maps 1:1 to Dexie Edge interface.
type Edge struct {
	ID            string  `json:"id"`
	SourceID      string  `json:"sourceId"`
	TargetID      string  `json:"targetId"`
	RelType       string  `json:"relType"`
	Confidence    float64 `json:"confidence"`
	Bidirectional bool    `json:"bidirectional"`
	SourceNote    string  `json:"sourceNote,omitempty"`
	CreatedAt     int64   `json:"createdAt"`
}

// Folder represents a folder in the document hierarchy.
type Folder struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ParentID    string  `json:"parentId,omitempty"`
	WorldID     string  `json:"worldId"`
	NarrativeID string  `json:"narrativeId,omitempty"`
	FolderOrder float64 `json:"folderOrder"`
	CreatedAt   int64   `json:"createdAt"`
	UpdatedAt   int64   `json:"updatedAt"`
}

// =============================================================================
// Observational Memory Types (Phase B)
// =============================================================================

// MemoryType categorizes the kind of observation extracted from conversation.
type MemoryType string

const (
	MemoryTypeFact          MemoryType = "fact"           // Factual statement
	MemoryTypePreference    MemoryType = "preference"     // User preference
	MemoryTypeEntityMention MemoryType = "entity_mention" // Entity referenced
	MemoryTypeRelation      MemoryType = "relation"       // Relationship between entities
)

// Memory represents an extracted fact or observation from conversation.
// Stored independently and linked to threads via MemoryThread junction table.
type Memory struct {
	ID         string     `json:"id"`
	Content    string     `json:"content"`            // The extracted fact/observation
	MemoryType MemoryType `json:"memoryType"`         // Categorization
	Confidence float64    `json:"confidence"`         // Extraction confidence 0-1
	SourceRole string     `json:"sourceRole"`         // "user" or "assistant"
	EntityID   string     `json:"entityId,omitempty"` // Optional link to entities table
	CreatedAt  int64      `json:"createdAt"`
	UpdatedAt  int64      `json:"updatedAt"`
}

// Thread represents an LLM conversation thread.
// Can be scoped to world/narrative for context isolation.
type Thread struct {
	ID          string `json:"id"`
	WorldID     string `json:"worldId,omitempty"`
	NarrativeID string `json:"narrativeId,omitempty"`
	Title       string `json:"title,omitempty"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

// ThreadMessage is a single message in a conversation thread.
// Maps to TypeScript ChatMessage interface.
type ThreadMessage struct {
	ID          string `json:"id"`
	ThreadID    string `json:"threadId"`
	Role        string `json:"role"`        // "user", "assistant", "system"
	Content     string `json:"content"`     // Message text (or accumulated streaming text)
	NarrativeID string `json:"narrativeId"` // Scope to narrative (from TypeScript scope)
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt,omitempty"` // For streaming updates
	IsStreaming bool   `json:"isStreaming,omitempty"`
}

// MemoryThread links memories to threads (many-to-many relationship).
type MemoryThread struct {
	MemoryID  string `json:"memoryId"`
	ThreadID  string `json:"threadId"`
	MessageID string `json:"messageId,omitempty"` // Source message reference
	CreatedAt int64  `json:"createdAt"`
}

// Storer defines the interface for data persistence.
// SQLiteStore is the sole implementation, using in-memory SQLite for WASM.
type Storer interface {
	// Notes - Basic CRUD
	UpsertNote(note *Note) error
	GetNote(id string) (*Note, error)
	DeleteNote(id string) error
	ListNotes(folderID string) ([]*Note, error)
	CountNotes() (int, error)

	// Notes - Version-aware operations
	CreateNote(note *Note) error
	UpdateNote(note *Note, reason string) error
	GetNoteVersion(id string, version int) (*Note, error)
	ListNoteVersions(id string) ([]*Note, error)
	GetNoteAtTime(id string, timestamp int64) (*Note, error)
	RestoreNoteVersion(id string, version int) error

	// Entities
	UpsertEntity(entity *Entity) error
	GetEntity(id string) (*Entity, error)
	GetEntityByLabel(label string) (*Entity, error)
	DeleteEntity(id string) error
	ListEntities(kind string) ([]*Entity, error)
	CountEntities() (int, error)

	// Edges
	UpsertEdge(edge *Edge) error
	GetEdge(id string) (*Edge, error)
	DeleteEdge(id string) error
	ListEdgesForEntity(entityID string) ([]*Edge, error)
	CountEdges() (int, error)

	// Folders
	UpsertFolder(folder *Folder) error
	GetFolder(id string) (*Folder, error)
	DeleteFolder(id string) error
	ListFolders(parentID string) ([]*Folder, error)

	// Threads - LLM conversation management
	CreateThread(thread *Thread) error
	GetThread(id string) (*Thread, error)
	DeleteThread(id string) error
	ListThreads(worldID string) ([]*Thread, error)

	// ThreadMessages - Conversation history
	AddMessage(msg *ThreadMessage) error
	GetThreadMessages(threadID string) ([]*ThreadMessage, error)
	GetMessage(id string) (*ThreadMessage, error)
	UpdateMessage(msg *ThreadMessage) error
	AppendMessageContent(messageID string, chunk string) error
	DeleteThreadMessages(threadID string) error

	// Memories - Observational memory storage
	CreateMemory(memory *Memory, threadID, messageID string) error
	GetMemory(id string) (*Memory, error)
	DeleteMemory(id string) error
	GetMemoriesForThread(threadID string) ([]*Memory, error)
	ListMemoriesByType(memoryType MemoryType) ([]*Memory, error)

	// Export/Import (Database serialization for OPFS sync)
	Export() ([]byte, error)
	Import(data []byte) error

	// Lifecycle
	Close() error
}
