import { Injectable, signal, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const HUB_STORAGE_KEY = 'kittclouds-hub-open';

@Injectable({
    providedIn: 'root'
})
export class BlueprintHubService {
    private isBrowser: boolean;

    // Initialize from localStorage synchronously to prevent flash
    isHubOpen = signal(this.getInitialState());

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);

        // Persist state changes
        effect(() => {
            const isOpen = this.isHubOpen();
            this.persistState(isOpen);
        });
    }

    private getInitialState(): boolean {
        // SSR safety: default to closed
        if (typeof localStorage === 'undefined') return false;

        try {
            const stored = localStorage.getItem(HUB_STORAGE_KEY);
            // Default to CLOSED if no stored value
            return stored === 'true';
        } catch {
            return false;
        }
    }

    private persistState(isOpen: boolean): void {
        if (!this.isBrowser) return;

        try {
            localStorage.setItem(HUB_STORAGE_KEY, String(isOpen));
        } catch {
            // Silently fail
        }
    }

    toggle() {
        this.isHubOpen.update(v => !v);
    }

    close() {
        this.isHubOpen.set(false);
    }

    open() {
        this.isHubOpen.set(true);
    }
}
