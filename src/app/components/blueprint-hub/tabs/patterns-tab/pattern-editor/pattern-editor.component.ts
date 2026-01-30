import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Select } from 'primeng/select';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { PatternDefinition, validatePatternSyntax } from '../../../../../lib/refs/patterns/schema';
import { RefKind } from '../../../../../lib/refs/types';
import { PatternBuilderComponent } from '../pattern-builder/pattern-builder.component';
import { TokenPatternDefinition } from '../pattern-builder/types';

@Component({
    selector: 'app-pattern-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputText,
        Textarea,
        ToggleSwitch,
        Select,
        Tabs, TabList, Tab, TabPanels, TabPanel,
        PatternBuilderComponent
    ],
    templateUrl: './pattern-editor.component.html',
    styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class PatternEditorComponent {
    @Input({ required: true }) set pattern(p: PatternDefinition) {
        this._draft = { ...p, captures: { ...p.captures }, rendering: { ...p.rendering } };

        this._tokenPattern = {
            id: p.id,
            name: p.name,
            description: p.description,
            kind: p.kind,
            enabled: p.enabled,
            priority: p.priority,
            tokens: [],
            compiledPattern: p.pattern
        };
    }
    @Input() isNew = false;

    @Output() save = new EventEmitter<PatternDefinition>();
    @Output() cancel = new EventEmitter<void>();

    // State as regular properties (not signals for template binding simplicity)
    _draft: PatternDefinition = {} as PatternDefinition;
    _tokenPattern: TokenPatternDefinition = {} as TokenPatternDefinition;
    mode: 'builder' | 'advanced' = 'builder';
    activeTabIndex = 0;
    newCaptureKey = '';

    // Getters for computed values
    get validation() {
        if (!this._draft.pattern) return { valid: false, error: 'Pattern is required' };
        return validatePatternSyntax(this._draft.pattern, this._draft.flags);
    }

    get captureGroupCount(): number {
        try {
            const matches = this._draft.pattern?.match(/\((?!\?)/g);
            return matches ? matches.length : 0;
        } catch { return 0; }
    }

    get canSave(): boolean {
        if (this.mode === 'builder') {
            return !!(this._tokenPattern.compiledPattern && this._tokenPattern.name);
        }
        return this.validation.valid;
    }

    get captureKeys(): string[] {
        return Object.keys(this._draft.captures || {});
    }

    // Constants
    refKinds = [
        { label: 'Entity', value: 'entity' },
        { label: 'Wikilink', value: 'wikilink' },
        { label: 'Backlink', value: 'backlink' },
        { label: 'Tag', value: 'tag' },
        { label: 'Mention', value: 'mention' },
        { label: 'Triple', value: 'triple' },
        { label: 'Temporal', value: 'temporal' },
        { label: 'Custom', value: 'custom' }
    ];

    // Update methods for template
    updateName(value: string) { this._draft.name = value; }
    updateDescription(value: string) { this._draft.description = value; }
    updateKind(value: string) { this._draft.kind = value as RefKind; }
    updatePriority(value: number) { this._draft.priority = value; }
    updatePattern(value: string) { this._draft.pattern = value; }
    updateFlags(value: string) { this._draft.flags = value; }
    updateEnabled(value: boolean) { this._draft.enabled = value; }
    updateWidgetMode(value: boolean) { this._draft.rendering.widgetMode = value; }
    updateColor(value: string) { this._draft.rendering.color = value; }
    updateBgColor(value: string) { this._draft.rendering.backgroundColor = value; }
    updateTemplate(value: string) { this._draft.rendering.template = value; }

    addCapture() {
        const key = this.newCaptureKey.trim();
        if (!key || this.captureKeys.includes(key)) return;

        const newGroupIndex = this.captureKeys.length + 1;
        this._draft.captures[key] = { group: newGroupIndex };
        this.newCaptureKey = '';
    }

    removeCapture(key: string) {
        delete this._draft.captures[key];
    }

    updateCaptureGroup(key: string, group: number) {
        if (this._draft.captures[key]) {
            this._draft.captures[key].group = group;
        }
    }

    updateCaptureRequired(key: string, required: boolean) {
        if (this._draft.captures[key]) {
            this._draft.captures[key].required = required;
        }
    }

    // Builder handlers
    handleTokenPatternChange(updated: TokenPatternDefinition) {
        this._tokenPattern = updated;
        this._draft.name = updated.name;
        this._draft.description = updated.description;
        this._draft.kind = updated.kind as RefKind;
        this._draft.enabled = updated.enabled;
        this._draft.priority = updated.priority;
        this._draft.pattern = updated.compiledPattern || '';
    }

    onSave() {
        if (this.mode === 'builder') {
            const final: PatternDefinition = {
                ...this._draft,
                name: this._tokenPattern.name,
                description: this._tokenPattern.description,
                kind: this._tokenPattern.kind as RefKind,
                enabled: this._tokenPattern.enabled,
                priority: this._tokenPattern.priority,
                pattern: this._tokenPattern.compiledPattern || ''
            };
            this.save.emit(final);
        } else {
            if (!this.validation.valid) return;
            this.save.emit(this._draft);
        }
    }
}
