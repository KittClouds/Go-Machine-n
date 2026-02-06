import { Injectable, signal, computed } from '@angular/core';
import type { TTSWorkerMessage, TTSResponseMessage } from '../workers/tts.worker';
import { modelCache } from '../lib/model-cache';

export type TTSModelState = 'idle' | 'loading' | 'ready' | 'error';

// Voice configuration
export interface TtsVoice {
    id: string;
    name: string;
    gender: 'male' | 'female';
    url: string;
}

// Available voices from Supertonic TTS
// https://supertone-inc.github.io/supertonic-py/voices/
const VOICE_BASE = 'https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main/voices';

export const TTS_VOICES: TtsVoice[] = [
    { id: 'F1', name: 'Sofia', gender: 'female', url: `${VOICE_BASE}/F1.bin` },
    { id: 'F2', name: 'Elena', gender: 'female', url: `${VOICE_BASE}/F2.bin` },
    { id: 'F3', name: 'Maya', gender: 'female', url: `${VOICE_BASE}/F3.bin` },
    { id: 'F4', name: 'Luna', gender: 'female', url: `${VOICE_BASE}/F4.bin` },
    { id: 'M1', name: 'James', gender: 'male', url: `${VOICE_BASE}/M1.bin` },
    { id: 'M2', name: 'Oliver', gender: 'male', url: `${VOICE_BASE}/M2.bin` },
    { id: 'M3', name: 'Daniel', gender: 'male', url: `${VOICE_BASE}/M3.bin` },
    { id: 'M4', name: 'Henry', gender: 'male', url: `${VOICE_BASE}/M4.bin` },
];

/**
 * Get a voice blob URL, using cache if available
 * Returns a blob: URL that can be passed to the TTS pipeline
 */
export async function getVoiceBlobUrl(voice: TtsVoice): Promise<string> {
    const cacheId = `voice:${voice.id}`;

    // Fetch with cache (returns blob from cache or network)
    const blob = await modelCache.fetchWithCache(cacheId, voice.url, 'voice');

    // Create a blob URL for the worker
    return URL.createObjectURL(blob);
}

@Injectable({ providedIn: 'root' })
export class TtsService {
    // ========================================================================
    // State Signals
    // ========================================================================

    private readonly _modelState = signal<TTSModelState>('idle');
    private readonly _loadProgress = signal<number>(0);
    private readonly _loadStatus = signal<string>('');
    private readonly _isPlaying = signal<boolean>(false);
    private readonly _errorMessage = signal<string | null>(null);
    private readonly _selectedVoice = signal<TtsVoice>(TTS_VOICES[0]); // Default: Sofia (F1)

    // Public readonly signals
    readonly modelState = this._modelState.asReadonly();
    readonly loadProgress = this._loadProgress.asReadonly();
    readonly loadStatus = this._loadStatus.asReadonly();
    readonly isPlaying = this._isPlaying.asReadonly();
    readonly errorMessage = this._errorMessage.asReadonly();
    readonly selectedVoice = this._selectedVoice.asReadonly();

    // Computed
    readonly isModelReady = computed(() => this._modelState() === 'ready');
    readonly isModelLoading = computed(() => this._modelState() === 'loading');

    // ========================================================================
    // Voice Selection
    // ========================================================================

    setVoice(voice: TtsVoice): void {
        this._selectedVoice.set(voice);
        console.log(`[TtsService] Voice changed to ${voice.name} (${voice.id})`);
    }

    // ========================================================================
    // Worker & Audio
    // ========================================================================

    private worker: Worker | null = null;
    private audioContext: AudioContext | null = null;

    // ========================================================================
    // Prefetch Pipeline State
    // ========================================================================

    private readonly MAX_CHUNK_SIZE = 400;
    private readonly PREFETCH_BUFFER_SIZE = 2; // Keep 2 chunks ahead

    private pendingChunks: string[] = [];         // Chunks waiting to be synthesized
    private audioBufferQueue: AudioBuffer[] = []; // Decoded, ready to play
    private activeSourceNodes: AudioBufferSourceNode[] = [];
    private scheduledEndTime = 0;                 // When current scheduled audio ends
    private isGenerating = false;                 // Worker is synthesizing
    private stopRequested = false;

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Load the TTS model. This may take a few minutes on first load.
     */
    loadModel(): void {
        if (this._modelState() === 'loading' || this._modelState() === 'ready') {
            console.log('[TtsService] Model already loading or loaded.');
            return;
        }

        this._modelState.set('loading');
        this._loadProgress.set(0);
        this._loadStatus.set('Initializing...');
        this._errorMessage.set(null);

        this.initWorker();
        this.sendMessage({ type: 'LOAD_MODEL' });
    }

    /**
     * Synthesize speech from text and play it with prefetching for seamless playback.
     */
    speak(text: string): void {
        if (this._modelState() !== 'ready') {
            console.warn('[TtsService] Model not ready. Call loadModel() first.');
            return;
        }

        if (this._isPlaying()) {
            this.stop();
        }

        // Chunk the text
        this.pendingChunks = this.chunkText(text);
        this.audioBufferQueue = [];
        this.stopRequested = false;
        this.scheduledEndTime = 0;
        this.isGenerating = false;

        if (this.pendingChunks.length === 0) {
            console.warn('[TtsService] No text to speak.');
            return;
        }

        console.log(`[TtsService] Starting prefetch pipeline for ${this.pendingChunks.length} chunks...`);
        this._isPlaying.set(true);

        // Initialize audio context
        this.ensureAudioContext();

        // Start prefetching - request first N chunks immediately
        this.fillPrefetchBuffer();
    }

    /**
     * Stop current playback and clear all queues.
     */
    stop(): void {
        console.log('[TtsService] Stopping playback...');
        this.stopRequested = true;
        this.pendingChunks = [];
        this.audioBufferQueue = [];
        this.isGenerating = false;

        // Stop all active source nodes
        for (const source of this.activeSourceNodes) {
            try {
                source.stop();
                source.disconnect();
            } catch {
                // Already stopped
            }
        }
        this.activeSourceNodes = [];
        this.scheduledEndTime = 0;
        this._isPlaying.set(false);
    }

    /**
     * Cleanup resources.
     */
    destroy(): void {
        this.stop();
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    // ========================================================================
    // Text Chunking
    // ========================================================================

    private chunkText(text: string): string[] {
        if (!text || text.trim().length === 0) return [];

        const sentencePattern = /[^.!?]+[.!?]+\s*/g;
        const sentences = text.match(sentencePattern) || [text];

        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;

            if (currentChunk.length > 0 &&
                (currentChunk.length + trimmedSentence.length) > this.MAX_CHUNK_SIZE) {
                chunks.push(currentChunk.trim());
                currentChunk = trimmedSentence;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        // Fallback for text without punctuation
        if (chunks.length === 0 && text.trim()) {
            const words = text.split(/\s+/);
            currentChunk = '';
            for (const word of words) {
                if ((currentChunk + ' ' + word).length > this.MAX_CHUNK_SIZE && currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = word;
                } else {
                    currentChunk += (currentChunk ? ' ' : '') + word;
                }
            }
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
        }

        return chunks;
    }

    // ========================================================================
    // Prefetch Pipeline
    // ========================================================================

    /**
     * Ensure we have enough chunks being synthesized ahead of playback.
     */
    private fillPrefetchBuffer(): void {
        // Request synthesis for chunks until buffer is full or no more chunks
        while (
            !this.stopRequested &&
            !this.isGenerating &&
            this.pendingChunks.length > 0 &&
            this.audioBufferQueue.length < this.PREFETCH_BUFFER_SIZE
        ) {
            this.requestNextChunk();
        }
    }

    /**
     * Request the worker to synthesize the next chunk.
     */
    private requestNextChunk(): void {
        if (this.pendingChunks.length === 0 || this.isGenerating) return;

        const chunk = this.pendingChunks.shift()!;
        this.isGenerating = true;

        console.log(`[TtsService] Requesting synthesis (${this.pendingChunks.length} pending): "${chunk.substring(0, 40)}..."`);
        this.sendMessage({
            type: 'SPEAK',
            payload: {
                text: chunk,
                voiceUrl: this._selectedVoice().url
            }
        });
    }

    /**
     * Schedule the next audio buffer for playback at the precise end time.
     */
    private scheduleNextBuffer(): void {
        if (this.stopRequested || this.audioBufferQueue.length === 0) {
            // Check if we're done
            if (this.pendingChunks.length === 0 && !this.isGenerating && this.audioBufferQueue.length === 0) {
                this.finishPlayback();
            }
            return;
        }

        const buffer = this.audioBufferQueue.shift()!;
        const ctx = this.audioContext!;

        // Create source node
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // Calculate precise start time
        const now = ctx.currentTime;
        const startAt = Math.max(now, this.scheduledEndTime);

        // Schedule with sub-millisecond precision
        source.start(startAt);
        this.scheduledEndTime = startAt + buffer.duration;

        // Track for cleanup
        this.activeSourceNodes.push(source);

        // When this buffer ends, clean up and try to schedule more
        source.onended = () => {
            this.cleanupSource(source);
            // Schedule next if available
            this.scheduleNextBuffer();
        };

        console.log(`[TtsService] Scheduled buffer: start=${startAt.toFixed(3)}, duration=${buffer.duration.toFixed(2)}s, queue=${this.audioBufferQueue.length}`);

        // Continue prefetching
        this.fillPrefetchBuffer();
    }

    /**
     * Remove a source node from tracking.
     */
    private cleanupSource(source: AudioBufferSourceNode): void {
        const idx = this.activeSourceNodes.indexOf(source);
        if (idx !== -1) {
            this.activeSourceNodes.splice(idx, 1);
        }
        try {
            source.disconnect();
        } catch {
            // Already disconnected
        }
    }

    /**
     * Called when all audio has finished playing.
     */
    private finishPlayback(): void {
        if (!this.stopRequested && this._isPlaying()) {
            console.log('[TtsService] Finished playing all chunks.');
            this._isPlaying.set(false);
        }
    }

    // ========================================================================
    // Audio Context
    // ========================================================================

    private async ensureAudioContext(): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // ========================================================================
    // Worker Communication
    // ========================================================================

    private initWorker(): void {
        if (this.worker) return;

        this.worker = new Worker(new URL('../workers/tts.worker', import.meta.url), {
            type: 'module'
        });

        this.worker.onmessage = (e: MessageEvent<TTSResponseMessage>) => {
            this.handleWorkerMessage(e.data);
        };

        this.worker.onerror = (error) => {
            console.error('[TtsService] Worker error:', error);
            this._modelState.set('error');
            this._errorMessage.set('Worker failed to initialize.');
        };
    }

    private sendMessage(msg: TTSWorkerMessage): void {
        if (!this.worker) {
            console.error('[TtsService] Worker not initialized.');
            return;
        }
        this.worker.postMessage(msg);
    }

    private handleWorkerMessage(msg: TTSResponseMessage): void {
        switch (msg.type) {
            case 'PROGRESS':
                this.handleProgress(msg.payload);
                break;

            case 'MODEL_READY':
                this._modelState.set('ready');
                this._loadProgress.set(100);
                this._loadStatus.set('Ready');
                console.log('[TtsService] Model ready!');
                break;

            case 'MODEL_ERROR':
                this._modelState.set('error');
                this._errorMessage.set(msg.payload.message);
                this.isGenerating = false;
                console.error('[TtsService] Model load error:', msg.payload.message);
                break;

            case 'AUDIO_READY':
                this.handleAudioReady(msg.payload.blob, msg.payload.sampleRate);
                break;

            case 'SPEAK_ERROR':
                console.error('[TtsService] Speak error:', msg.payload.message);
                this.isGenerating = false;
                // Continue with next chunk
                this.fillPrefetchBuffer();
                break;

            case 'STATUS':
                if (msg.payload.modelLoaded && this._modelState() !== 'ready') {
                    this._modelState.set('ready');
                }
                break;
        }
    }

    private handleProgress(progress: { status: string; progress?: number; file?: string }): void {
        this._loadStatus.set(progress.status);
        if (progress.progress !== undefined) {
            this._loadProgress.set(Math.round(progress.progress));
        }
        if (progress.file) {
            const shortName = progress.file.split('/').pop() || progress.file;
            this._loadStatus.set(`Loading ${shortName}...`);
        }
    }

    /**
     * Handle synthesized audio from worker - decode and add to buffer queue.
     */
    private async handleAudioReady(blob: Blob, _sampleRate: number): Promise<void> {
        if (this.stopRequested) {
            this.isGenerating = false;
            return;
        }

        try {
            await this.ensureAudioContext();

            // Decode the audio
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

            // Add to queue
            this.audioBufferQueue.push(audioBuffer);
            this.isGenerating = false;

            console.log(`[TtsService] Buffer decoded. Queue size: ${this.audioBufferQueue.length}`);

            // If nothing is playing/scheduled, start scheduling
            if (this.activeSourceNodes.length === 0 ||
                this.audioContext!.currentTime >= this.scheduledEndTime) {
                this.scheduleNextBuffer();
            }

            // Continue prefetching
            this.fillPrefetchBuffer();

        } catch (error) {
            console.error('[TtsService] Audio decode error:', error);
            this.isGenerating = false;
            this.fillPrefetchBuffer();
        }
    }
}
