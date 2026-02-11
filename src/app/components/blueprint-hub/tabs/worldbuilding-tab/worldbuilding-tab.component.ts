
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { getSetting, setSetting } from '../../../../lib/dexie/settings.service';


// Domain Components
import { WorldOverviewComponent } from './tabs/world-overview.component';
import { GeographyComponent } from './tabs/geography.component';
import { CulturesComponent } from './tabs/cultures.component'; // Updated
import { MagicSystemComponent } from './tabs/magic-system.component';
import { ReligionComponent } from './tabs/religion.component';
import { PoliticsComponent } from './tabs/politics.component';

import { MysteryComponent } from './tabs/mystery.component';

type WorldbuildingTabId = 'overview' | 'geography' | 'culture' | 'magic' | 'religion' | 'politics' | 'mystery';

interface TabDef {
    id: WorldbuildingTabId;
    label: string;
    icon: string; // PrimeIcons class
}

const STORAGE_KEY = 'kittclouds-worldbuilding-tab';

@Component({
    selector: 'app-worldbuilding-tab',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        WorldOverviewComponent,
        GeographyComponent,
        CulturesComponent, // Updated
        MagicSystemComponent,
        ReligionComponent,
        PoliticsComponent,
        MysteryComponent
    ],
    templateUrl: './worldbuilding-tab.component.html',
    styles: [`
        :host { display: block; height: 100%; }
    `]
})
export class WorldbuildingTabComponent implements OnInit {
    // Tab Definitions
    tabs: TabDef[] = [
        { id: 'overview', label: 'Overview', icon: 'pi pi-globe' },
        { id: 'geography', label: 'Geography', icon: 'pi pi-map' },
        { id: 'culture', label: 'Cultures', icon: 'pi pi-users' }, // Label updated slightly
        { id: 'magic', label: 'Magic', icon: 'pi pi-bolt' },
        { id: 'religion', label: 'Religion', icon: 'pi pi-book' },
        { id: 'politics', label: 'Politics', icon: 'pi pi-sitemap' },
        { id: 'mystery', label: 'Mystery', icon: 'pi pi-question-circle' },
    ];

    // Local state with Dexie settings persistence
    private _activeTabId = signal<WorldbuildingTabId>(this.loadFromStorage());

    activeTabId = computed(() => this._activeTabId());

    constructor() { }

    ngOnInit() {
        // State persisted to Dexie settings
    }

    private loadFromStorage(): WorldbuildingTabId {
        const stored = getSetting<WorldbuildingTabId | null>(STORAGE_KEY, null);
        if (stored && this.tabs.some(t => t.id === stored)) return stored;
        return 'overview';
    }

    setActiveTab(id: WorldbuildingTabId) {
        this._activeTabId.set(id);
        setSetting(STORAGE_KEY, id);
    }
}
