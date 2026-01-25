import { Component, EventEmitter, Output, computed, signal, model, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown, lucideChevronUp, lucidePlus, lucideCalendar,
  lucideTag, lucidePalette, lucideClock, lucideX
} from '@ng-icons/lucide';
import { CalendarService } from '../../../services/calendar.service';
import { CalendarEvent, EventImportance, EventCategory } from '../../../lib/fantasy-calendar/types';
import { getEventTypesForScale, getEventTypeById, DEFAULT_EVENT_TYPE_ID, EventTypeDefinition } from '../../../lib/fantasy-calendar/event-type-registry';
import { IMPORTANCE_COLORS } from '../../../lib/fantasy-calendar/event-type-registry'; // Wait, I didn't export this from registry. I need to define it or get it.

// Define IMPORTANCE_COLORS locally if not exported
const IMPORTANCE_COLORS_MAP: Record<string, string> = {
  trivial: '#94a3b8',
  minor: '#60a5fa',
  moderate: '#a78bfa',
  major: '#facc15',
  critical: '#ef4444'
};

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899',
];

interface PendingEvent extends Omit<CalendarEvent, 'id' | 'calendarId'> {
  tempId: string;
}

@Component({
  selector: 'app-event-creator',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [provideIcons({
    lucideChevronDown, lucideChevronUp, lucidePlus, lucideCalendar,
    lucideTag, lucidePalette, lucideClock, lucideX
  })],
  template: `
    <div class="space-y-3">
      <!-- Quick Add Row -->
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="What happened?"
          [(ngModel)]="title"
          (keydown.enter)="!isExpanded() && handleAddAllEvents()"
          class="flex-1 h-9 px-3 rounded-md border text-sm bg-background w-full focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          class="btn-icon h-9 w-9 border"
          (click)="toggleExpanded()"
        >
          <ng-icon [name]="isExpanded() ? 'lucideChevronUp' : 'lucideChevronDown'" class="w-4 h-4"></ng-icon>
        </button>
      </div>

      <!-- Expandable Details -->
      <div *ngIf="isExpanded()" class="space-y-4 pt-2 border-t mt-2">
        
        <!-- Event Type Picker -->
        <div class="space-y-2">
          <label class="text-xs text-muted-foreground font-medium">Event Type</label>
          <div class="h-20 overflow-y-auto border rounded p-2 bg-muted/10">
            <div class="flex flex-wrap gap-1">
              <button
                *ngFor="let type of eventTypes()"
                (click)="handleSelectType(type)"
                class="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all border-l-2"
                [class.bg-primary]="selectedTypeId() === type.id"
                [class.text-primary-foreground]="selectedTypeId() === type.id"
                [class.bg-muted-50]="selectedTypeId() !== type.id"
                [style.border-left-color]="type.color"
              >
                <!-- Icon would go here if we dynamically loaded it, for now text label implies type -->
                {{ type.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Date Row -->
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="text-xs text-muted-foreground font-medium">Day</label>
            <select [(ngModel)]="day" class="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm">
              <option *ngFor="let d of dayOptions()" [value]="d">{{ d }}</option>
            </select>
          </div>
          <div class="flex-[2]">
            <label class="text-xs text-muted-foreground font-medium">Month & Year</label>
            <div class="h-9 px-2 bg-muted/50 rounded-md flex items-center text-sm text-muted-foreground border">
              {{ currentMonth().name }}, {{ viewYearFormatted() }}
            </div>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="text-xs text-muted-foreground font-medium">Description</label>
           <textarea
            [(ngModel)]="description"
            rows="2"
            class="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Details..."
          ></textarea>
        </div>

        <!-- Color & Importance -->
        <div class="flex gap-4">
          <div class="flex-1">
            <label class="text-xs text-muted-foreground font-medium">Color</label>
            <div class="flex gap-1 mt-1 flex-wrap">
              <button
                *ngFor="let c of colorPresets"
                (click)="color.set(color() === c ? undefined : c)"
                class="w-5 h-5 rounded-full transition-all border border-border"
                [class.ring-2]="color() === c"
                [class.ring-offset-1]="color() === c"
                [class.scale-110]="color() === c"
                [style.background-color]="c"
              ></button>
            </div>
          </div>
          <div class="flex-1">
            <label class="text-xs text-muted-foreground font-medium">Importance</label>
             <select [(ngModel)]="importance" class="flex h-7 w-full rounded-md border bg-background px-2 text-xs">
              <option value="trivial">Trivial</option>
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <!-- Tags (simplified) -->
        <div>
           <label class="text-xs text-muted-foreground font-medium">Tags</label>
           <div class="flex flex-wrap gap-1 mb-2">
            <span *ngFor="let tag of tags()" class="bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
              {{ tag }}
              <button (click)="removeTag(tag)" class="hover:text-destructive"><ng-icon name="lucideX" class="w-3 h-3"></ng-icon></button>
            </span>
           </div>
           <div class="flex gap-1">
            <input 
              [(ngModel)]="newTag" 
              (keydown.enter)="addTag()"
              placeholder="Add tag..." 
              class="flex-1 h-7 text-xs px-2 border rounded"
            />
            <button class="btn-icon h-7 w-7 border" (click)="addTag()">
              <ng-icon name="lucidePlus" class="w-3 h-3"></ng-icon>
            </button>
           </div>
        </div>

      </div>

      <!-- Pending Events List -->
      <div *ngIf="pendingEvents().length > 0" class="space-y-1 bg-muted/30 p-2 rounded-md border text-xs">
        <label class="text-xs text-muted-foreground">Pending Events ({{ pendingEvents().length }})</label>
        <div *ngFor="let evt of pendingEvents()" class="flex justify-between items-center bg-background p-1.5 rounded border">
          <span class="truncate flex-1">{{ evt.title }}</span>
          <span class="text-muted-foreground ml-2">Day {{ evt.date.dayIndex + 1 }}</span>
          <button (click)="removePending(evt.tempId)" class="ml-2 text-destructive hover:text-destructive/80">
            <ng-icon name="lucideX" class="w-3 h-3"></ng-icon>
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 text-sm">
        <button 
          *ngIf="isExpanded()"
          class="flex-1 btn-secondary h-8 flex items-center justify-center gap-1"
          (click)="handleQueueEvent()"
          [disabled]="!title.trim()"
        >
          <ng-icon name="lucidePlus" class="w-3 h-3"></ng-icon> Add Another
        </button>
        <button 
          class="flex-[2] btn-primary h-8 flex items-center justify-center gap-1"
          (click)="handleAddAllEvents()"
          [disabled]="!title.trim() && pendingEvents().length === 0"
        >
          <ng-icon name="lucidePlus" class="w-3 h-3"></ng-icon>
          {{ getAddButtonLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .btn-icon { @apply flex items-center justify-center hover:bg-muted rounded transition-colors; }
    .btn-primary { @apply bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium transition-colors disabled:opacity-50; }
    .btn-secondary { @apply bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded font-medium transition-colors disabled:opacity-50; }
  `]
})
export class EventCreatorComponent {
  readonly calendarService = inject(CalendarService);
  readonly isExpanded = signal(false);
  title = '';
  description = '';
  selectedTypeId = signal(DEFAULT_EVENT_TYPE_ID);
  day = '1';
  color = signal<string | undefined>(undefined);
  importance = signal<EventImportance>('moderate');
  tags = signal<string[]>([]);
  newTag = '';
  pendingEvents = signal<PendingEvent[]>([]);

  readonly calendar = this.calendarService.calendar;
  readonly viewDate = this.calendarService.viewDate;
  readonly currentMonth = this.calendarService.currentMonth;
  readonly daysInCurrentMonth = this.calendarService.daysInCurrentMonth;
  readonly viewYearFormatted = this.calendarService.viewYearFormatted;

  readonly eventTypes = computed(() => getEventTypesForScale('month'));
  readonly dayOptions = computed(() =>
    Array.from({ length: this.daysInCurrentMonth() }, (_, i) => String(i + 1))
  );
  readonly colorPresets = COLOR_PRESETS;

  toggleExpanded() {
    this.isExpanded.update(v => !v);
  }

  handleSelectType(type: EventTypeDefinition) {
    this.selectedTypeId.set(type.id);
    this.importance.set(type.importance);
    if (!this.color()) {
      this.color.set(type.color);
    }
  }

  addTag() {
    if (this.newTag.trim() && !this.tags().includes(this.newTag.trim())) {
      this.tags.update(t => [...t, this.newTag.trim()]);
      this.newTag = '';
    }
  }

  removeTag(tag: string) {
    this.tags.update(t => t.filter(x => x !== tag));
  }

  createEventObject(): PendingEvent | null {
    if (!this.title.trim()) return null;

    const typeDef = getEventTypeById(this.selectedTypeId());

    return {
      tempId: Math.random().toString(36),
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      date: {
        year: this.viewDate().year,
        monthIndex: this.viewDate().monthIndex,
        dayIndex: parseInt(this.day) - 1
      },
      importance: this.importance(),
      category: typeDef?.category || 'general',
      color: this.color() || typeDef?.color,
      eventTypeId: this.selectedTypeId() !== DEFAULT_EVENT_TYPE_ID ? this.selectedTypeId() : undefined,
      tags: this.tags().length > 0 ? this.tags() : undefined,
      status: 'todo'
    };
  }

  handleQueueEvent() {
    const evt = this.createEventObject();
    if (evt) {
      this.pendingEvents.update(p => [...p, evt]);
      this.resetForm();
    }
  }

  handleAddAllEvents() {
    const currentEvt = this.createEventObject();
    const all = [...this.pendingEvents()];

    if (currentEvt) all.push(currentEvt);
    if (all.length === 0) return;

    all.forEach(evt => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tempId, ...data } = evt;
      this.calendarService.addEvent(data);
    });

    this.pendingEvents.set([]);
    this.resetForm();
    this.isExpanded.set(false);
  }

  removePending(tempId: string) {
    this.pendingEvents.update(p => p.filter(x => x.tempId !== tempId));
  }

  resetForm() {
    this.title = '';
    this.description = '';
    this.tags.set([]);
    this.color.set(undefined);
    this.selectedTypeId.set(DEFAULT_EVENT_TYPE_ID);
    // keep day/importance logic if desired, but resetting here
  }

  getAddButtonLabel() {
    const count = this.pendingEvents().length;
    if (count > 0) {
      return this.title.trim() ? `Add ${count + 1} Events` : `Add ${count} Pending Events`;
    }
    return this.isExpanded() ? 'Add Event' : `Add to ${this.currentMonth().name}`;
  }
}
