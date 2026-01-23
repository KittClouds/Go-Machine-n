import { Injectable } from '@angular/core';
import { EditorApi, Note, NoteCreateParams, NoteUpdateParams } from './types';

@Injectable({
    providedIn: 'root'
})
export class WebEditorService implements EditorApi {

    constructor() { }

    async getNote(worldId: string, noteId: string): Promise<Note | null> {
        console.log('[WebEditorApi] getNote', { worldId, noteId });
        return null;
    }

    async createNote(params: NoteCreateParams): Promise<Note> {
        console.log('[WebEditorApi] createNote', params);
        return {} as Note;
    }

    async updateNote(params: NoteUpdateParams): Promise<Note> {
        console.log('[WebEditorApi] updateNote', params);
        return {} as Note;
    }

    async deleteNote(worldId: string, noteId: string): Promise<boolean> {
        console.log('[WebEditorApi] deleteNote', { worldId, noteId });
        return true;
    }

    async listNotes(worldId: string): Promise<Note[]> {
        console.log('[WebEditorApi] listNotes', { worldId });
        return [];
    }

    async searchNotes(worldId: string, query: string): Promise<Note[]> {
        console.log('[WebEditorApi] searchNotes', { worldId, query });
        return [];
    }
}
