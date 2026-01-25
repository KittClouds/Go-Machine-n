import { Component, EventEmitter, Output, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideOrbit, lucideCalendarDays, lucideSave, lucideWand2, lucidePlus,
  lucideTrash2, lucideSparkles, lucideRotateCcw, lucideClock, lucideLoader2
} from '@ng-icons/lucide';
import { CalendarService, CalendarConfig } from '../../../services/calendar.service';
import { OrbitalMechanics, StarType, EraDefinition, TimeMarker } from '../../../lib/fantasy-calendar/types';
import { generateOrbitalCalendar, getStarDefaults } from '../../../lib/fantasy-calendar/orbital';
import { generateUUID } from '../../../lib/fantasy-calendar/utils';

function generateDefaultDayNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Day ${i + 1}`);
}

function generateDefaultMonthNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Month ${i + 1}`);
}

@Component({
  selector: 'app-calendar-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [provideIcons({
    lucideOrbit, lucideCalendarDays, lucideSave, lucideWand2, lucidePlus,
    lucideTrash2, lucideSparkles, lucideRotateCcw, lucideClock, lucideLoader2
  })],
  template: `
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          World Genesis
        </h1>
        <p class="text-muted-foreground">Design the celestial mechanics of your world, or just pick the numbers.</p>
      </div>

      <!-- Mode Tabs -->
      <div class="flex border-b">
        <button 
          (click)="mode.set('simulation')"
          class="flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
          [class.border-primary]="mode() === 'simulation'"
          [class.text-primary]="mode() === 'simulation'"
          [class.border-transparent]="mode() !== 'simulation'"
          [class.text-muted-foreground]="mode() !== 'simulation'"
        >
          <ng-icon name="lucideOrbit" class="w-4 h-4"></ng-icon>
          Orbital Simulation
        </button>
        <button 
          (click)="mode.set('manual')"
          class="flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
          [class.border-primary]="mode() === 'manual'"
          [class.text-primary]="mode() === 'manual'"
          [class.border-transparent]="mode() !== 'manual'"
          [class.text-muted-foreground]="mode() !== 'manual'"
        >
          <ng-icon name="lucideCalendarDays" class="w-4 h-4"></ng-icon>
          Manual Configuration
        </button>
      </div>

      <!-- Content -->
      <div class="space-y-4">
        <!-- Calendar Identity Card -->
        <div class="card border-emerald-500/20">
          <div class="card-header flex items-center justify-between">
            <h3 class="font-medium">Calendar Identity</h3>
            <div class="flex gap-1">
              <button class="btn-outline text-xs" (click)="loadPreset('custom')">
                <ng-icon name="lucideRotateCcw" class="w-3 h-3 mr-1"></ng-icon> Custom
              </button>
              <button class="btn-outline text-xs" (click)="loadPreset('earth')">
                <ng-icon name="lucideSparkles" class="w-3 h-3 mr-1"></ng-icon> Earth
              </button>
              <button class="btn-outline text-xs" (click)="loadPreset('taldorei')">
                <ng-icon name="lucideSparkles" class="w-3 h-3 mr-1"></ng-icon> Tal'Dorei
              </button>
            </div>
          </div>
          <div class="card-content grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">Calendar Name</label>
              <input type="text" [(ngModel)]="calendarName" placeholder="My World Calendar" class="input-field" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">Starting Year</label>
              <input type="number" [(ngModel)]="startingYear" placeholder="1" class="input-field" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">Era Name</label>
              <input type="text" [(ngModel)]="eraName" placeholder="Common Era" class="input-field" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">Era Abbreviation</label>
              <input type="text" [(ngModel)]="eraAbbreviation" placeholder="CE" maxlength="4" class="input-field" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Weekday Editor -->
          <div class="card border-orange-500/20">
            <div class="card-header">
              <h3 class="font-medium">Weekday Names</h3>
              <span *ngIf="mode() === 'simulation'" class="text-xs bg-secondary px-2 py-0.5 rounded">
                Suggested: {{ computed().suggestedDaysPerWeek }} days/week
              </span>
            </div>
            <div class="card-content space-y-3">
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <label class="text-xs text-muted-foreground">Days per Week</label>
                  <span class="text-sm font-mono">{{ daysPerWeek }}</span>
                </div>
                <input type="range" [(ngModel)]="daysPerWeek" min="4" max="14" step="1" (ngModelChange)="onDaysPerWeekChange($event)" class="w-full" />
              </div>
              <div class="h-32 overflow-y-auto space-y-1 pr-2">
                <div *ngFor="let name of weekdayNames; let i = index" class="flex items-center gap-2">
                  <span class="w-5 text-xs text-muted-foreground">{{ i + 1 }}.</span>
                  <input type="text" [ngModel]="weekdayNames[i]" (ngModelChange)="updateWeekdayName(i, $event)" [placeholder]="'Day ' + (i + 1)" class="input-field h-7 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <!-- Month Editor -->
          <div class="card border-blue-500/20">
            <div class="card-header flex items-center justify-between">
              <h3 class="font-medium">Month Names</h3>
              <button class="btn-outline text-xs" (click)="addMonth()">
                <ng-icon name="lucidePlus" class="w-3 h-3 mr-1"></ng-icon> Add
              </button>
            </div>
            <div class="card-content">
              <div class="h-40 overflow-y-auto space-y-1 pr-2">
                <div *ngFor="let name of monthNames; let i = index" class="flex items-center gap-2">
                  <span class="w-5 text-xs text-muted-foreground">{{ i + 1 }}.</span>
                  <input type="text" [ngModel]="monthNames[i]" (ngModelChange)="updateMonthName(i, $event)" [placeholder]="'Month ' + (i + 1)" class="input-field h-7 text-sm flex-1" />
                  <button class="btn-icon-sm text-muted-foreground hover:text-destructive" (click)="removeMonth(i)" [disabled]="monthNames.length <= 1">
                    <ng-icon name="lucideTrash2" class="w-3 h-3"></ng-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Orbital Controls (Simulation Mode Only) -->
        <div *ngIf="mode() === 'simulation'" class="card border-purple-500/20 shadow-lg shadow-purple-900/10">
          <div class="card-header">
            <h3 class="font-medium flex items-center gap-2">
              <ng-icon name="lucideWand2" class="w-5 h-5 text-purple-400"></ng-icon>
              System Parameters
            </h3>
            <p class="text-xs text-muted-foreground">Orbital mechanics drive calendar structure</p>
          </div>
          <div class="card-content space-y-4">
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">Star Type</label>
              <select [(ngModel)]="orbital.starType" (ngModelChange)="updateStar($event)" class="input-field">
                <option value="red_dwarf">Red Dwarf (Small, Cool)</option>
                <option value="yellow_dwarf">Yellow Dwarf (Earth-like)</option>
                <option value="blue_giant">Blue Giant (Massive, Hot)</option>
                <option value="binary">Binary System (Two Stars)</option>
              </select>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <label class="text-xs text-muted-foreground">Orbital Distance</label>
                <span class="text-xs font-mono text-muted-foreground">{{ orbital.orbitalRadius.toFixed(2) }} AU</span>
              </div>
              <input type="range" [(ngModel)]="orbital.orbitalRadius" min="0.1" max="50" step="0.1" class="w-full" />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <label class="text-xs text-muted-foreground">Day Length</label>
                <span class="text-xs font-mono text-muted-foreground">{{ orbital.rotationPeriod.toFixed(1) }} hrs</span>
              </div>
              <input type="range" [(ngModel)]="orbital.rotationPeriod" min="4" max="72" step="0.5" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Results + Generate -->
        <div class="card bg-slate-950 border-slate-800">
          <div class="card-content pt-6">
            <div class="flex items-center justify-between mb-4" *ngIf="mode() === 'simulation'">
              <div class="grid grid-cols-3 gap-4 flex-1 text-center">
                <div>
                  <div class="text-2xl font-bold text-blue-400">{{ computed().daysPerYear }}</div>
                  <div class="text-xs text-slate-400">Days/Year</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-emerald-400">{{ daysPerWeek }}</div>
                  <div class="text-xs text-slate-400">Days/Week</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-purple-400">{{ monthNames.length }}</div>
                  <div class="text-xs text-slate-400">Months</div>
                </div>
              </div>
            </div>
            <button 
              class="w-full py-2.5 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
              [class.bg-purple-600]="mode() === 'simulation'"
              [class.hover:bg-purple-700]="mode() === 'simulation'"
              [class.bg-primary]="mode() === 'manual'"
              [class.hover:bg-primary/90]="mode() === 'manual'"
              [class.text-white]="true"
              (click)="handleComplete()"
              [disabled]="isGenerating()"
            >
              <ng-icon *ngIf="isGenerating()" name="lucideLoader2" class="w-4 h-4 animate-spin"></ng-icon>
              <ng-icon *ngIf="!isGenerating()" name="lucideSave" class="w-4 h-4"></ng-icon>
              {{ isGenerating() ? 'Constructing World Timeline...' : (mode() === 'simulation' ? 'Generate Calendar System' : 'Create Calendar') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .card { @apply bg-card border rounded-lg shadow-sm; }
    .card-header { @apply p-4 pb-2; }
    .card-content { @apply p-4 pt-2; }
    .input-field { @apply flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring; }
    .btn-outline { @apply px-2 py-1 border rounded hover:bg-muted transition-colors flex items-center; }
    .btn-icon-sm { @apply p-1 hover:bg-muted rounded transition-colors; }
  `]
})

export class CalendarWizardComponent {
  @Output() onComplete = new EventEmitter<void>();

  private calendarService = inject(CalendarService);
  readonly mode = signal<'simulation' | 'manual'>('simulation');
  readonly isGenerating = this.calendarService.isGenerating;

  // Form state
  calendarName = '';
  startingYear = 1;
  eraName = '';
  eraAbbreviation = '';

  // Orbital
  orbital: OrbitalMechanics = {
    starType: 'yellow_dwarf',
    starMass: 1.0,
    orbitalRadius: 1.0,
    axialTilt: 23.5,
    rotationPeriod: 24,
    orbitalPeriod: 365.25
  };

  // Weekdays/Months
  daysPerWeek = 7;
  weekdayNames: string[] = generateDefaultDayNames(7);
  monthNames: string[] = generateDefaultMonthNames(12);

  // Eras
  eras: EraDefinition[] = [
    { id: 'era_default', name: 'Common Era', abbreviation: 'CE', startYear: 1, direction: 'ascending' }
  ];
  hasYearZero = false;

  readonly computed = computed(() => generateOrbitalCalendar(this.orbital));

  constructor() {
    // Sync weekday count when orbital params change (simulation mode)
    effect(() => {
      if (this.mode() === 'simulation') {
        const suggested = this.computed().suggestedDaysPerWeek;
        if (suggested !== this.daysPerWeek) {
          this.daysPerWeek = suggested;
          this.weekdayNames = generateDefaultDayNames(suggested);
        }
      }
    });
  }

  updateStar(type: StarType) {
    const defaults = getStarDefaults(type);
    this.orbital = { ...this.orbital, starType: type, ...defaults };
  }

  updateWeekdayName(index: number, name: string) {
    this.weekdayNames = [...this.weekdayNames];
    this.weekdayNames[index] = name;
  }

  onDaysPerWeekChange(value: number) {
    const newCount = Math.max(4, Math.min(14, value));
    if (newCount > this.weekdayNames.length) {
      this.weekdayNames = [...this.weekdayNames, ...generateDefaultDayNames(newCount - this.weekdayNames.length).map((_, i) => `Day ${this.weekdayNames.length + i + 1}`)];
    } else {
      this.weekdayNames = this.weekdayNames.slice(0, newCount);
    }
  }

  updateMonthName(index: number, name: string) {
    this.monthNames = [...this.monthNames];
    this.monthNames[index] = name;
  }

  addMonth() {
    this.monthNames = [...this.monthNames, `Month ${this.monthNames.length + 1}`];
  }

  removeMonth(index: number) {
    if (this.monthNames.length <= 1) return;
    this.monthNames = this.monthNames.filter((_, i) => i !== index);
  }

  loadPreset(preset: 'earth' | 'taldorei' | 'custom') {
    if (preset === 'custom') {
      this.calendarName = '';
      this.startingYear = 1;
      this.eraName = '';
      this.eraAbbreviation = '';
      this.daysPerWeek = this.computed().suggestedDaysPerWeek;
      this.weekdayNames = generateDefaultDayNames(this.daysPerWeek);
      this.monthNames = generateDefaultMonthNames(12);
    } else if (preset === 'earth') {
      this.calendarName = 'Earth Calendar';
      this.startingYear = 1;
      this.daysPerWeek = 7;
      this.weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      this.monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      this.eraName = 'Common Era';
      this.eraAbbreviation = 'CE';
    } else if (preset === 'taldorei') {
      this.calendarName = "Tal'Dorei Calendar";
      this.startingYear = 835;
      this.daysPerWeek = 7;
      this.weekdayNames = ['Miresen', 'Grissen', 'Whelsen', 'Conthsen', 'Folsen', 'Yulisen', "Da'leysen"];
      this.monthNames = ['Horisal', 'Misuthar', 'Dualahei', 'Thunsheer', 'Unndilar', 'Brussendar', 'Sydenstar', 'Fessuran', "Quen'pillar", 'Cuersaar', 'Duscar'];
      this.eraName = 'Post-Divergence';
      this.eraAbbreviation = 'PD';
    }
  }

  async handleComplete() {
    const useOrbital = this.mode() === 'simulation';

    const config: CalendarConfig = {
      name: this.calendarName || 'New World Calendar',
      startingYear: this.startingYear || 1,
      eraName: this.eras[0]?.name || this.eraName || 'Common Era',
      eraAbbreviation: this.eras[0]?.abbreviation || this.eraAbbreviation || 'CE',
      monthNames: this.monthNames.filter(m => m.trim() !== ''),
      weekdayNames: this.weekdayNames.filter(w => w.trim() !== ''),
      orbitalMechanics: useOrbital ? this.orbital : undefined,
      eras: this.eras,
      hasYearZero: this.hasYearZero
    };

    await this.calendarService.createCalendar(config);
    this.onComplete.emit();
  }
}
