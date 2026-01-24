import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Eraser } from 'lucide-angular';

@Component({
    selector: 'app-color-picker',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="p-3 w-[240px] bg-zinc-950 rounded-xl shadow-2xl border border-zinc-800">
            <!-- Default Action -->
            <button 
                type="button"
                class="flex items-center gap-2 w-full px-2 py-1.5 mb-3 rounded hover:bg-zinc-900 transition-colors text-sm text-zinc-300 hover:text-white group"
                (click)="selectColor(null)"
            >
               <lucide-icon [img]="EraserIcon" class="w-4 h-4 text-zinc-500 group-hover:text-zinc-300"></lucide-icon>
               <span>Default</span>
            </button>

            <!-- Color Grid -->
            <div class="grid grid-cols-8 gap-1.5">
                <button *ngFor="let color of colors"
                        type="button"
                        class="w-5 h-5 rounded-sm border border-transparent hover:scale-125 hover:border-white shadow-sm transition-transform focus:outline-none"
                        [style.backgroundColor]="color"
                        [title]="color"
                        (click)="selectColor(color)">
                </button>
            </div>

            <!-- More Colors (Mock) -->
            <div class="mt-3 pt-2 border-t border-zinc-900">
                <button class="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors w-full text-left px-1">
                    More Colors...
                </button>
            </div>
        </div>
    `
})
export class ColorPickerComponent {
    @Output() colorSelect = new EventEmitter<string | null>();
    readonly EraserIcon = Eraser;

    colors: string[] = [
        // Grayscale
        '#000000', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff',
        // Warms (Red -> Yellow)
        '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca',
        '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa',
        '#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a',
        // Naturals (Green -> Teal)
        '#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0',
        '#134e4a', '#115e59', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4',
        // Cools (Blue -> Indigo)
        '#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
        '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe',
        // Purples/Pinks
        '#581c87', '#6b21a8', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#e9d5ff', '#faf5ff',
        '#831843', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6', '#fbcfe8', '#fce7f3'
    ];

    selectColor(color: string | null) {
        this.colorSelect.emit(color);
    }
}
