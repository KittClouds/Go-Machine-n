import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePanelLeftOpen, lucidePanelLeftClose, lucideClock, lucideCalendarPlus,
  lucideMenu, lucideChevronLeft, lucidePencil, lucideTrash2, lucideCalendar
} from '@ng-icons/lucide';
import { CalendarService } from '../../../services/calendar.service';
import { CalendarEvent } from '../../../lib/fantasy-calendar/types';
import { getEventTypeById } from '../../../lib/fantasy-calendar/event-type-registry';

import { EventCreatorComponent } from '../event-creator/event-creator.component';
import { TimelineEditorComponent } from '../timeline-editor/timeline-editor.component';

@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    EventCreatorComponent,
    TimelineEditorComponent
  ],
  providers: [provideIcons({
    lucidePanelLeftOpen, lucidePanelLeftClose, lucideClock, lucideCalendarPlus,
    lucideMenu, lucideChevronLeft, lucidePencil, lucideTrash2, lucideCalendar
  })],
  template: `
    <!-- Collapsed View -->
    <div *ngIf="isCollapsed()" class="w-16 bg-card border-r h-full flex flex-col items-center py-4 gap-4 transition-all duration-300">
      <button class="btn-icon" (click)="toggleCollapse()" title="Expand Sidebar">
        <ng-icon name="lucidePanelLeftOpen" class="w-5 h-5"></ng-icon>
      </button>

      <div class="h-px w-8 bg-border"></div>

      <button class="btn-icon" title="Current View">
        <ng-icon name="lucideClock" class="w-5 h-5"></ng-icon>
      </button>

      <button class="btn-icon" title="Add Event">
        <ng-icon name="lucideCalendarPlus" class="w-5 h-5"></ng-icon>
      </button>

      <div class="relative">
        <button class="btn-icon" title="Events">
          <ng-icon name="lucideMenu" class="w-5 h-5"></ng-icon>
          <span *ngIf="eventCount() > 0" class="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>
      </div>

      <div class="mt-auto">
        <button class="btn-icon" (click)="onBackToEditor.emit()" title="Back to Editor">
          <ng-icon name="lucideChevronLeft" class="w-5 h-5"></ng-icon>
        </button>
      </div>
    </div>

    <!-- Expanded View -->
    <div *ngIf="!isCollapsed()" class="w-80 bg-card border-r h-full flex flex-col transition-all duration-300">
      
      <!-- Fixed Header -->
      <div class="flex items-start justify-between p-4 pb-2 shrink-0">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight truncate w-60" [title]="calendar().name">{{ calendar().name }}</h2>
          <p class="text-muted-foreground text-sm">
            {{ calendar().months.length }} months • {{ daysPerYear() }} days/year
          </p>
        </div>
        <button class="btn-icon -mr-2 -mt-1" (click)="toggleCollapse()">
          <ng-icon name="lucidePanelLeftClose" class="w-4 h-4"></ng-icon>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-4 space-y-4 pb-4 scrollbar-thin">
        
        <!-- Current Date & Time -->
        <div class="card bg-muted/30 border-none shadow-inner">
          <div class="card-header pb-2">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <ng-icon name="lucideClock" class="w-4 h-4"></ng-icon>
              Current Date & Time
            </h3>
          </div>
          <div class="card-content space-y-3">
            <!-- Year -->
            <div class="control-row">
              <button class="btn-xs" (click)="calendarService.navigateYear('prev')">-</button>
              <div class="flex-1 text-center text-sm font-medium">{{ viewYearFormatted() }}</div>
              <button class="btn-xs" (click)="calendarService.navigateYear('next')">+</button>
            </div>
            
            <!-- Month -->
            <div class="control-row">
              <button class="btn-xs" (click)="calendarService.navigateMonth('prev')">-</button>
              <div class="flex-1 text-center text-sm font-medium truncate">{{ currentMonth().name }}</div>
              <button class="btn-xs" (click)="calendarService.navigateMonth('next')">+</button>
            </div>
            
            <!-- Day -->
            <div class="control-row">
              <button class="btn-xs" (click)="calendarService.navigateDay('prev')">-</button>
              <div class="flex-1 text-center text-sm font-medium">Day {{ viewDate().dayIndex + 1 }}</div>
              <button class="btn-xs" (click)="calendarService.navigateDay('next')">+</button>
            </div>
          </div>
        </div>

        <!-- Timeline Editor -->
        <div class="card border-violet-500/20">
          <div class="card-content pt-4">
            <app-timeline-editor></app-timeline-editor>
          </div>
        </div>

        <!-- Add Event - Rich Creator -->
        <div class="card border-emerald-500/20">
          <div class="card-header pb-2">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <ng-icon name="lucideCalendarPlus" class="w-4 h-4"></ng-icon>
              Add Event
            </h3>
          </div>
          <div class="card-content">
            <app-event-creator></app-event-creator>
          </div>
        </div>

        <!-- Events List -->
        <div class="card flex-1 min-h-0">
          <div class="card-header pb-2">
            <h3 class="text-sm font-medium">
              Events This Month
              <span *ngIf="eventCount() > 0" class="ml-2 badge-secondary">{{ eventCount() }}</span>
            </h3>
          </div>
          <div class="card-content p-0">
            <div class="h-40 overflow-y-auto px-4 pb-4">
              <div *ngIf="eventCount() === 0" class="text-center text-muted-foreground text-xs py-4">
                No events this month
              </div>
              
              <div *ngIf="eventCount() > 0" class="space-y-2">
                <div 
                  *ngFor="let event of sortedEvents()"
                  class="flex items-center gap-2 p-2 rounded border text-sm group hover:bg-muted/50 transition-colors"
                  [style.border-left-color]="getEventColor(event)"
                  style="border-left-width: 3px;"
                >
                  <ng-icon name="lucideCalendar" class="w-3.5 h-3.5 shrink-0" [style.color]="getEventColor(event)"></ng-icon>
                  <span class="text-muted-foreground text-xs shrink-0">Day {{ event.date.dayIndex + 1 }}</span>
                  <span class="flex-1 truncate">{{ event.title }}</span>
                  
                  <button class="btn-icon-sm opacity-0 group-hover:opacity-100" (click)="editEvent(event)">
                    <ng-icon name="lucidePencil" class="w-3 h-3"></ng-icon>
                  </button>
                  <button class="btn-icon-sm text-destructive hover:text-destructive opacity-0 group-hover:opacity-100" (click)="removeEvent(event.id)">
                    <ng-icon name="lucideTrash2" class="w-3 h-3"></ng-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="shrink-0 p-4 pt-2 border-t">
        <button class="btn-ghost w-full justify-start gap-2" (click)="onBackToEditor.emit()">
          <ng-icon name="lucideChevronLeft" class="w-4 h-4"></ng-icon>
          Back to Editor
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .btn-icon { @apply p-2 hover:bg-muted rounded text-foreground/80 hover:text-foreground transition-colors; }
    .btn-icon-sm { @apply p-1 hover:bg-muted rounded text-foreground/80 hover:text-foreground transition-colors; }
    .btn-ghost { @apply px-3 py-1.5 hover:bg-muted rounded text-foreground/80 hover:text-foreground transition-colors flex items-center; }
    .btn-xs { @apply h-6 w-6 flex items-center justify-center hover:bg-muted rounded text-sm; }
    .card { @apply bg-card border rounded-lg shadow-sm; }
    .card-header { @apply p-4; }
    .card-content { @apply p-4 pt-0; }
    .control-row { @apply flex items-center gap-1 bg-background rounded-md border p-1; }
    .badge-secondary { @apply bg-secondary text-secondary-foreground hover:bg-secondary/80 text-[10px] px-1.5 py-0.5 rounded-full; }
  `]
})
export class CalendarSidebarComponent {
  @Output() onBackToEditor = new EventEmitter<void>();

  readonly calendarService = inject(CalendarService);
  readonly isCollapsed = signal(false);
  readonly calendar = this.calendarService.calendar;
  readonly viewDate = this.calendarService.viewDate;
  readonly currentMonth = this.calendarService.currentMonth;
  readonly daysInCurrentMonth = this.calendarService.daysInCurrentMonth;
  readonly viewYearFormatted = this.calendarService.viewYearFormatted;
  readonly eventsForCurrentMonth = this.calendarService.eventsForCurrentMonth;

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  daysPerYear() {
    return this.calendar().months.reduce((acc, m) => acc + m.days, 0);
  }

  eventCount() {
    return this.eventsForCurrentMonth().length;
  }

  sortedEvents() {
    return [...this.eventsForCurrentMonth()].sort((a, b) => a.date.dayIndex - b.date.dayIndex);
  }

  getEventColor(event: CalendarEvent): string {
    const type = event.eventTypeId ? getEventTypeById(event.eventTypeId) : undefined;
    return event.color || type?.color || '#6366f1';
  }

  removeEvent(id: string) {
    this.calendarService.removeEvent(id);
  }

  editEvent(event: CalendarEvent) {
    // Phase 4 MVP: just log or simple alert
    console.log('Edit event', event);
  }
}
