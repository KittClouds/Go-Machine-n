import { Injectable, signal, Renderer2, RendererFactory2, Inject, DOCUMENT } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private renderer: Renderer2;
    readonly isDark = signal<boolean>(false);

    constructor(
        rendererFactory: RendererFactory2,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.renderer = rendererFactory.createRenderer(null, null);
        // Init from local storage or check system preference could go here
    }

    toggleTheme(event?: MouseEvent) {
        const isDark = this.isDark();
        const nextState = !isDark;

        // Fallback for browsers without View Transitions
        if (!(this.document as any).startViewTransition) {
            this.updateTheme(nextState);
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
        const target = this.document.body; // Target body since index.html uses body.light

        console.log('[ThemeService] Updating theme. Dark:', dark);

        if (dark) {
            this.renderer.addClass(target, 'dark');
            this.renderer.removeClass(target, 'light');
        } else {
            this.renderer.addClass(target, 'light');
            this.renderer.removeClass(target, 'dark');
        }
    }
}
