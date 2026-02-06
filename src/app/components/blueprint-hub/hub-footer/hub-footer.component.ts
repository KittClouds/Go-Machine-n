import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlueprintHubService } from '../blueprint-hub.service';
import { FooterStatsService } from '../../../services/footer-stats.service';
import { TtsService } from '../../../services/tts.service';
import { NoteEditorStore } from '../../../lib/store/note-editor.store';
import { TtsSettingsPopupComponent } from './tts-settings-popup.component';
import { NgxGradientTextComponent } from '@omnedia/ngx-gradient-text';

@Component({
    selector: 'app-hub-footer',
    standalone: true,
    imports: [CommonModule, TtsSettingsPopupComponent, NgxGradientTextComponent],
    templateUrl: './hub-footer.component.html',
    styleUrl: './hub-footer.component.css'
})
export class HubFooterComponent {
    hubService = inject(BlueprintHubService);
    statsService = inject(FooterStatsService);
    ttsService = inject(TtsService);
    private noteStore = inject(NoteEditorStore);

    // ========================================================================
    // Note Length Health Gradient
    // ========================================================================
    // Standard note limit: 50k characters
    // Green (healthy) -> Yellow (warning) -> Red (danger)

    private readonly CHAR_LIMIT = 50000;

    /** Text to display: "5756 chars" */
    charCountText = computed(() => `${this.statsService.charCount()} chars`);

    /** Health ratio: 0 (empty) to 1+ (at/over limit) */
    charHealthRatio = computed(() => {
        const count = this.statsService.charCount();
        return Math.min(count / this.CHAR_LIMIT, 1.5); // Cap at 1.5 for extra red
    });

    /** Gradient start color: Vibrant lime green */
    charGradientStart = computed(() => {
        const ratio = this.charHealthRatio();
        // Lime -> Orange -> Red
        if (ratio < 0.5) {
            // Green to Yellow-Green
            return '#32CD32'; // Lime green
        } else if (ratio < 0.8) {
            // Yellow-Green to Orange
            return '#9ACD32'; // Yellow-green
        } else {
            // Orange to Red
            return '#FFA500'; // Orange
        }
    });

    /** Gradient end color: shifts based on health */
    charGradientEnd = computed(() => {
        const ratio = this.charHealthRatio();
        if (ratio < 0.3) {
            return '#00FF7F'; // Spring green (very healthy)
        } else if (ratio < 0.5) {
            return '#7CFC00'; // Lawn green
        } else if (ratio < 0.7) {
            return '#ADFF2F'; // Green-yellow
        } else if (ratio < 0.85) {
            return '#FFD700'; // Gold (warning)
        } else if (ratio < 1.0) {
            return '#FF6347'; // Tomato (danger approaching)
        } else {
            return '#FF0000'; // Bright red (at/over limit)
        }
    });

    onLoadModelClick(): void {
        this.ttsService.loadModel();
    }

    onSpeakClick(): void {
        if (this.ttsService.isPlaying()) {
            this.ttsService.stop();
            return;
        }

        // Get current note content
        const noteId = this.noteStore.activeNoteId();
        if (!noteId) {
            console.warn('[HubFooter] No note open to read.');
            return;
        }

        const note = this.noteStore.currentNote();
        const content = note?.markdownContent;
        if (!content || content.trim().length === 0) {
            console.warn('[HubFooter] Note has no content.');
            return;
        }

        // Strip markdown syntax for cleaner speech
        const cleanText = this.stripMarkdown(content);
        this.ttsService.speak(cleanText);
    }

    private stripMarkdown(text: string): string {
        return text
            // Remove code blocks first (before other processing)
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`([^`]+)`/g, '$1')
            // Remove HTML tags
            .replace(/<[^>]+>/g, '')
            // Remove images
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove entity syntax
            .replace(/\[([A-Z]+)\|([^\]]+)\]/g, '$2')
            .replace(/\[\[([^\]]+)\]\]/g, '$1')
            // Remove headers
            .replace(/^#{1,6}\s+/gm, '')
            // Remove blockquotes
            .replace(/^>\s*/gm, '')
            // Remove list markers (bullets and numbers)
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // Remove bold/italic markers
            .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
            // Remove strikethrough
            .replace(/~~([^~]+)~~/g, '$1')
            // Remove horizontal rules
            .replace(/^[-*_]{3,}\s*$/gm, '')
            // Remove table formatting
            .replace(/\|/g, ' ')
            .replace(/^[\s]*[-:]+[\s]*$/gm, '')
            // Normalize whitespace
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, ' ')
            .replace(/\s{2,}/g, ' ')
            // Clean up punctuation
            .replace(/\.{2,}/g, '.')
            .replace(/\s+([.,!?])/g, '$1')
            .trim();
    }
}
