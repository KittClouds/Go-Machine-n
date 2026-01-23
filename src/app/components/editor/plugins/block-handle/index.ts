import { EnvironmentInjector, ApplicationRef, ComponentRef, createComponent } from '@angular/core';
import { Ctx } from '@milkdown/kit/ctx';
import { block, blockConfig, BlockProvider, BlockProviderOptions } from '@milkdown/kit/plugin/block';
import { findParent } from '@milkdown/kit/prose';
import { PluginView } from '@milkdown/kit/prose/state'; // Import PluginView
import { BlockHandleComponent } from './block-handle.component';

export class AngularBlockHandleView implements PluginView {
    private content: HTMLElement;
    private provider: BlockProvider;
    private componentRef: ComponentRef<BlockHandleComponent>;

    constructor(
        private ctx: Ctx,
        private injector: EnvironmentInjector,
        private appRef: ApplicationRef
    ) {
        // Create container element
        this.content = document.createElement('div');
        this.content.className = 'angular-block-handle';
        // Basic styles to ensure it floats near the block
        this.content.style.position = 'absolute';

        // Create Angular component
        this.componentRef = createComponent(BlockHandleComponent, {
            environmentInjector: this.injector, // Correction: Access private member safely if needed, or just pass simple arg
            hostElement: this.content
        });
        // FIX: The previous line `privateinjector` had a typo in constructor args.
        // It should be `private injector: EnvironmentInjector`. I will fix this in file generation.

        this.componentRef.instance.ctx = this.ctx;
        this.componentRef.instance.onHide = () => this.provider.hide();

        // Attach to app
        this.appRef.attachView(this.componentRef.hostView);

        // Create BlockProvider
        this.provider = new BlockProvider({
            ctx,
            content: this.content,
            getOffset: () => 16,
            getPlacement: () => 'left',
        });

        // Force initial update
        this.update();
    }

    update = () => {
        this.provider.update();
        if (this.provider.active) {
            this.componentRef.instance.activeBlock = this.provider.active;
            // Maybe force change detection if needed
            this.componentRef.changeDetectorRef.detectChanges();
        }
    };

    destroy = () => {
        this.provider.destroy();
        this.appRef.detachView(this.componentRef.hostView);
        this.componentRef.destroy();
        this.content.remove();
    };
}

// Configuration factory
export function configureAngularBlockHandle(injector: EnvironmentInjector, appRef: ApplicationRef) {
    return (ctx: Ctx) => {
        // Configure where block handle should appear
        ctx.set(blockConfig.key, {
            filterNodes: (pos) => {
                const filter = findParent((node) =>
                    ['table', 'blockquote', 'math_inline', 'image'].includes(node.type.name)
                )(pos);
                if (filter) return false;
                return true;
            },
        });

        // Set the custom view
        ctx.set(block.key, {
            view: () => new AngularBlockHandleView(ctx, injector, appRef),
        });
    };
}

export const angularBlockHandlePlugin = block;
