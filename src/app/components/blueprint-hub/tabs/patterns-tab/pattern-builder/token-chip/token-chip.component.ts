import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { PatternToken, CaptureRole } from '../types';

@Component({
    selector: 'app-token-chip',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        Popover,
        InputText,
        ToggleSwitch,
        Select,
        Tag
    ],
    templateUrl: './token-chip.component.html',
    styles: [`
    :host { display: inline-block; }
    .token-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border: 2px solid;
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        background-color: var(--surface-card);
        cursor: grab;
        user-select: none;
    }
    .token-chip:active {
        cursor: grabbing;
    }
    
    .type-prefix { border-color: rgba(59, 130, 246, 0.5); background-color: rgba(59, 130, 246, 0.1); }
    .type-wrapper { border-color: rgba(168, 85, 247, 0.5); background-color: rgba(168, 85, 247, 0.1); }
    .type-separator { border-color: rgba(245, 158, 11, 0.5); background-color: rgba(245, 158, 11, 0.1); }
    .type-capture { border-color: rgba(16, 185, 129, 0.5); background-color: rgba(16, 185, 129, 0.1); }
    .type-literal { border-color: rgba(107, 114, 128, 0.5); background-color: rgba(107, 114, 128, 0.1); }
  `]
})
export class TokenChipComponent {
    @Input({ required: true }) token!: PatternToken;
    @Input() index!: number;
    @Output() update = new EventEmitter<Partial<PatternToken>>();
    @Output() remove = new EventEmitter<void>();

    @ViewChild('opLiteral') opLiteral!: Popover;
    @ViewChild('opCapture') opCapture!: Popover;

    captureOptions = [
        { label: 'Entity Type', value: 'kind' },
        { label: 'Content', value: 'label' },
        { label: 'Subtype', value: 'subtype' },
        { label: 'Attributes', value: 'attributes' },
        { label: 'Predicate', value: 'predicate' },
        { label: 'Target', value: 'target' },
        { label: 'Display Text', value: 'displayText' }
    ];

    get chipsClass(): string {
        return `type-${this.token.type}`;
    }

    get wrapperValue(): string {
        const val = this.token.value as [string, string];
        return `${val[0]} ... ${val[1]}`;
    }

    get asString(): string {
        return this.token.value as string;
    }

    toggleLiteral(event: Event) {
        this.opLiteral.toggle(event);
    }

    toggleCapture(event: Event) {
        this.opCapture.toggle(event);
    }

    hideLiteral() {
        this.opLiteral.hide();
    }

    updateCaptureAs(value: string) {
        this.update.emit({ captureAs: value as CaptureRole });
    }
}
