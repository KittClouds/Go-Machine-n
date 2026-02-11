import { Injectable, signal } from '@angular/core';
import { getSetting, setSetting } from '../../lib/dexie/settings.service';

const STORAGE_KEY = 'kittclouds-blueprint-hub';

/**
 * Service for Blueprint Hub state.
 * Uses local signal state with Dexie settings persistence.
 */
@Injectable({
    providedIn: 'root'
})
export class BlueprintHubService {
    private _isOpen = signal(this.loadFromStorage());

    /** Whether the hub is currently open (signal) */
    get isHubOpen() {
        return this._isOpen;
    }

    private loadFromStorage(): boolean {
        return getSetting<boolean>(STORAGE_KEY, false);
    }

    private persist(): void {
        setSetting(STORAGE_KEY, this._isOpen());
    }

    /** Toggle hub open/closed */
    toggle(): void {
        this._isOpen.update(v => !v);
        this.persist();
    }

    /** Close the hub */
    close(): void {
        this._isOpen.set(false);
        this.persist();
    }

    /** Open the hub */
    open(): void {
        this._isOpen.set(true);
        this.persist();
    }
}
