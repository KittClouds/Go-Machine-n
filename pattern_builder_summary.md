# Pattern Builder Implementation

## Status: Complete

The Pattern Builder feature has been successfully ported from React to Angular. It is now integrated into the Blueprint Hub under the "Patterns" tab.

### Components Implemented

1.  **PatternsTabComponent**:
    *   Lists all patterns (built-in and custom).
    *   Groups patterns by kind.
    *   Allows enabling/disabling patterns.
    *   Supports deleting custom patterns and resetting to defaults.
    *   Uses PrimeNG v21 components (Menu, ToggleSwitch, ConfirmDialog).

2.  **PatternEditorComponent**:
    *   Supports creating and editing patterns.
    *   Two modes: **Builder** (visual) and **Advanced** (raw regex).
    *   Advanced mode tabs: Basic, Captures, Rendering.
    *   Validation of regex syntax.
    *   Uses PrimeNG v21 components (Tabs, Select, InputText, Textarea).

3.  **PatternBuilderComponent**:
    *   Visual interface for building regex patterns using tokens.
    *   Drag-and-drop support for reordering tokens (`@angular/cdk/drag-drop`).
    *   Live preview of the compiled regex.
    *   Live testing against sample text.
    *   Uses `AddTokenMenuComponent` and `TokenChipComponent`.

4.  **TokenChipComponent**:
    *   Represents individual tokens (Prefix, Wrapper, Separator, Capture, Literal).
    *   Inline editing via Popover.
    *   Configurable capture roles and optionality.

5.  **AddTokenMenuComponent**:
    *   Grid of available tokens.
    *   Quick templates for common patterns (e.g., Hashtag Entity, Wikilink).

6.  **LiveMatchHighlighterComponent**:
    *   Real-time highlighting of matches in test input.

### Services & Data

*   **PatternRegistryService**: Manages pattern storage, retrieval, and compilation.
*   **Schema & Types**: Full TypeScript definitions for `PatternDefinition`, `RefKind`, etc.
*   **Default Patterns**: Built-in patterns for standard Entity detection.

### Next Steps

*   **Persistence**: Currently, patterns are stored in memory. Need to integrate with Dexie or backend for permanent storage.
*   **Testing**: Add unit tests for the regex compilation logic.
*   **Refinement**: Polish the UI based on user feedback.
