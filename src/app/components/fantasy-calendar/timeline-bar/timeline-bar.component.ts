import { Component, Input, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft, lucideChevronRight, lucideCalendar, lucideCheckCircle,
  lucideClock, lucideChevronDown
} from '@ng-icons/lucide';
import { CalendarService } from '../../../services/calendar.service';
import { formatYearWithEra } from '../../../lib/fantasy-calendar/utils';
import { getEventTypeById } from '../../../lib/fantasy-calendar/event-type-registry';
import { CalendarEvent } from '../../../lib/fantasy-calendar/types';

export type TimeScale = 'month' | 'year' | 'decade' | 'century';

interface TimelineItem {
  periodLabel: string;
  subLabel: string;
  year: number;
  monthIndex?: number;
  dayIndex?: number;
  events: { id: string; title: string; isChecked: boolean }[];
  isChecked: boolean;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'app-timeline-bar',
  standalone: true,
  imports: [CommonModule, NgIcon],
  providers: [provideIcons({
    lucideChevronLeft, lucideChevronRight, lucideCalendar, lucideCheckCircle,
    lucideClock, lucideChevronDown
  })],
  template: `
    <div class="mx-auto px-4 py-2 w-full max-w-7xl">
      <div class="relative">
        <!-- Navigation Arrows -->
        <button 
          (click)="prevSlide()"
          class="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm border p-2 rounded-full shadow-md hover:bg-muted/50 transition-colors"
        >
          <ng-icon name="lucideChevronLeft" class="w-6 h-6"></ng-icon>
        </button>
        <button 
          (click)="nextSlide()"
          class="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm border p-2 rounded-full shadow-md hover:bg-muted/50 transition-colors"
        >
          <ng-icon name="lucideChevronRight" class="w-6 h-6"></ng-icon>
        </button>

        <!-- Timeline Line -->
        <div class="absolute left-0 right-0 top-1/2 h-0.5 bg-border z-0"></div>

        <!-- Carousel -->
        <div class="relative overflow-hidden touch-pan-x" style="height: 280px;">
          <div class="flex h-full items-center justify-center">
            <ng-container *ngFor="let item of timelineEvents(); let i = index">
              <div 
                class="absolute w-64 mx-4 transition-all duration-300"
                [style.transform]="getCardTransform(i)"
                [style.z-index]="i === currentIndex() ? 10 : 0"
                [class.opacity-70]="i !== currentIndex()"
                [class.scale-90]="i !== currentIndex()"
              >
                <!-- Dot on line -->
                <div 
                  class="absolute left-1/2 top-[-1rem] w-6 h-6 rounded-full transform -translate-x-1/2 z-10 flex items-center justify-center transition-colors duration-300"
                  [class.bg-primary]="i === currentIndex()"
                  [class.border-4]="i === currentIndex()"
                  [class.border-background]="i === currentIndex()"
                  [class.shadow-sm]="i === currentIndex()"
                  [class.border-2]="i !== currentIndex()"
                  [class.border-muted-foreground/30]="i !== currentIndex()"
                  [class.bg-background]="i !== currentIndex()"
                ></div>

                <!-- Card -->
                <div 
                  class="overflow-hidden transition-all duration-300 bg-card border rounded-lg"
                  [class.border-primary/20]="i === currentIndex()"
                  [class.shadow-xl]="i === currentIndex()"
                  [class.border-border/50]="i !== currentIndex()"
                  [class.opacity-60]="i !== currentIndex()"
                >
                  <div 
                    class="p-6 flex flex-col items-center text-center"
                    [class.cursor-pointer]="i === currentIndex()"
                    (click)="toggleExpand(i)"
                  >
                    <!-- Badge -->
                    <span 
                      class="mb-3 font-mono px-2 py-0.5 rounded text-xs"
                      [style.background-color]="item.color ? item.color + '20' : 'var(--secondary)'"
                      [style.color]="item.color || 'inherit'"
                    >
                      <ng-icon name="lucideCalendar" class="w-3.5 h-3.5 mr-1 inline"></ng-icon>
                      {{ item.year }}
                    </span>

                    <h3 class="text-xl font-bold tracking-tight mb-1">{{ item.periodLabel }}</h3>
                    <p class="text-sm text-muted-foreground font-medium">{{ item.subLabel }}</p>

                    <!-- Status -->
                    <div class="flex items-center text-xs text-muted-foreground mt-3 bg-muted/50 px-2 py-1 rounded-full">
                      <ng-container *ngIf="item.isChecked">
                        <ng-icon name="lucideCheckCircle" class="w-3 h-3 mr-1 text-green-500"></ng-icon>
                        <span>Completed</span>
                      </ng-container>
                      <ng-container *ngIf="!item.isChecked">
                        <ng-icon name="lucideClock" class="w-3 h-3 mr-1 text-blue-500"></ng-icon>
                        <span>Upcoming</span>
                      </ng-container>
                    </div>

                    <!-- Expand Indicator -->
                    <div *ngIf="item.events.length > 0" class="mt-3 transition-transform" [class.rotate-180]="expandedIndex() === i">
                      <ng-icon name="lucideChevronDown" class="w-4 h-4 text-muted-foreground"></ng-icon>
                    </div>

                    <!-- Jump Button -->
                    <button 
                      *ngIf="i === currentIndex()"
                      (click)="jumpToYear($event, item.year)"
                      class="mt-4 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-md transition-colors"
                    >
                      Go to Year
                    </button>
                  </div>

                  <!-- Expanded Content -->
                  <div *ngIf="expandedIndex() === i && i === currentIndex()" class="overflow-y-auto bg-muted/10 border-t max-h-32 p-4">
                    <ul class="space-y-3">
                      <li *ngFor="let event of item.events" class="flex items-start text-left group">
                        <div class="mt-1 mr-2.5">
                          <div class="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                        </div>
                        <span class="text-sm leading-snug text-muted-foreground group-hover:text-foreground transition-colors">
                          {{ event.title }}
                        </span>
                      </li>
                      <li *ngIf="item.events.length === 0" class="text-xs text-center text-muted-foreground py-2 italic">
                        No specific events recorded
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Navigation Dots -->
        <div class="flex justify-center mt-4 gap-1.5">
          <button 
            *ngFor="let item of timelineEvents(); let i = index"
            (click)="goToSlide(i)"
            class="transition-all duration-300 rounded-full"
            [class.w-8]="i === currentIndex()"
            [class.h-1.5]="true"
            [class.bg-primary]="i === currentIndex()"
            [class.w-1.5]="i !== currentIndex()"
            [class.bg-muted-foreground/30]="i !== currentIndex()"
            [class.hover:bg-primary/50]="i !== currentIndex()"
          ></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class TimelineBarComponent {
  @Input() scale: TimeScale = 'month';

  private calendarService = inject(CalendarService);
  readonly currentIndex = signal(0);
  readonly expandedIndex = signal<number | null>(null);

  readonly calendar = this.calendarService.calendar;
  readonly viewDate = this.calendarService.viewDate;
  readonly events = this.calendarService.events;
  readonly highlightedEventId = this.calendarService.highlightedEventId;

  readonly timelineEvents = computed(() => {
    const items: TimelineItem[] = [];
    const calendar = this.calendar();
    const events = this.events();
    const viewDate = this.viewDate();

    if (this.scale === 'month') {
      // Each event gets its own card
      const sortedEvents = [...events].sort((a, b) => {
        if (a.date.year !== b.date.year) return a.date.year - b.date.year;
        if (a.date.monthIndex !== b.date.monthIndex) return a.date.monthIndex - b.date.monthIndex;
        return a.date.dayIndex - b.date.dayIndex;
      });

      sortedEvents.forEach(e => {
        const monthName = calendar.months[e.date.monthIndex]?.name || `Month ${e.date.monthIndex + 1}`;
        const eventType = e.eventTypeId ? getEventTypeById(e.eventTypeId) : undefined;

        items.push({
          periodLabel: e.title,
          subLabel: `${monthName} ${e.date.dayIndex + 1}, ${formatYearWithEra(calendar, e.date.year)}`,
          year: e.date.year,
          monthIndex: e.date.monthIndex,
          dayIndex: e.date.dayIndex,
          events: [{ id: e.id, title: e.description || 'No description', isChecked: true }],
          isChecked: e.date.year < viewDate.year || (e.date.year === viewDate.year && e.date.monthIndex < viewDate.monthIndex),
          icon: eventType?.icon,
          color: e.color || eventType?.color
        });
      });

      // Add time markers
      calendar.timeMarkers.forEach(m => {
        items.push({
          periodLabel: m.name,
          subLabel: `Marker - ${formatYearWithEra(calendar, m.year)}`,
          year: m.year,
          events: [{ id: `marker-${m.year}`, title: m.description || 'Time marker', isChecked: true }],
          isChecked: m.year < viewDate.year
        });
      });
    } else {
      // Group by year
      const eventsByYear = new Map<number, CalendarEvent[]>();
      events.forEach(e => {
        const arr = eventsByYear.get(e.date.year) || [];
        arr.push(e);
        eventsByYear.set(e.date.year, arr);
      });

      const allYears = new Set([...eventsByYear.keys()]);
      if (allYears.size === 0) allYears.add(viewDate.year);

      const sortedYears = Array.from(allYears).sort((a, b) => a - b);

      sortedYears.forEach(year => {
        const yearEvents = eventsByYear.get(year) || [];
        const combinedEvents = yearEvents.map(e => ({ id: e.id, title: e.title, isChecked: true }));

        items.push({
          periodLabel: formatYearWithEra(calendar, year),
          subLabel: `${combinedEvents.length} Item${combinedEvents.length !== 1 ? 's' : ''}`,
          year,
          events: combinedEvents,
          isChecked: year < viewDate.year
        });
      });
    }

    return items.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.monthIndex !== undefined && b.monthIndex !== undefined) {
        if (a.monthIndex !== b.monthIndex) return a.monthIndex - b.monthIndex;
        if (a.dayIndex !== undefined && b.dayIndex !== undefined) return a.dayIndex - b.dayIndex;
      }
      return 0;
    });
  });

  constructor() {
    // Set initial index to closest to current view year
    effect(() => {
      const items = this.timelineEvents();
      const viewYear = this.viewDate().year;
      if (items.length > 0) {
        const index = items.findIndex(item => item.year >= viewYear);
        if (index !== -1) this.currentIndex.set(index);
        else this.currentIndex.set(items.length - 1);
      }
    });

    // Auto-scroll to highlighted event
    effect(() => {
      const highlightedId = this.highlightedEventId();
      const items = this.timelineEvents();
      if (!highlightedId || items.length === 0) return;

      const index = items.findIndex(item => item.events.some(e => e.id === highlightedId));
      if (index !== -1 && index !== this.currentIndex()) {
        this.currentIndex.set(index);
      }
    });
  }

  getCardTransform(index: number): string {
    const current = this.currentIndex();
    const offset = (index - current) * 320;
    return `translateX(${offset}px)`;
  }

  toggleExpand(index: number) {
    if (index === this.currentIndex()) {
      this.expandedIndex.update(v => v === index ? null : index);
    }
  }

  nextSlide() {
    const items = this.timelineEvents();
    this.currentIndex.update(prev => prev === items.length - 1 ? 0 : prev + 1);
    this.expandedIndex.set(null);
  }

  prevSlide() {
    const items = this.timelineEvents();
    this.currentIndex.update(prev => prev === 0 ? items.length - 1 : prev - 1);
    this.expandedIndex.set(null);
  }

  goToSlide(index: number) {
    this.currentIndex.set(index);
    this.expandedIndex.set(null);
  }

  jumpToYear(e: MouseEvent, year: number) {
    e.stopPropagation();
    this.calendarService.goToYear(year);
  }
}
