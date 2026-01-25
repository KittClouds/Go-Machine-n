import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { LucideAngularModule, Plus, Trash2, ChevronRight, ChevronDown, User, MapPin, Users, Package, Shield, Calendar, Lightbulb, Sparkles, Globe } from 'lucide-angular';
import { smartGraphRegistry } from '../../../../lib/registry';
import type { RegisteredEntity } from '../../../../lib/registry';
import { GraphDetailComponent } from './graph-detail/graph-detail.component';
import { EntityCreatorDialogComponent, EntityCreatorData } from './entity-creator-dialog/entity-creator-dialog.component';

// Entity styling
const ENTITY_COLORS: Record<string, string> = {
    'CHARACTER': '#a855f7',
    'LOCATION': '#22c55e',
    'NPC': '#f59e0b',
    'ITEM': '#eab308',
    'FACTION': '#ef4444',
    'EVENT': '#3b82f6',
    'CONCEPT': '#8b5cf6',
    'OBJECT': '#6366f1',
    'LORE': '#06b6d4',
    'SPECIES': '#ec4899',
};

const ENTITY_ICONS: Record<string, any> = {
    'CHARACTER': User,
    'LOCATION': MapPin,
    'NPC': Users,
    'ITEM': Package,
    'FACTION': Shield,
    'EVENT': Calendar,
    'CONCEPT': Lightbulb,
};

interface EntityGroup {
    kind: string;
    entities: RegisteredEntity[];
    expanded: boolean;
}

@Component({
    selector: 'app-graph-tab',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ScrollingModule,
        ButtonModule,
        TooltipModule,
        LucideAngularModule,
        GraphDetailComponent,
        EntityCreatorDialogComponent,
    ],
    templateUrl: './graph-tab.component.html',
    styleUrl: './graph-tab.component.css'
})
export class GraphTabComponent implements OnInit {
    // Icons
    PlusIcon = Plus;
    Trash2Icon = Trash2;
    ChevronRightIcon = ChevronRight;
    ChevronDownIcon = ChevronDown;
    GlobeIcon = Globe;

    // State
    entities = signal<RegisteredEntity[]>([]);
    selectedEntity = signal<RegisteredEntity | null>(null);
    expandedKinds = signal<Set<string>>(new Set());
    isCreatorOpen = signal(false);
    editingEntity = signal<EntityCreatorData | undefined>(undefined);

    // Computed: Group entities by kind
    groupedEntities = computed<EntityGroup[]>(() => {
        const groups: Record<string, RegisteredEntity[]> = {};
        for (const entity of this.entities()) {
            if (!groups[entity.kind]) {
                groups[entity.kind] = [];
            }
            groups[entity.kind].push(entity);
        }

        const expanded = this.expandedKinds();
        return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([kind, entities]) => ({
                kind,
                entities: entities.sort((a, b) => a.label.localeCompare(b.label)),
                expanded: expanded.has(kind),
            }));
    });

    totalEntities = computed(() => this.entities().length);

    ngOnInit() {
        this.refreshEntities();
        // Expand all groups by default
        const allKinds = new Set(this.entities().map(e => e.kind));
        this.expandedKinds.set(allKinds);

        if (typeof window !== 'undefined') {
            window.addEventListener('entities-changed', () => this.refreshEntities());
        }
    }

    refreshEntities() {
        const allEntities = smartGraphRegistry.getAllEntities();
        this.entities.set(allEntities);

        // Expand any new kinds
        const newKinds = new Set(allEntities.map(e => e.kind));
        this.expandedKinds.update(current => new Set([...current, ...newKinds]));
    }

    toggleKind(kind: string) {
        this.expandedKinds.update(current => {
            const next = new Set(current);
            if (next.has(kind)) {
                next.delete(kind);
            } else {
                next.add(kind);
            }
            return next;
        });
    }

    selectEntity(entity: RegisteredEntity) {
        this.selectedEntity.set(entity);
    }

    openCreator() {
        this.editingEntity.set(undefined);
        this.isCreatorOpen.set(true);
    }

    editEntity(entity: RegisteredEntity, event: MouseEvent) {
        event.stopPropagation();
        this.editingEntity.set({
            id: entity.id,
            label: entity.label,
            kind: entity.kind,
            aliases: entity.aliases || [],
        });
        this.isCreatorOpen.set(true);
    }

    async deleteEntity(entity: RegisteredEntity, event: MouseEvent) {
        event.stopPropagation();
        await smartGraphRegistry.deleteEntity(entity.id);
        this.refreshEntities();
        if (this.selectedEntity()?.id === entity.id) {
            this.selectedEntity.set(null);
        }
    }

    async onSaveEntity(data: EntityCreatorData) {
        if (data.id) {
            // Editing
            await smartGraphRegistry.updateEntity(data.id, {
                label: data.label,
                kind: data.kind as any,
                aliases: data.aliases,
            });
        } else {
            // Creating
            await smartGraphRegistry.registerEntity(
                data.label,
                data.kind as any,
                'manual',
                { source: 'user', aliases: data.aliases }
            );
        }
        this.refreshEntities();
    }

    async flushRegistry() {
        if (confirm(`Delete all ${this.totalEntities()} entities? This cannot be undone.`)) {
            await smartGraphRegistry.clearAll();
            this.refreshEntities();
            this.selectedEntity.set(null);
        }
    }

    getColor(kind: string): string {
        return ENTITY_COLORS[kind] || '#6b7280';
    }

    getIcon(kind: string): any {
        return ENTITY_ICONS[kind] || Sparkles;
    }
}
