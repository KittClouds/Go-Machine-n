/**
 * Fact Sheets Module
 * Public exports for the fact sheets feature
 */

// Types (legacy - now in Dexie)
export * from './types';

// Schemas (legacy - now in Dexie)
export * from './schemas';

// Service
export { FactSheetService } from './fact-sheet.service';
export type { CardWithFields } from './fact-sheet.service';

// Components
export { FactSheetCardComponent } from './fact-sheet-card/fact-sheet-card.component';
export { FactSheetContainerComponent } from './fact-sheet-container/fact-sheet-container.component';
export type { ParsedEntity } from './fact-sheet-container/fact-sheet-container.component';
