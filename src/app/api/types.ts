export interface Note {
    id: string;
    worldId: string;
    title: string;
    content: string; // Markdown content
    folderId?: string;
    isEntity: boolean;
    entityKind?: string;
    entitySubtype?: string;
    isPinned: boolean;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NoteCreateParams {
    worldId: string;
    title: string;
    content: string;
    folderId?: string;
    isEntity: boolean;
    entityKind?: string;
    entitySubtype?: string;
}

export interface NoteUpdateParams {
    worldId: string;
    id: string;
    title?: string;
    content?: string;
    folderId?: string;
    isEntity?: boolean;
    entityKind?: string;
    entitySubtype?: string;
    isPinned?: boolean;
    favorite?: boolean;
}

export interface EditorApi {
    getNote(worldId: string, noteId: string): Promise<Note | null>;
    createNote(params: NoteCreateParams): Promise<Note>;
    updateNote(params: NoteUpdateParams): Promise<Note>;
    deleteNote(worldId: string, noteId: string): Promise<boolean>;
    listNotes(worldId: string): Promise<Note[]>;
    searchNotes(worldId: string, query: string): Promise<Note[]>;
}
