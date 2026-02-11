// src/app/lib/services/theme.service.ts
// Theme service with Dexie settings persistence

import { Injectable, signal, Renderer2, RendererFactory2, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { getSetting, setSetting } from '../dexie/settings.service';

const THEME_STORAGE_KEY = 'kittclouds-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private renderer: Renderer2;
    private isBrowser: boolean;
    readonly isDark = signal<boolean>(true); // Default to dark

    constructor(
        rendererFactory: RendererFactory2,
        @Inject(DOCUMENT) private document: Document,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.renderer = rendererFactory.createRenderer(null, null);
        this.isBrowser = isPlatformBrowser(platformId);
        this.initializeTheme();
    }

    /**
     * Initialize theme from Dexie settings or system preference.
     * Runs on app startup.
     */
    private initializeTheme(): void {
        if (!this.isBrowser) return;

        let prefersDark = true; // Default to dark

        // Check Dexie settings first
        const stored = getSetting<string | null>(THEME_STORAGE_KEY, null);
        if (stored !== null) {
            prefersDark = stored === 'dark';
            console.log(`[ThemeService] Restored theme from storage: ${stored}`);
        } else {
            // Fall back to system preference
            prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            console.log(`[ThemeService] Using system preference: ${prefersDark ? 'dark' : 'light'}`);
        }

        // Apply theme immediately (no animation on init)
        this.updateTheme(prefersDark);
    }

    toggleTheme(event?: MouseEvent) {
        const isDark = this.isDark();
        const nextState = !isDark;

        // Fallback for browsers without View Transitions
        if (!(this.document as any).startViewTransition) {
            this.updateTheme(nextState);
            this.persistTheme(nextState);
            return;
        }

        const x = event?.clientX ?? window.innerWidth / 2;
        const y = event?.clientY ?? window.innerHeight / 2;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = (this.document as any).startViewTransition(() => {
            this.updateTheme(nextState);
            this.persistTheme(nextState);
        });

        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

            // Animate the new view growing from the click position
            document.documentElement.animate(
                {
                    clipPath: clipPath,
                },
                {
                    duration: 500,
                    easing: 'ease-in-out',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });
    }

    private updateTheme(dark: boolean) {
        this.isDark.set(dark);
        const target = this.document.body;

        console.log('[ThemeService] Applying theme. Dark:', dark);

        if (dark) {
            this.renderer.addClass(target, 'dark');
            this.renderer.removeClass(target, 'light');
        } else {
            this.renderer.addClass(target, 'light');
            this.renderer.removeClass(target, 'dark');
        }
    }

    private persistTheme(dark: boolean): void {
        if (!this.isBrowser) return;
        setSetting(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
        console.log(`[ThemeService] Persisted theme: ${dark ? 'dark' : 'light'}`);
    }
}
