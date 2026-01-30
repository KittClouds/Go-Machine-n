// src/app/lib/Scanner/anchor-utils.ts
import type { DecorationSpan, TextQuoteSelector } from './types';

// Context window size for prefix/suffix
const CONTEXT_LEN = 32;

/**
 * Create a TextQuoteSelector for a given span in the text
 */
export function createSelector(text: string, from: number, to: number): TextQuoteSelector {
    // Clamp coordinates
    const start = Math.max(0, from);
    const end = Math.min(text.length, to);

    const exact = text.slice(start, end);
    const prefixStart = Math.max(0, start - CONTEXT_LEN);
    const prefix = text.slice(prefixStart, start);
    const suffixEnd = Math.min(text.length, end + CONTEXT_LEN);
    const suffix = text.slice(end, suffixEnd);

    return { exact, prefix, suffix };
}

/**
 * Realign a single span against new text using the Resolution Ladder:
 * 1. Exact Position Match
 * 2. Exact Quote Match (Verify Context)
 * 3. Fuzzy Context Match
 */
export function realignSpan(span: DecorationSpan, text: string): DecorationSpan | null {
    if (!span.selector) {
        // Legacy span without selector: try to trust position if text length matches?
        // Or just fail? For better resilience, we fail if we can't verify content.
        // But to be nice to legacy data, we check if the text at position roughly matches the label?
        // Let's check if the text at 'from/to' equals 'label' or 'matchedText'
        const slice = text.slice(span.from, span.to);
        const expected = span.matchedText || span.label;
        if (expected && slice === expected) {
            return span; // Position match confirmed (legacy)
        }
        // If position mismatch and no selector, we drop it (can't re-find)
        return null;
    }

    const { exact, prefix, suffix } = span.selector;

    // 1. FAST EXACT/POSITION MATCH
    // Check if the span is still at the same position
    if (span.from < text.length && span.to <= text.length) {
        const currentSlice = text.slice(span.from, span.to);
        if (currentSlice === exact) {
            // Further verify context to ensure it's the *same* instance (in case of duplicate words moved)
            const currentPrefix = text.slice(Math.max(0, span.from - prefix.length), span.from);
            const currentSuffix = text.slice(span.to, Math.min(text.length, span.to + suffix.length));

            // Allow for partial context match (e.g. edge of document edits), but strict exact match
            if (isContextCompatible(prefix, currentPrefix) && isContextCompatible(suffix, currentSuffix)) {
                return span;
            }
        }
    }

    // 2. SEARCH FOR QUOTE (with Context Disambiguation)
    // Find all instances of 'exact'
    const candidates = findAllIndices(text, exact);

    if (candidates.length === 0) {
        // Quote not found (deleted or modified)
        return null;
    }

    if (candidates.length === 1) {
        // Only one instance? Use it if context is somewhat likely, or just accept if unique.
        // For robustness, we accept unique matches readily.
        const newFrom = candidates[0];
        const newTo = newFrom + exact.length;
        return { ...span, from: newFrom, to: newTo };
    }

    // Multiple candidates: Disambiguate with Context
    let bestCandidate = -1;
    let maxScore = -1;

    for (const start of candidates) {
        const end = start + exact.length;
        const candPrefix = text.slice(Math.max(0, start - prefix.length), start);
        const candSuffix = text.slice(end, Math.min(text.length, end + suffix.length));

        const score = matchScore(prefix, candPrefix) + matchScore(suffix, candSuffix);

        if (score > maxScore) {
            maxScore = score;
            bestCandidate = start;
        }
    }

    // Threshold can be tuned. For now, best match wins.
    if (bestCandidate !== -1) {
        return {
            ...span,
            from: bestCandidate,
            to: bestCandidate + exact.length
        };
    }

    return null;
}

/**
 * Batch realign spans
 */
export function realignSpans(spans: DecorationSpan[], text: string): DecorationSpan[] {
    const valid: DecorationSpan[] = [];
    for (const span of spans) {
        const realigned = realignSpan(span, text);
        if (realigned) {
            valid.push(realigned);
        }
    }
    return valid;
}

// Helpers

function findAllIndices(text: string, search: string): number[] {
    const indices: number[] = [];
    let pos = text.indexOf(search);
    while (pos !== -1) {
        indices.push(pos);
        pos = text.indexOf(search, pos + 1);
    }
    return indices;
}

/**
 * Returns true if current context is compatible with stored context
 * (i.e., one is a substring of the other, handling boundary cuts)
 */
function isContextCompatible(stored: string, current: string): boolean {
    if (!stored || !current) return true;
    return stored.endsWith(current) || current.endsWith(stored) ||
        stored.startsWith(current) || current.startsWith(stored);
}

/**
 * Simple score for context matching (Levenshtein is better but expensive; simple overlap is fast)
 * Compares character by character and returns ratio of matching chars
 */
function matchScore(stored: string, current: string): number {
    if (!stored || !current) return 0;
    if (stored === current) return 100; // Perfect match

    // Count matching characters from the start
    const len = Math.min(stored.length, current.length);
    let matches = 0;
    for (let i = 0; i < len; i++) {
        if (stored[i] === current[i]) matches++;
    }

    // Return match ratio (0-100)
    return Math.round((matches / Math.max(stored.length, current.length)) * 100);
}

/**
 * Compute a deterministic hash for a selector to allow O(1) lookups
 * Uses a simple fast hashing algorithm (djb2-ish variant) for the combined string
 */
export function computeSelectorHash(selector: TextQuoteSelector): string {
    const str = `${selector.exact}|${selector.prefix}|${selector.suffix}`;
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
    }
    return (hash >>> 0).toString(16); // Convert to unsigned hex
}
