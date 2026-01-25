import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CalendarService } from '../../services/calendar.service';
import { FantasyCalendarGridComponent } from '../../components/fantasy-calendar/calendar-grid/calendar-grid.component';
import { CalendarSidebarComponent } from '../../components/fantasy-calendar/calendar-sidebar/calendar-sidebar.component';
import { CalendarWizardComponent } from '../../components/fantasy-calendar/calendar-wizard/calendar-wizard.component';
import { TimelineBarComponent } from '../../components/fantasy-calendar/timeline-bar/timeline-bar.component';
import { NarrativeEditorComponent } from '../../components/fantasy-calendar/narrative-editor/narrative-editor.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarDays, lucideWand2, lucideLayers, lucideTable } from '@ng-icons/lucide';

type ViewMode = 'wizard' | 'calendar' | 'timeline' | 'kanban';

@Component({
  selector: 'app-fantasy-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    FantasyCalendarGridComponent,
    CalendarSidebarComponent,
    CalendarWizardComponent,
    TimelineBarComponent,
    NarrativeEditorComponent
  ],
  providers: [provideIcons({ lucideCalendarDays, lucideWand2, lucideLayers, lucideTable })],
  template: `
    <div class="h-full flex flex-col bg-background">
      <!-- Top Nav Tabs -->
      <div class="flex items-center gap-4 px-6 py-3 border-b bg-card">
        <h1 class="text-lg font-semibold">Fantasy Calendar</h1>
        <div class="flex-1"></div>
        <div class="flex gap-1">
          <button 
            *ngFor="let mode of modes"
            (click)="viewMode.set(mode.id)"
            class="px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors"
            [class.bg-primary]="viewMode() === mode.id"
            [class.text-primary-foreground]="viewMode() === mode.id"
            [class.hover:bg-muted]="viewMode() !== mode.id"
            >
            <ng-icon [name]="mode.icon" class="w-4 h-4"></ng-icon>
            {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden">
        <!-- Wizard View -->
        <div *ngIf="viewMode() === 'wizard'" class="h-full overflow-y-auto">
          <app-calendar-wizard (onComplete)="onWizardComplete()"></app-calendar-wizard>
        </div>

        <!-- Calendar View (Grid + Sidebar) -->
        <div *ngIf="viewMode() === 'calendar'" class="h-full flex">
          <app-calendar-sidebar 
            (onBackToEditor)="navigateToEditor()"
          ></app-calendar-sidebar>
          <div class="flex-1 overflow-y-auto p-4">
            <app-fantasy-calendar-grid></app-fantasy-calendar-grid>
          </div>
        </div>

        <!-- Timeline View -->
        <div *ngIf="viewMode() === 'timeline'" class="h-full overflow-y-auto">
          <app-timeline-bar [scale]="'month'"></app-timeline-bar>
        </div>

        <!-- Kanban View -->
        <div *ngIf="viewMode() === 'kanban'" class="h-full overflow-y-auto">
          <app-narrative-editor></app-narrative-editor>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class FantasyCalendarPageComponent {
  private router = inject(Router);
  readonly viewMode = signal<ViewMode>('calendar');

  readonly modes: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'wizard', label: 'Setup', icon: 'lucideWand2' },
    { id: 'calendar', label: 'Calendar', icon: 'lucideCalendarDays' },
    { id: 'timeline', label: 'Timeline', icon: 'lucideLayers' },
    { id: 'kanban', label: 'Kanban', icon: 'lucideTable' },
  ];

  constructor() {
    // Could auto-switch to wizard if no calendar is configured
  }

  onWizardComplete() {
    this.viewMode.set('calendar');
  }

  navigateToEditor() {
    this.router.navigate(['/']);
  }
}
