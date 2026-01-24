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
            <div class="flex items-center p-[2px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-sm shadow-sm transition-all select-none gap-0">
                <!-- Plus Button -->
                <div class="cursor-pointer text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 p-[3px] rounded-[2px] hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors" 
                     (click)="toggleMenu($event)"
                     (mousedown)="$event.preventDefault()"
                     title="Add Block">
                     <lucide-icon [img]="PlusIcon" class="w-[18px] h-[18px] stroke-[2.5px]"></lucide-icon>
                </div>

                <!-- Vertical Separator -->
                <div class="w-px h-3.5 bg-slate-200 dark:bg-zinc-700 mx-[2px]"></div>

                <!-- Drag Handle -->
                <div class="cursor-grab text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 p-[3px] rounded-[2px] hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                     draggable="true"
                     title="Drag to move">
                     <lucide-icon [img]="GripIcon" class="w-[18px] h-[18px] stroke-[2.5px]"></lucide-icon>
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
