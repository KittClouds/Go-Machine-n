import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ColorItem {
    id: string; // hex or name
    label: string;
    color: string; // css value
}

@Component({
    selector: 'app-color-picker',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="p-1 w-[200px]">
            <div class="text-xs text-zinc-500 font-medium mb-2 px-1 uppercase tracking-wider">Default</div>
            <button 
                type="button"
                class="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors text-sm text-zinc-300"
                (click)="selectColor(null)"
            >
               <div class="w-4 h-4 rounded border border-zinc-600 flex items-center justify-center overflow-hidden relative">
                    <div class="absolute inset-0 bg-zinc-400 rotate-45 transform w-[1px] h-[150%] left-[8px] -top-1"></div>
               </div>
               Default
            </button>

            <div class="h-px bg-zinc-800 my-2"></div>

            <div class="text-xs text-zinc-500 font-medium mb-2 px-1 uppercase tracking-wider">Colors</div>
            <div class="grid grid-cols-5 gap-1">
                <button *ngFor="let item of colors"
                        type="button"
                        class="w-8 h-8 rounded border border-zinc-700 hover:border-zinc-500 hover:scale-110 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                        [style.backgroundColor]="item.color"
                        [title]="item.label"
                        (click)="selectColor(item.color)">
                </button>
            </div>
        </div>
    `
})
export class ColorPickerComponent {
    @Output() colorSelect = new EventEmitter<string | null>();

    // Standard tailwind colors used in reference
    colors: ColorItem[] = [
        { id: 'gray', label: 'Gray', color: '#6b7280' },
        { id: 'red', label: 'Red', color: '#ef4444' },
        { id: 'orange', label: 'Orange', color: '#f97316' },
        { id: 'amber', label: 'Amber', color: '#f59e0b' },
        { id: 'green', label: 'Green', color: '#22c55e' },
        { id: 'blue', label: 'Blue', color: '#3b82f6' },
        { id: 'purple', label: 'Purple', color: '#a855f7' },
        { id: 'pink', label: 'Pink', color: '#ec4899' },
    ];

    selectColor(color: string | null) {
        this.colorSelect.emit(color);
    }
}
