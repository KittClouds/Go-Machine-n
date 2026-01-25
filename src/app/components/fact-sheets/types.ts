/**
 * Fact Sheet Types
 * Core type definitions for entity fact sheets
 */

// Entity Kinds (matches React reference)
export type EntityKind =
    | 'CHARACTER'
    | 'LOCATION'
    | 'ITEM'
    | 'FACTION'
    | 'EVENT'
    | 'CONCEPT'
    | 'NPC'
    | 'SCENE';

// Field types supported by editable components
export type FieldType =
    | 'text'
    | 'number'
    | 'array'
    | 'dropdown'
    | 'progress'
    | 'stat-grid'
    | 'relationship'
    | 'date'
    | 'tags'
    | 'rich-text'
    | 'toggle';

// Schema for a single field
export interface FieldSchema {
    name: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    multiline?: boolean;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: any;
    options?: string[];
    unit?: string;
    // For progress bars
    currentField?: string;
    maxField?: string;
    color?: string;
    // For stat-grid
    stats?: Array<{ name: string; label: string; abbr: string }>;
    // For arrays
    itemType?: string;
    addButtonText?: string;
}

// Schema for a card (accordion section)
export interface CardSchema {
    id: string;
    title: string;
    icon: string; // Lucide icon name
    gradient: string; // Tailwind gradient classes
    fields: FieldSchema[];
}

// Full schema for an entity kind
export interface EntityFactSheetSchema {
    entityKind: EntityKind;
    cards: CardSchema[];
}

// Runtime entity data
export interface ParsedEntity {
    kind: EntityKind;
    label: string;
    subtype?: string;
    noteId?: string;
    attributes: Record<string, any>;
}

// Entity attributes (key-value storage)
export type EntityAttributes = Record<string, any>;

// Gradient presets for cards
export const CARD_GRADIENTS = {
    identity: 'from-blue-500 to-cyan-500',
    progression: 'from-pink-500 to-rose-500',
    attributes: 'from-purple-500 to-violet-500',
    abilities: 'from-amber-500 to-orange-500',
    inventory: 'from-emerald-500 to-teal-500',
    relationships: 'from-red-500 to-pink-500',
    notes: 'from-slate-500 to-gray-500',
} as const;
