import { InjectionToken } from '@angular/core';
import { EditorApi } from './types';

// Injection token for the Editor API
export const EDITOR_API = new InjectionToken<EditorApi>('EDITOR_API');

export function editorApiFactory(): EditorApi {
    // For now, always return the Web implementation stub
    // In the future, this factory can decide between Web and Tauri implementations
    // avoiding any direct imports of Tauri code here to keep it clean.
    // We will rely on Angular's DI to perform the swap if needed, 
    // or check window.__TAURI__ here if we eventually re-introduce it.
    throw new Error("Editor API not yet configured via dependency injection");
}
