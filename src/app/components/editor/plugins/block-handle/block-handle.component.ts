import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ctx } from '@milkdown/kit/ctx';
import { editorViewCtx } from '@milkdown/kit/core';
import { paragraphSchema } from '@milkdown/kit/preset/commonmark';
import { TextSelection } from '@milkdown/kit/prose/state';
import { LucideAngularModule, GripVertical, Plus } from 'lucide-angular';
import { BlockMenuComponent } from './block-menu.component';

@Component({
    selector: 'app-block-handle',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, BlockMenuComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative group">
            <div class="flex items-center gap-1 p-0.5 bg-popover border border-border rounded shadow-md text-muted-foreground transition-colors select-none">
                <div class="cursor-pointer hover:text-foreground p-0.5 rounded hover:bg-muted" 
                     (click)="toggleMenu($event)"
                     (mousedown)="$event.preventDefault()"
                     title="Add Block">
                     <lucide-icon [img]="PlusIcon" class="w-4 h-4"></lucide-icon>
                </div>
                <div class="cursor-grab hover:text-foreground p-0.5 rounded hover:bg-muted"
                     draggable="true"
                     title="Drag to move">
                     <lucide-icon [img]="GripIcon" class="w-4 h-4"></lucide-icon>
                </div>
            </div>

            <!-- Menu Overlay -->
            <div *ngIf="isMenuOpen" 
                 class="absolute top-full left-0 mt-1 z-50">
                 <app-block-menu [ctx]="ctx" [activeBlock]="activeBlock" (close)="isMenuOpen = false"></app-block-menu>
            </div>
        </div>
        
        <!-- Backdrop for closing menu -->
        <div *ngIf="isMenuOpen" 
             class="fixed inset-0 z-40 bg-transparent" 
             (click)="isMenuOpen = false">
        </div>
    `,
    styles: [`
        :host {
            display: block;
            pointer-events: auto;
        }
    `]
})
export class BlockHandleComponent {
    @Input() ctx!: Ctx;
    @Input() onHide!: () => void;
    @Input() activeBlock: any;

    isMenuOpen = false;

    readonly GripIcon = GripVertical;
    readonly PlusIcon = Plus;

    constructor(private cdr: ChangeDetectorRef) { }

    toggleMenu(e: MouseEvent) {
        e.stopPropagation();
        this.isMenuOpen = !this.isMenuOpen;
    }

    // Original adds new paragraph directly (kept for reference, or if we want to restore drag-enter behavior)
    onAdd() {
        if (!this.ctx || !this.activeBlock) return;
        // ... previous implementation ...
    }
}
