import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';

/**
 * FactSheetCardComponent
 *
 * A collapsible accordion card with a gradient header.
 * Takes pre-computed gradientCss for instant rendering (no runtime calculation).
 */
@Component({
  selector: 'app-fact-sheet-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CdkDragHandle],
  template: `
    <div class="fact-card rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <!-- Gradient Header (clickable) -->
      <button
        cdkDragHandle
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing"
        [style.background]="gradientCss()"
        (click)="toggle()"
      >
        <!-- Icon -->
        <span class="h-4 w-4 text-white/90 flex items-center justify-center">
          <ng-container [ngSwitch]="icon()">
            <lucide-icon *ngSwitchCase="'User'" name="user" class="h-4 w-4" />
            <lucide-icon *ngSwitchCase="'Zap'" name="zap" class="h-4 w-4" />
            <lucide-icon *ngSwitchCase="'BarChart3'" name="bar-chart-3" class="h-4 w-4" />
            <lucide-icon *ngSwitchCase="'Sparkles'" name="sparkles" class="h-4 w-4" />
            <lucide-icon *ngSwitchCase="'Package'" name="package" class="h-4 w-4" />
            <lucide-icon *ngSwitchCase="'Users'" name="users" class="h-4 w-4" />
            <lucide-icon *ngSwitchCase="'StickyNote'" name="sticky-note" class="h-4 w-4" />
            <lucide-icon *ngSwitchDefault name="circle" class="h-4 w-4" />
          </ng-container>
        </span>

        <!-- Title -->
        <span class="text-sm font-medium text-white flex-1 text-left">{{ title() }}</span>

        <!-- Chevron (rotates on open) -->
        <lucide-icon
          name="chevron-down"
          class="h-4 w-4 text-white/70 transition-transform duration-200"
          [class.rotate-180]="isOpen()"
        />
      </button>

      <!-- Collapsible Content -->
      <div *ngIf="isOpen()" class="fact-card-content p-3 space-y-3" [@slideDown]>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .fact-card {
      --tw-border-opacity: 0.5;
    }

    .fact-card-content {
      background: var(--card, hsl(240 10% 3.9%));
    }

    .rotate-180 {
      transform: rotate(180deg);
    }
  `,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class FactSheetCardComponent {
  /** Card title displayed in header */
  title = input.required<string>();

  /** Lucide icon name (e.g., 'User', 'Zap') */
  icon = input<string>('Circle');

  /** Pre-computed gradient CSS (e.g., 'linear-gradient(to right, #3b82f6, #06b6d4)') */
  gradientCss = input<string>('linear-gradient(to right, #3b82f6, #06b6d4)');

  /** Whether the card starts open */
  defaultOpen = input<boolean>(true);

  /** Internal open state */
  isOpen = signal(true);

  ngOnInit() {
    this.isOpen.set(this.defaultOpen());
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }
}
