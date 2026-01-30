import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';

import { TokenPatternDefinition, PatternToken, compileTokensToRegex, renderPatternExample } from './types';
import { AddTokenMenuComponent } from './add-token-menu/add-token-menu.component';
import { TokenChipComponent } from './token-chip/token-chip.component';
import { LiveMatchHighlighterComponent } from './live-match-highlighter/live-match-highlighter.component';

@Component({
    selector: 'app-pattern-builder',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DragDropModule,
        ButtonModule,
        InputText,
        Textarea,
        Select,
        Dialog,
        ToggleSwitch,
        AddTokenMenuComponent,
        TokenChipComponent,
        LiveMatchHighlighterComponent
    ],
    templateUrl: './pattern-builder.component.html',
    styles: [`
    :host { display: block; }
    .token-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      min-height: 4rem;
      align-items: center;
    }
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12);
    }
    .cdk-drag-placeholder {
      opacity: 0;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .token-list.cdk-drop-list-dragging .token-chip:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class PatternBuilderComponent {
    @Input({ required: true }) pattern!: TokenPatternDefinition;
    @Output() patternChange = new EventEmitter<TokenPatternDefinition>();

    showAddMenu = false;
    testInput = '';

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

    get examplePattern(): string {
        return renderPatternExample(this.pattern?.tokens || []);
    }

    updatePattern(updates: Partial<TokenPatternDefinition>) {
        const updated = { ...this.pattern, ...updates };
        this.patternChange.emit(updated);
    }

    updateTokens(newTokens: PatternToken[]) {
        const compiled = compileTokensToRegex(newTokens);
        this.updatePattern({
            tokens: newTokens,
            compiledPattern: compiled
        });
    }

    drop(event: CdkDragDrop<string[]>) {
        const newTokens = [...this.pattern.tokens];
        moveItemInArray(newTokens, event.previousIndex, event.currentIndex);
        this.updateTokens(newTokens);
    }

    removeToken(id: string) {
        const newTokens = this.pattern.tokens.filter(t => t.id !== id);
        this.updateTokens(newTokens);
    }

    updateToken(id: string, updates: Partial<PatternToken>) {
        const newTokens = this.pattern.tokens.map(t =>
            t.id === id ? { ...t, ...updates } : t
        );
        this.updateTokens(newTokens);
    }

    handleAddToken(token: PatternToken) {
        this.updateTokens([...(this.pattern.tokens || []), token]);
        this.showAddMenu = false;
    }

    handleAddMultipleTokens(tokens: PatternToken[]) {
        this.updateTokens([...(this.pattern.tokens || []), ...tokens]);
        this.showAddMenu = false;
    }
}
