import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { PatternToken, CaptureRole, CAPTURE_PATTERNS, WRAPPER_MAP } from '../types';

@Component({
    selector: 'app-add-token-menu',
    standalone: true,
    imports: [CommonModule, ButtonModule, Tag],
    templateUrl: './add-token-menu.component.html',
    styles: [`
    :host { display: block; }
    .token-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: 2px solid var(--surface-border);
        transition: all 0.2s;
        background: transparent;
        cursor: pointer;
    }
    .token-btn:hover {
        transform: scale(1.05);
        border-color: var(--primary-color);
        background-color: rgba(var(--primary-rgb), 0.05);
    }
    .token-btn.primary {
        border-color: rgba(var(--primary-rgb), 0.3);
        background-color: rgba(var(--primary-rgb), 0.05);
    }
    .token-btn.primary:hover {
        background-color: rgba(var(--primary-rgb), 0.1);
        border-color: var(--primary-color);
    }
    .token-btn.secondary {
        border-color: rgba(100, 116, 139, 0.2);
        background-color: rgba(100, 116, 139, 0.05);
    }
    .token-btn.secondary:hover {
        background-color: rgba(100, 116, 139, 0.1);
    }
  `]
})
export class AddTokenMenuComponent {
    @Output() add = new EventEmitter<PatternToken>();
    @Output() addMultiple = new EventEmitter<PatternToken[]>();
    @Output() close = new EventEmitter<void>();

    private generateId(): string {
        return Math.random().toString(36).substring(2, 9);
    }

    addPrefix(value: string) {
        this.add.emit({ id: this.generateId(), type: 'prefix', value });
    }

    addWrapper(key: string) {
        this.add.emit({ id: this.generateId(), type: 'wrapper', value: WRAPPER_MAP[key] });
    }

    addSeparator(value: string) {
        this.add.emit({ id: this.generateId(), type: 'separator', value });
    }

    addCapture(captureAs: CaptureRole, optional = false) {
        this.add.emit({
            id: this.generateId(),
            type: 'capture',
            value: CAPTURE_PATTERNS[captureAs] || '.+',
            captureAs,
            optional,
        });
    }

    addLiteral() {
        const text = prompt('Enter fixed text:');
        if (text) {
            this.add.emit({ id: this.generateId(), type: 'literal', value: text });
        }
    }

    // Templates
    addEntityTemplate() {
        this.addMultiple.emit([
            { id: this.generateId(), type: 'wrapper', value: WRAPPER_MAP['square'] },
            { id: this.generateId(), type: 'capture', value: CAPTURE_PATTERNS['kind'], captureAs: 'kind' },
            { id: this.generateId(), type: 'separator', value: '|' },
            { id: this.generateId(), type: 'capture', value: CAPTURE_PATTERNS['label'], captureAs: 'label' },
        ]);
    }

    addHashtagEntityTemplate() {
        this.addMultiple.emit([
            { id: this.generateId(), type: 'prefix', value: '#' },
            { id: this.generateId(), type: 'capture', value: CAPTURE_PATTERNS['kind'], captureAs: 'kind' },
            { id: this.generateId(), type: 'separator', value: '|' },
            { id: this.generateId(), type: 'capture', value: CAPTURE_PATTERNS['label'], captureAs: 'label' },
        ]);
    }

    addWikilinkTemplate() {
        this.addMultiple.emit([
            { id: this.generateId(), type: 'wrapper', value: WRAPPER_MAP['double-square'] },
            { id: this.generateId(), type: 'capture', value: CAPTURE_PATTERNS['label'], captureAs: 'label' },
        ]);
    }

    addSimpleTagTemplate() {
        this.addMultiple.emit([
            { id: this.generateId(), type: 'prefix', value: '#' },
            { id: this.generateId(), type: 'capture', value: '\\w+', captureAs: 'label' },
        ]);
    }
}
