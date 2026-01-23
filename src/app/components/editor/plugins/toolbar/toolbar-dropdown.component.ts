import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';

export interface DropdownItem {
    id: string;
    label: string;
    icon?: any;
    color?: string; // For color picker items if mixed
    active?: boolean;
}

@Component({
    selector: 'app-toolbar-dropdown',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative inline-block" #dropdownContainer>
            <button
                type="button"
                class="flex items-center gap-1 hover:bg-zinc-800 rounded px-1.5 py-1 text-zinc-300 hover:text-white transition-colors"
                [class.bg-zinc-800]="isOpen"
                (mousedown)="$event.preventDefault()"
                (click)="toggleOpen()"
            >
                <ng-content select="[trigger]"></ng-content>
                <lucide-icon [img]="ChevronDownIcon" class="w-3 h-3 opacity-70"></lucide-icon>
            </button>

            <!-- Dropdown Menu -->
            <div *ngIf="isOpen" 
                 class="absolute top-full left-0 mt-1 min-w-[140px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-[100] animate-in fade-in zoom-in-95 duration-100 flex flex-col p-1">
                
                <ng-container *ngIf="items.length > 0; else customContent">
                    <button *ngFor="let item of items"
                            type="button"
                            class="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left rounded hover:bg-zinc-800 transition-colors"
                            [class.text-blue-400]="item.active"
                            [class.bg-zinc-800]="item.active"
                            (click)="selectItem(item)">
                        <span *ngIf="item.icon" class="w-4 h-4 flex items-center justify-center">
                             <lucide-icon [img]="item.icon" class="w-3 h-3"></lucide-icon>
                        </span>
                        <span>{{ item.label }}</span>
                    </button>
                </ng-container>
                
                <ng-template #customContent>
                    <ng-content select="[content]"></ng-content>
                </ng-template>
            </div>
        </div>
    `,
    styles: [`:host { display: inline-block; }`]
})
export class ToolbarDropdownComponent {
    @Input() items: DropdownItem[] = [];
    @Output() select = new EventEmitter<DropdownItem>();

    isOpen = false;
    readonly ChevronDownIcon = ChevronDown;

    @ViewChild('dropdownContainer') container!: ElementRef;

    toggleOpen() {
        this.isOpen = !this.isOpen;
    }

    selectItem(item: DropdownItem) {
        this.select.emit(item);
        this.isOpen = false;
    }

    @HostListener('document:mousedown', ['$event'])
    onClickOutside(event: MouseEvent) {
        if (!this.container.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }
}
