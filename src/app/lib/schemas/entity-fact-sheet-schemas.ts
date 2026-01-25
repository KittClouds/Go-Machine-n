// src/app/lib/schemas/entity-fact-sheet-schemas.ts
// Centralized fact sheet schemas for all entity types

import type { FactSheetCardSchema, FactSheetFieldSchema } from '../dexie/db';

// Helper to generate consistent IDs
const cardId = (kind: string, id: string) => `${kind}::${id}`;
const fieldId = (kind: string, cardId: string, name: string) => `${kind}::${cardId}::${name}`;

// =============================================================================
// ITEM SCHEMA
// =============================================================================

const ITEM_CARDS: FactSheetCardSchema[] = [
    { id: cardId('ITEM', 'properties'), entityKind: 'ITEM', cardId: 'properties', title: 'Properties', icon: 'Package', gradient: 'from-emerald-500 to-green-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('ITEM', 'effects'), entityKind: 'ITEM', cardId: 'effects', title: 'Effects & Abilities', icon: 'Sparkles', gradient: 'from-purple-500 to-violet-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('ITEM', 'requirements'), entityKind: 'ITEM', cardId: 'requirements', title: 'Requirements', icon: 'Shield', gradient: 'from-amber-500 to-orange-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('ITEM', 'history'), entityKind: 'ITEM', cardId: 'history', title: 'History & Lore', icon: 'History', gradient: 'from-slate-500 to-gray-500', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('ITEM', 'value'), entityKind: 'ITEM', cardId: 'value', title: 'Value & Trade', icon: 'Coins', gradient: 'from-yellow-500 to-amber-500', displayOrder: 4, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const ITEM_FIELDS: FactSheetFieldSchema[] = [
    // Properties
    { id: fieldId('ITEM', 'properties', 'name'), entityKind: 'ITEM', cardId: 'properties', fieldName: 'name', fieldType: 'text', label: 'Item Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'properties', 'type'), entityKind: 'ITEM', cardId: 'properties', fieldName: 'type', fieldType: 'dropdown', label: 'Type', options: JSON.stringify(['Weapon', 'Armor', 'Artifact', 'Consumable', 'Tool', 'Key', 'Treasure', 'Material', 'Misc']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'properties', 'rarity'), entityKind: 'ITEM', cardId: 'properties', fieldName: 'rarity', fieldType: 'dropdown', label: 'Rarity', options: JSON.stringify(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Unique']), displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'properties', 'description'), entityKind: 'ITEM', cardId: 'properties', fieldName: 'description', fieldType: 'text', label: 'Description', placeholder: 'Describe this item...', multiline: true, displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'properties', 'weight'), entityKind: 'ITEM', cardId: 'properties', fieldName: 'weight', fieldType: 'number', label: 'Weight', min: 0, unit: 'lbs', displayOrder: 4, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'properties', 'material'), entityKind: 'ITEM', cardId: 'properties', fieldName: 'material', fieldType: 'text', label: 'Material', placeholder: 'What is it made of...', displayOrder: 5, isSystem: true, createdAt: 0, updatedAt: 0 },
    // Effects
    { id: fieldId('ITEM', 'effects', 'magicProperties'), entityKind: 'ITEM', cardId: 'effects', fieldName: 'magicProperties', fieldType: 'array', label: 'Magic Properties', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'effects', 'damage'), entityKind: 'ITEM', cardId: 'effects', fieldName: 'damage', fieldType: 'text', label: 'Damage', placeholder: 'e.g., 1d8 slashing', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'effects', 'bonuses'), entityKind: 'ITEM', cardId: 'effects', fieldName: 'bonuses', fieldType: 'array', label: 'Bonuses', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'effects', 'abilities'), entityKind: 'ITEM', cardId: 'effects', fieldName: 'abilities', fieldType: 'array', label: 'Special Abilities', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'effects', 'charges'), entityKind: 'ITEM', cardId: 'effects', fieldName: 'charges', fieldType: 'progress', label: 'Charges', currentField: 'chargesCurrent', maxField: 'chargesMax', color: '#8b5cf6', displayOrder: 4, isSystem: true, createdAt: 0, updatedAt: 0 },
    // Requirements
    { id: fieldId('ITEM', 'requirements', 'attunement'), entityKind: 'ITEM', cardId: 'requirements', fieldName: 'attunement', fieldType: 'dropdown', label: 'Attunement', options: JSON.stringify(['None', 'Required', 'Required by Spellcaster', 'Required by Class']), displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'requirements', 'prerequisites'), entityKind: 'ITEM', cardId: 'requirements', fieldName: 'prerequisites', fieldType: 'array', label: 'Prerequisites', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    // History
    { id: fieldId('ITEM', 'history', 'origin'), entityKind: 'ITEM', cardId: 'history', fieldName: 'origin', fieldType: 'text', label: 'Origin', placeholder: 'Where did it come from...', multiline: true, displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'history', 'creator'), entityKind: 'ITEM', cardId: 'history', fieldName: 'creator', fieldType: 'text', label: 'Creator', placeholder: 'Who made it...', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'history', 'currentOwner'), entityKind: 'ITEM', cardId: 'history', fieldName: 'currentOwner', fieldType: 'text', label: 'Current Owner', placeholder: 'Who has it now...', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    // Value
    { id: fieldId('ITEM', 'value', 'baseValue'), entityKind: 'ITEM', cardId: 'value', fieldName: 'baseValue', fieldType: 'number', label: 'Base Value', min: 0, unit: 'gp', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('ITEM', 'value', 'availability'), entityKind: 'ITEM', cardId: 'value', fieldName: 'availability', fieldType: 'dropdown', label: 'Availability', options: JSON.stringify(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// LOCATION SCHEMA
// =============================================================================

const LOCATION_CARDS: FactSheetCardSchema[] = [
    { id: cardId('LOCATION', 'overview'), entityKind: 'LOCATION', cardId: 'overview', title: 'Overview', icon: 'MapPin', gradient: 'from-blue-500 to-indigo-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('LOCATION', 'geography'), entityKind: 'LOCATION', cardId: 'geography', title: 'Geography & Climate', icon: 'Mountain', gradient: 'from-emerald-500 to-green-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('LOCATION', 'population'), entityKind: 'LOCATION', cardId: 'population', title: 'Population & Culture', icon: 'Users', gradient: 'from-amber-500 to-yellow-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('LOCATION', 'pointsOfInterest'), entityKind: 'LOCATION', cardId: 'pointsOfInterest', title: 'Points of Interest', icon: 'Compass', gradient: 'from-purple-500 to-pink-500', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('LOCATION', 'history'), entityKind: 'LOCATION', cardId: 'history', title: 'History & Lore', icon: 'History', gradient: 'from-slate-500 to-gray-500', displayOrder: 4, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const LOCATION_FIELDS: FactSheetFieldSchema[] = [
    // Overview
    { id: fieldId('LOCATION', 'overview', 'name'), entityKind: 'LOCATION', cardId: 'overview', fieldName: 'name', fieldType: 'text', label: 'Location Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'overview', 'type'), entityKind: 'LOCATION', cardId: 'overview', fieldName: 'type', fieldType: 'dropdown', label: 'Type', options: JSON.stringify(['Continent', 'Country', 'City', 'Town', 'Village', 'Landmark', 'Building', 'Dungeon', 'Wilderness']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'overview', 'description'), entityKind: 'LOCATION', cardId: 'overview', fieldName: 'description', fieldType: 'text', label: 'Description', placeholder: 'Describe this place...', multiline: true, displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'overview', 'aliases'), entityKind: 'LOCATION', cardId: 'overview', fieldName: 'aliases', fieldType: 'array', label: 'Aliases', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    // Geography
    { id: fieldId('LOCATION', 'geography', 'terrain'), entityKind: 'LOCATION', cardId: 'geography', fieldName: 'terrain', fieldType: 'text', label: 'Terrain', placeholder: 'Click to add terrain...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'geography', 'climate'), entityKind: 'LOCATION', cardId: 'geography', fieldName: 'climate', fieldType: 'dropdown', label: 'Climate', options: JSON.stringify(['Tropical', 'Arid', 'Temperate', 'Continental', 'Polar', 'Mediterranean', 'Magical']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'geography', 'resources'), entityKind: 'LOCATION', cardId: 'geography', fieldName: 'resources', fieldType: 'array', label: 'Natural Resources', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'geography', 'hazards'), entityKind: 'LOCATION', cardId: 'geography', fieldName: 'hazards', fieldType: 'array', label: 'Hazards', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    // Population
    { id: fieldId('LOCATION', 'population', 'population'), entityKind: 'LOCATION', cardId: 'population', fieldName: 'population', fieldType: 'number', label: 'Population', min: 0, displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'population', 'government'), entityKind: 'LOCATION', cardId: 'population', fieldName: 'government', fieldType: 'text', label: 'Government', placeholder: 'How is it ruled...', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'population', 'ruler'), entityKind: 'LOCATION', cardId: 'population', fieldName: 'ruler', fieldType: 'text', label: 'Ruler/Leader', placeholder: 'Who rules here...', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'population', 'languages'), entityKind: 'LOCATION', cardId: 'population', fieldName: 'languages', fieldType: 'array', label: 'Languages', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    // Points of Interest
    { id: fieldId('LOCATION', 'pointsOfInterest', 'landmarks'), entityKind: 'LOCATION', cardId: 'pointsOfInterest', fieldName: 'landmarks', fieldType: 'array', label: 'Landmarks', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'pointsOfInterest', 'shops'), entityKind: 'LOCATION', cardId: 'pointsOfInterest', fieldName: 'shops', fieldType: 'array', label: 'Shops & Services', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'pointsOfInterest', 'secrets'), entityKind: 'LOCATION', cardId: 'pointsOfInterest', fieldName: 'secrets', fieldType: 'array', label: 'Hidden Secrets', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    // History
    { id: fieldId('LOCATION', 'history', 'founded'), entityKind: 'LOCATION', cardId: 'history', fieldName: 'founded', fieldType: 'text', label: 'Founded', placeholder: 'When was it established...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'history', 'history'), entityKind: 'LOCATION', cardId: 'history', fieldName: 'history', fieldType: 'text', label: 'History', placeholder: 'Major historical events...', multiline: true, displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('LOCATION', 'history', 'legends'), entityKind: 'LOCATION', cardId: 'history', fieldName: 'legends', fieldType: 'array', label: 'Legends', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// CONCEPT SCHEMA
// =============================================================================

const CONCEPT_CARDS: FactSheetCardSchema[] = [
    { id: cardId('CONCEPT', 'definition'), entityKind: 'CONCEPT', cardId: 'definition', title: 'Definition', icon: 'Lightbulb', gradient: 'from-indigo-500 to-purple-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('CONCEPT', 'applications'), entityKind: 'CONCEPT', cardId: 'applications', title: 'Applications & Rules', icon: 'Wand2', gradient: 'from-purple-500 to-pink-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('CONCEPT', 'history'), entityKind: 'CONCEPT', cardId: 'history', title: 'History & Origin', icon: 'History', gradient: 'from-amber-500 to-orange-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const CONCEPT_FIELDS: FactSheetFieldSchema[] = [
    { id: fieldId('CONCEPT', 'definition', 'name'), entityKind: 'CONCEPT', cardId: 'definition', fieldName: 'name', fieldType: 'text', label: 'Concept Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'definition', 'type'), entityKind: 'CONCEPT', cardId: 'definition', fieldName: 'type', fieldType: 'dropdown', label: 'Type', options: JSON.stringify(['Magic System', 'Prophecy', 'Curse', 'Law', 'Custom', 'Legend', 'Religion', 'Philosophy', 'Technology', 'Other']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'definition', 'description'), entityKind: 'CONCEPT', cardId: 'definition', fieldName: 'description', fieldType: 'text', label: 'Description', placeholder: 'Explain this concept...', multiline: true, displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'definition', 'aliases'), entityKind: 'CONCEPT', cardId: 'definition', fieldName: 'aliases', fieldType: 'array', label: 'Aliases', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'applications', 'rules'), entityKind: 'CONCEPT', cardId: 'applications', fieldName: 'rules', fieldType: 'array', label: 'Rules', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'applications', 'limitations'), entityKind: 'CONCEPT', cardId: 'applications', fieldName: 'limitations', fieldType: 'array', label: 'Limitations', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'applications', 'commonUses'), entityKind: 'CONCEPT', cardId: 'applications', fieldName: 'commonUses', fieldType: 'text', label: 'Common Uses', placeholder: 'How is it typically used...', multiline: true, displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'history', 'origin'), entityKind: 'CONCEPT', cardId: 'history', fieldName: 'origin', fieldType: 'text', label: 'Origin', placeholder: 'Where did it come from...', multiline: true, displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('CONCEPT', 'history', 'discoverer'), entityKind: 'CONCEPT', cardId: 'history', fieldName: 'discoverer', fieldType: 'text', label: 'Discoverer/Creator', placeholder: 'Who found or created it...', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// EVENT SCHEMA
// =============================================================================

const EVENT_CARDS: FactSheetCardSchema[] = [
    { id: cardId('EVENT', 'overview'), entityKind: 'EVENT', cardId: 'overview', title: 'Overview', icon: 'Calendar', gradient: 'from-teal-500 to-cyan-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('EVENT', 'participants'), entityKind: 'EVENT', cardId: 'participants', title: 'Participants', icon: 'Users', gradient: 'from-purple-500 to-violet-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('EVENT', 'consequences'), entityKind: 'EVENT', cardId: 'consequences', title: 'Consequences', icon: 'Zap', gradient: 'from-red-500 to-orange-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('EVENT', 'timeline'), entityKind: 'EVENT', cardId: 'timeline', title: 'Timeline', icon: 'Clock', gradient: 'from-blue-500 to-indigo-500', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const EVENT_FIELDS: FactSheetFieldSchema[] = [
    { id: fieldId('EVENT', 'overview', 'name'), entityKind: 'EVENT', cardId: 'overview', fieldName: 'name', fieldType: 'text', label: 'Event Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'overview', 'type'), entityKind: 'EVENT', cardId: 'overview', fieldName: 'type', fieldType: 'dropdown', label: 'Type', options: JSON.stringify(['Battle', 'Ceremony', 'Discovery', 'Betrayal', 'Meeting', 'Death', 'Birth', 'Treaty', 'Disaster', 'Other']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'overview', 'description'), entityKind: 'EVENT', cardId: 'overview', fieldName: 'description', fieldType: 'text', label: 'Description', placeholder: 'What happened...', multiline: true, displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'overview', 'significance'), entityKind: 'EVENT', cardId: 'overview', fieldName: 'significance', fieldType: 'dropdown', label: 'Significance', options: JSON.stringify(['Minor', 'Moderate', 'Major', 'World-Changing', 'Legendary']), displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'participants', 'keyFigures'), entityKind: 'EVENT', cardId: 'participants', fieldName: 'keyFigures', fieldType: 'array', label: 'Key Figures', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'participants', 'factions'), entityKind: 'EVENT', cardId: 'participants', fieldName: 'factions', fieldType: 'array', label: 'Factions Involved', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'consequences', 'immediateEffects'), entityKind: 'EVENT', cardId: 'consequences', fieldName: 'immediateEffects', fieldType: 'array', label: 'Immediate Effects', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'consequences', 'longTermEffects'), entityKind: 'EVENT', cardId: 'consequences', fieldName: 'longTermEffects', fieldType: 'array', label: 'Long-Term Effects', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'timeline', 'date'), entityKind: 'EVENT', cardId: 'timeline', fieldName: 'date', fieldType: 'text', label: 'Date', placeholder: 'When did it occur...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('EVENT', 'timeline', 'location'), entityKind: 'EVENT', cardId: 'timeline', fieldName: 'location', fieldType: 'text', label: 'Location', placeholder: 'Where did it happen...', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// FACTION SCHEMA
// =============================================================================

const FACTION_CARDS: FactSheetCardSchema[] = [
    { id: cardId('FACTION', 'identity'), entityKind: 'FACTION', cardId: 'identity', title: 'Identity', icon: 'Shield', gradient: 'from-red-500 to-rose-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('FACTION', 'leadership'), entityKind: 'FACTION', cardId: 'leadership', title: 'Leadership', icon: 'Crown', gradient: 'from-amber-500 to-yellow-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('FACTION', 'resources'), entityKind: 'FACTION', cardId: 'resources', title: 'Resources & Power', icon: 'Coins', gradient: 'from-emerald-500 to-green-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('FACTION', 'goals'), entityKind: 'FACTION', cardId: 'goals', title: 'Goals & Methods', icon: 'Target', gradient: 'from-purple-500 to-pink-500', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const FACTION_FIELDS: FactSheetFieldSchema[] = [
    { id: fieldId('FACTION', 'identity', 'name'), entityKind: 'FACTION', cardId: 'identity', fieldName: 'name', fieldType: 'text', label: 'Faction Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'identity', 'type'), entityKind: 'FACTION', cardId: 'identity', fieldName: 'type', fieldType: 'dropdown', label: 'Type', options: JSON.stringify(['Guild', 'Kingdom', 'Order', 'Cult', 'Tribe', 'Alliance', 'Corporation', 'Military', 'Religious', 'Criminal']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'identity', 'motto'), entityKind: 'FACTION', cardId: 'identity', fieldName: 'motto', fieldType: 'text', label: 'Motto/Creed', placeholder: 'Their guiding words...', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'identity', 'description'), entityKind: 'FACTION', cardId: 'identity', fieldName: 'description', fieldType: 'text', label: 'Description', placeholder: 'Describe this faction...', multiline: true, displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'leadership', 'leader'), entityKind: 'FACTION', cardId: 'leadership', fieldName: 'leader', fieldType: 'text', label: 'Leader', placeholder: 'Who leads them...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'leadership', 'hierarchy'), entityKind: 'FACTION', cardId: 'leadership', fieldName: 'hierarchy', fieldType: 'text', label: 'Hierarchy', placeholder: 'How is it structured...', multiline: true, displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'resources', 'wealth'), entityKind: 'FACTION', cardId: 'resources', fieldName: 'wealth', fieldType: 'dropdown', label: 'Wealth Level', options: JSON.stringify(['Destitute', 'Poor', 'Modest', 'Wealthy', 'Rich', 'Extremely Rich']), displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'resources', 'influence'), entityKind: 'FACTION', cardId: 'resources', fieldName: 'influence', fieldType: 'progress', label: 'Influence', currentField: 'influenceCurrent', maxField: 'influenceMax', color: '#8b5cf6', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'resources', 'assets'), entityKind: 'FACTION', cardId: 'resources', fieldName: 'assets', fieldType: 'array', label: 'Key Assets', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'goals', 'primaryGoal'), entityKind: 'FACTION', cardId: 'goals', fieldName: 'primaryGoal', fieldType: 'text', label: 'Primary Goal', placeholder: 'What do they want most...', multiline: true, displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('FACTION', 'goals', 'secrets'), entityKind: 'FACTION', cardId: 'goals', fieldName: 'secrets', fieldType: 'array', label: 'Secrets', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// NPC SCHEMA
// =============================================================================

const NPC_CARDS: FactSheetCardSchema[] = [
    { id: cardId('NPC', 'identity'), entityKind: 'NPC', cardId: 'identity', title: 'Identity', icon: 'User', gradient: 'from-orange-500 to-amber-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('NPC', 'role'), entityKind: 'NPC', cardId: 'role', title: 'Story Role', icon: 'Target', gradient: 'from-blue-500 to-indigo-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('NPC', 'motivations'), entityKind: 'NPC', cardId: 'motivations', title: 'Motivations', icon: 'Sparkles', gradient: 'from-purple-500 to-pink-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('NPC', 'abilities'), entityKind: 'NPC', cardId: 'abilities', title: 'Abilities & Resources', icon: 'Sparkles', gradient: 'from-emerald-500 to-teal-500', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const NPC_FIELDS: FactSheetFieldSchema[] = [
    { id: fieldId('NPC', 'identity', 'fullName'), entityKind: 'NPC', cardId: 'identity', fieldName: 'fullName', fieldType: 'text', label: 'Full Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'identity', 'role'), entityKind: 'NPC', cardId: 'identity', fieldName: 'role', fieldType: 'dropdown', label: 'Role', options: JSON.stringify(['Merchant', 'Guard', 'Noble', 'Commoner', 'Mystic', 'Warrior', 'Artisan', 'Scholar', 'Criminal', 'Other']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'identity', 'occupation'), entityKind: 'NPC', cardId: 'identity', fieldName: 'occupation', fieldType: 'text', label: 'Occupation', placeholder: 'What do they do...', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'identity', 'description'), entityKind: 'NPC', cardId: 'identity', fieldName: 'description', fieldType: 'text', label: 'Description', placeholder: 'Physical appearance...', multiline: true, displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'identity', 'quirks'), entityKind: 'NPC', cardId: 'identity', fieldName: 'quirks', fieldType: 'array', label: 'Quirks', displayOrder: 4, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'role', 'storyRole'), entityKind: 'NPC', cardId: 'role', fieldName: 'storyRole', fieldType: 'dropdown', label: 'Story Role', options: JSON.stringify(['Quest Giver', 'Ally', 'Enemy', 'Neutral', 'Information Source', 'Shop Keeper', 'Mentor', 'Victim']), displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'role', 'importance'), entityKind: 'NPC', cardId: 'role', fieldName: 'importance', fieldType: 'dropdown', label: 'Importance', options: JSON.stringify(['Minor', 'Moderate', 'Major', 'Key']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'role', 'location'), entityKind: 'NPC', cardId: 'role', fieldName: 'location', fieldType: 'text', label: 'Location', placeholder: 'Where can they be found...', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'motivations', 'goals'), entityKind: 'NPC', cardId: 'motivations', fieldName: 'goals', fieldType: 'array', label: 'Goals', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'motivations', 'fears'), entityKind: 'NPC', cardId: 'motivations', fieldName: 'fears', fieldType: 'array', label: 'Fears', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'motivations', 'secrets'), entityKind: 'NPC', cardId: 'motivations', fieldName: 'secrets', fieldType: 'array', label: 'Secrets', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'abilities', 'combatLevel'), entityKind: 'NPC', cardId: 'abilities', fieldName: 'combatLevel', fieldType: 'dropdown', label: 'Combat Level', options: JSON.stringify(['Non-combatant', 'Weak', 'Average', 'Skilled', 'Dangerous', 'Elite', 'Legendary']), displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('NPC', 'abilities', 'skills'), entityKind: 'NPC', cardId: 'abilities', fieldName: 'skills', fieldType: 'array', label: 'Skills', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// SCENE SCHEMA
// =============================================================================

const SCENE_CARDS: FactSheetCardSchema[] = [
    { id: cardId('SCENE', 'overview'), entityKind: 'SCENE', cardId: 'overview', title: 'Scene Overview', icon: 'Film', gradient: 'from-pink-500 to-rose-500', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('SCENE', 'participants'), entityKind: 'SCENE', cardId: 'participants', title: 'Participants', icon: 'Users', gradient: 'from-purple-500 to-violet-500', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('SCENE', 'setting'), entityKind: 'SCENE', cardId: 'setting', title: 'Setting', icon: 'MapPin', gradient: 'from-blue-500 to-cyan-500', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: cardId('SCENE', 'conflict'), entityKind: 'SCENE', cardId: 'conflict', title: 'Conflict & Stakes', icon: 'Zap', gradient: 'from-red-500 to-orange-500', displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
];

const SCENE_FIELDS: FactSheetFieldSchema[] = [
    { id: fieldId('SCENE', 'overview', 'name'), entityKind: 'SCENE', cardId: 'overview', fieldName: 'name', fieldType: 'text', label: 'Scene Name', placeholder: 'Click to add name...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'overview', 'type'), entityKind: 'SCENE', cardId: 'overview', fieldName: 'type', fieldType: 'dropdown', label: 'Type', options: JSON.stringify(['Opening', 'Climax', 'Resolution', 'Flashback', 'Beat', 'Transition', 'Action', 'Dialogue', 'Confrontation']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'overview', 'status'), entityKind: 'SCENE', cardId: 'overview', fieldName: 'status', fieldType: 'dropdown', label: 'Status', options: JSON.stringify(['Planned', 'In Progress', 'Completed', 'Skipped', 'Revised']), displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'overview', 'summary'), entityKind: 'SCENE', cardId: 'overview', fieldName: 'summary', fieldType: 'text', label: 'Summary', placeholder: 'What happens in this scene...', multiline: true, displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'overview', 'mood'), entityKind: 'SCENE', cardId: 'overview', fieldName: 'mood', fieldType: 'dropdown', label: 'Mood/Tone', options: JSON.stringify(['Tense', 'Exciting', 'Somber', 'Humorous', 'Mysterious', 'Romantic', 'Horrific', 'Triumphant']), displayOrder: 4, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'participants', 'protagonists'), entityKind: 'SCENE', cardId: 'participants', fieldName: 'protagonists', fieldType: 'array', label: 'Protagonists', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'participants', 'antagonists'), entityKind: 'SCENE', cardId: 'participants', fieldName: 'antagonists', fieldType: 'array', label: 'Antagonists', displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'participants', 'pointOfView'), entityKind: 'SCENE', cardId: 'participants', fieldName: 'pointOfView', fieldType: 'text', label: 'Point of View', placeholder: 'Whose perspective...', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'setting', 'location'), entityKind: 'SCENE', cardId: 'setting', fieldName: 'location', fieldType: 'text', label: 'Location', placeholder: 'Where does it take place...', displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'setting', 'timeOfDay'), entityKind: 'SCENE', cardId: 'setting', fieldName: 'timeOfDay', fieldType: 'dropdown', label: 'Time of Day', options: JSON.stringify(['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Evening', 'Night', 'Midnight']), displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'setting', 'atmosphere'), entityKind: 'SCENE', cardId: 'setting', fieldName: 'atmosphere', fieldType: 'text', label: 'Atmosphere', placeholder: 'Describe the atmosphere...', multiline: true, displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'conflict', 'conflict'), entityKind: 'SCENE', cardId: 'conflict', fieldName: 'conflict', fieldType: 'text', label: 'Central Conflict', placeholder: 'What is the conflict...', multiline: true, displayOrder: 0, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'conflict', 'stakes'), entityKind: 'SCENE', cardId: 'conflict', fieldName: 'stakes', fieldType: 'text', label: 'Stakes', placeholder: 'What is at risk...', multiline: true, displayOrder: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'conflict', 'tension'), entityKind: 'SCENE', cardId: 'conflict', fieldName: 'tension', fieldType: 'progress', label: 'Tension Level', currentField: 'tensionLevel', maxField: 'tensionMax', color: '#ef4444', displayOrder: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
    { id: fieldId('SCENE', 'conflict', 'resolution'), entityKind: 'SCENE', cardId: 'conflict', fieldName: 'resolution', fieldType: 'text', label: 'Resolution', placeholder: 'How does it resolve...', multiline: true, displayOrder: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
];

// =============================================================================
// GROUPED EXPORTS
// =============================================================================

export const ITEM_SCHEMA = { cards: ITEM_CARDS, fields: ITEM_FIELDS };
export const LOCATION_SCHEMA = { cards: LOCATION_CARDS, fields: LOCATION_FIELDS };
export const CONCEPT_SCHEMA = { cards: CONCEPT_CARDS, fields: CONCEPT_FIELDS };
export const EVENT_SCHEMA = { cards: EVENT_CARDS, fields: EVENT_FIELDS };
export const FACTION_SCHEMA = { cards: FACTION_CARDS, fields: FACTION_FIELDS };
export const NPC_SCHEMA = { cards: NPC_CARDS, fields: NPC_FIELDS };
export const SCENE_SCHEMA = { cards: SCENE_CARDS, fields: SCENE_FIELDS };

// Master map: entityKind -> { cards, fields }
export const DEFAULT_ENTITY_SCHEMAS: Record<string, { cards: FactSheetCardSchema[]; fields: FactSheetFieldSchema[] }> = {
    ITEM: ITEM_SCHEMA,
    LOCATION: LOCATION_SCHEMA,
    CONCEPT: CONCEPT_SCHEMA,
    EVENT: EVENT_SCHEMA,
    FACTION: FACTION_SCHEMA,
    NPC: NPC_SCHEMA,
    SCENE: SCENE_SCHEMA,
    // Aliases for structural kinds (use simpler schemas)
    ARC: CONCEPT_SCHEMA,
    ACT: CONCEPT_SCHEMA,
    CHAPTER: CONCEPT_SCHEMA,
    BEAT: CONCEPT_SCHEMA,
    TIMELINE: EVENT_SCHEMA,
    NARRATIVE: CONCEPT_SCHEMA,
};
