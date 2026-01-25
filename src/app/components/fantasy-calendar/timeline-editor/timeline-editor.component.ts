import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight, lucideChevronDown, lucidePlus, lucideTrash2,
  lucideEdit3, lucideCalendar, lucideClock, lucideLayers, lucideSparkles
} from '@ng-icons/lucide';
import { CalendarService } from '../../../services/calendar.service';
import { Period, PeriodType, CalendarEvent } from '../../../lib/fantasy-calendar/types';
import { generateUUID } from '../../../lib/fantasy-calendar/utils';

const PERIOD_TYPE_COLORS: Record<PeriodType, string> = {
  epoch: '#8b5cf6',
  era: '#3b82f6',
  age: '#10b981',
  custom: '#f59e0b',
};

@Component({
  selector: 'app-timeline-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [provideIcons({
    lucideChevronRight, lucideChevronDown, lucidePlus, lucideTrash2,
    lucideEdit3, lucideCalendar, lucideClock, lucideLayers, lucideSparkles
  })],
  template: `
    <div class="space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ng-icon name="lucideLayers" class="w-4 h-4 text-muted-foreground"></ng-icon>
          <h3 class="text-sm font-semibold">Timeline Periods</h3>
        </div>
        <button class="btn-ghost h-7 px-2 text-xs" (click)="openAddDialog()">
          <ng-icon name="lucidePlus" class="w-3.5 h-3.5 mr-1"></ng-icon>
          Add
        </button>
      </div>

      <!-- Period Tree -->
      <div class="space-y-0.5 max-h-[300px] overflow-y-auto">
        <div *ngIf="rootPeriods().length === 0" class="text-center py-8 text-muted-foreground">
          <ng-icon name="lucideLayers" class="w-8 h-8 mx-auto mb-2 opacity-40"></ng-icon>
          <p class="text-sm">No periods yet</p>
          <p class="text-xs">Create an epoch or era to organize your timeline</p>
        </div>

        <ng-container *ngFor="let period of rootPeriods()">
          <ng-container *ngTemplateOutlet="periodItemTpl; context: { period: period, depth: 0 }"></ng-container>
        </ng-container>
      </div>

      <!-- Quick Stats -->
      <div *ngIf="periods().length > 0" class="flex gap-2 pt-2 border-t flex-wrap">
        <span class="bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded">
          {{ epochCount() }} Epochs
        </span>
        <span class="bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded">
          {{ eraCount() }} Eras
        </span>
        <span class="bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded">
          {{ ageCount() }} Ages
        </span>
      </div>

      <!-- Add Period Form (inline instead of dialog for simplicity) -->
      <div *ngIf="showAddForm()" class="border rounded p-3 space-y-3 bg-muted/30">
        <div class="flex justify-between items-center">
          <h4 class="text-sm font-medium">{{ editingPeriod() ? 'Edit Period' : 'New Period' }}</h4>
          <button class="text-xs text-muted-foreground hover:text-foreground" (click)="closeAddDialog()">Cancel</button>
        </div>
        
        <div class="space-y-2">
          <input type="text" [(ngModel)]="formName" placeholder="Period Name" class="input-field h-8 text-sm" />
        </div>
        
        <div class="grid grid-cols-2 gap-2">
          <select [(ngModel)]="formType" class="input-field h-8 text-sm">
            <option value="epoch">Epoch</option>
            <option value="era">Era</option>
            <option value="age">Age</option>
            <option value="custom">Custom</option>
          </select>
          <input type="number" [(ngModel)]="formStartYear" placeholder="Start Year" class="input-field h-8 text-sm" />
        </div>
        
        <div class="flex gap-2">
          <button class="btn-primary flex-1 h-8 text-sm" (click)="savePeriod()">
            {{ editingPeriod() ? 'Save' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Period Item Template (recursive) -->
    <ng-template #periodItemTpl let-period="period" let-depth="depth">
      <div 
        class="group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors border-l-2"
        [style.margin-left.px]="depth * 16"
        [style.border-left-color]="getPeriodColor(period)"
      >
        <!-- Expand/Collapse Toggle -->
        <button 
          *ngIf="hasChildren(period)"
          class="p-0.5 hover:bg-muted rounded"
          (click)="toggleExpand(period.id)"
        >
          <ng-icon 
            [name]="isExpanded(period.id) ? 'lucideChevronDown' : 'lucideChevronRight'" 
            class="w-3.5 h-3.5 text-muted-foreground"
          ></ng-icon>
        </button>
        <span *ngIf="!hasChildren(period)" class="w-4"></span>

        <!-- Icon -->
        <ng-icon [name]="getPeriodIcon(period)" class="w-4 h-4" [style.color]="getPeriodColor(period)"></ng-icon>

        <!-- Name -->
        <span class="flex-1 text-sm font-medium truncate">{{ period.name }}</span>

        <!-- Year Range -->
        <span class="text-[10px] px-1.5 py-0 border rounded text-muted-foreground">
          {{ period.startYear }}–{{ period.endYear || 'now' }}
        </span>

        <!-- Actions -->
        <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="p-1 hover:bg-muted rounded" title="Add nested" (click)="addChildPeriod(period)">
            <ng-icon name="lucidePlus" class="w-3 h-3 text-muted-foreground"></ng-icon>
          </button>
          <button class="p-1 hover:bg-muted rounded" title="Edit" (click)="editPeriod(period)">
            <ng-icon name="lucideEdit3" class="w-3 h-3 text-muted-foreground"></ng-icon>
          </button>
          <button class="p-1 hover:bg-destructive/20 rounded" title="Delete" (click)="deletePeriod(period.id)">
            <ng-icon name="lucideTrash2" class="w-3 h-3 text-destructive"></ng-icon>
          </button>
        </div>
      </div>

      <!-- Children (if expanded) -->
      <ng-container *ngIf="isExpanded(period.id)">
        <ng-container *ngFor="let child of getChildPeriods(period.id)">
          <ng-container *ngTemplateOutlet="periodItemTpl; context: { period: child, depth: depth + 1 }"></ng-container>
        </ng-container>
        
        <!-- Events in period -->
        <div 
          *ngFor="let event of getEventsInPeriod(period)"
          class="flex items-center gap-2 py-1 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          [style.margin-left.px]="(depth + 1) * 16 + 16"
        >
          <ng-icon name="lucideCalendar" class="w-3 h-3"></ng-icon>
          <span class="truncate">{{ event.title }}</span>
          <span class="text-xs opacity-60">Year {{ event.date.year }}</span>
        </div>
      </ng-container>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .input-field { @apply flex w-full rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring; }
    .btn-ghost { @apply flex items-center hover:bg-muted rounded transition-colors; }
    .btn-primary { @apply flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium transition-colors; }
  `]
})
export class TimelineEditorComponent {
  readonly calendarService = inject(CalendarService);
  readonly periods = this.calendarService.periods;
  readonly events = this.calendarService.events;

  readonly expandedIds = signal<Set<string>>(new Set());
  readonly showAddForm = signal(false);
  readonly editingPeriod = signal<Period | null>(null);
  readonly parentPeriodId = signal<string | null>(null);

  // Form state
  formName = '';
  formType: PeriodType = 'epoch';
  formStartYear = 1;

  readonly rootPeriods = computed(() =>
    this.periods().filter(p => !p.parentPeriodId)
  );

  readonly epochCount = computed(() => this.periods().filter(p => p.periodType === 'epoch').length);
  readonly eraCount = computed(() => this.periods().filter(p => p.periodType === 'era').length);
  readonly ageCount = computed(() => this.periods().filter(p => p.periodType === 'age').length);

  constructor() { }

  getChildPeriods(parentId: string): Period[] {
    return this.periods().filter(p => p.parentPeriodId === parentId);
  }

  getEventsInPeriod(period: Period): CalendarEvent[] {
    return this.events().filter(e =>
      e.date.year >= period.startYear &&
      (!period.endYear || e.date.year <= period.endYear)
    );
  }

  hasChildren(period: Period): boolean {
    return this.getChildPeriods(period.id).length > 0 || this.getEventsInPeriod(period).length > 0;
  }

  getPeriodColor(period: Period): string {
    return period.color || PERIOD_TYPE_COLORS[period.periodType] || '#6366f1';
  }

  getPeriodIcon(period: Period): string {
    switch (period.periodType) {
      case 'epoch': return 'lucideSparkles';
      case 'era': return 'lucideLayers';
      case 'age': return 'lucideClock';
      default: return 'lucideCalendar';
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: string) {
    const set = new Set(this.expandedIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.expandedIds.set(set);
  }

  openAddDialog() {
    this.editingPeriod.set(null);
    this.parentPeriodId.set(null);
    this.formName = '';
    this.formType = 'epoch';
    this.formStartYear = 1;
    this.showAddForm.set(true);
  }

  closeAddDialog() {
    this.showAddForm.set(false);
    this.editingPeriod.set(null);
  }

  editPeriod(period: Period) {
    this.editingPeriod.set(period);
    this.formName = period.name;
    this.formType = period.periodType;
    this.formStartYear = period.startYear;
    this.showAddForm.set(true);
  }

  addChildPeriod(parent: Period) {
    this.editingPeriod.set(null);
    this.parentPeriodId.set(parent.id);
    this.formName = '';
    this.formType = 'era';
    this.formStartYear = parent.startYear;
    this.showAddForm.set(true);
  }

  savePeriod() {
    if (!this.formName.trim()) return;

    const editing = this.editingPeriod();
    if (editing) {
      this.calendarService.updatePeriod(editing.id, {
        name: this.formName,
        periodType: this.formType,
        startYear: this.formStartYear
      });
    } else {
      this.calendarService.addPeriod({
        name: this.formName,
        periodType: this.formType,
        startYear: this.formStartYear,
        color: PERIOD_TYPE_COLORS[this.formType],
        parentPeriodId: this.parentPeriodId() || undefined
      });
    }

    this.closeAddDialog();
  }

  deletePeriod(id: string) {
    this.calendarService.removePeriod(id);
  }
}
