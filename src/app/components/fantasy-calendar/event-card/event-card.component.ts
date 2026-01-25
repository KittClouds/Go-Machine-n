import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCircle, lucideClock } from '@ng-icons/lucide';
import { CalendarEvent, ChecklistItem } from '../../../lib/fantasy-calendar/types';
import { CalendarService } from '../../../services/calendar.service';
import { getEventTypeById } from '../../../lib/fantasy-calendar/event-type-registry';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, NgIcon],
  providers: [provideIcons({ lucideCheck, lucideCircle, lucideClock })],
  template: `
    <div 
      class="group flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer border-l-2 bg-card/80 hover:bg-accent/20 transition-colors"
      [class.opacity-60]="isCompleted()"
      [style.borderLeftColor]="borderColor()"
      (click)="handleCardClick()"
    >
      <!-- Status Icon -->
      <button 
        (click)="handleStatusClick($event)"
        class="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
        [title]="'Status: ' + (event.status || 'todo')"
      >
        <ng-container [ngSwitch]="event.status">
          <ng-icon *ngSwitchCase="'completed'" name="lucideCheck" class="text-emerald-500 w-2.5 h-2.5"></ng-icon>
          <ng-icon *ngSwitchCase="'in-progress'" name="lucideClock" class="text-amber-500 w-2.5 h-2.5"></ng-icon>
          <ng-icon *ngSwitchDefault name="lucideCircle" class="text-slate-400 w-2.5 h-2.5"></ng-icon>
        </ng-container>
      </button>

      <!-- Title -->
      <span 
        class="flex-1 text-[10px] leading-tight truncate"
        [class.line-through]="isCompleted()"
        [class.text-muted-foreground]="isCompleted()"
      >
        {{ event.title }}
      </span>

      <!-- Progress Dot -->
      <div 
        *ngIf="event.status === 'in-progress' && progress() !== undefined"
        class="w-1.5 h-1.5 rounded-full shrink-0"
        [style.background]="progressStyle()"
        [title]="progress() + '% complete'"
      ></div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class EventCardComponent {
  @Input({ required: true }) event!: CalendarEvent;
  @Input() compact = false;
  @Output() cardClick = new EventEmitter<void>();

  constructor(private calendarService: CalendarService) { }

  readonly isCompleted = computed(() => this.event.status === 'completed');

  readonly borderColor = computed(() => {
    const type = this.event.eventTypeId ? getEventTypeById(this.event.eventTypeId) : undefined;
    return this.event.color || type?.color || '#6366f1';
  });

  readonly progress = computed(() => {
    if (this.event.progress !== undefined) return this.event.progress;
    if (this.event.checklist?.length) {
      const completed = this.event.checklist.filter(c => c.completed).length;
      return Math.round((completed / this.event.checklist.length) * 100);
    }
    return undefined;
  });

  readonly progressStyle = computed(() => {
    const p = this.progress();
    if (p === undefined) return '';
    return `conic-gradient(${this.borderColor()} ${p}%, transparent 0%)`;
  });

  handleStatusClick(e: MouseEvent) {
    e.stopPropagation();
    this.calendarService.toggleEventStatus(this.event.id);
  }

  handleCardClick() {
    this.calendarService.highlightedEventId.set(this.event.id);
    this.cardClick.emit();
  }
}
