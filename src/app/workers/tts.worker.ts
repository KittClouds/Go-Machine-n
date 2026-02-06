/// <reference lib="webworker" />
// src/app/workers/tts.worker.ts
// Text-to-Speech worker - handles TTS model loading and speech synthesis off main thread

import { pipeline, env } from '@huggingface/transformers';

// ============================================================================
// Types
// ============================================================================

export type TTSWorkerMessage =
    | { type: 'LOAD_MODEL' }
    | { type: 'SPEAK'; payload: { text: string; voiceUrl: string } }
    | { type: 'STOP' }
    | { type: 'GET_STATUS' };

export type TTSResponseMessage =
    | { type: 'PROGRESS'; payload: { status: string; progress?: number; file?: string } }
    | { type: 'MODEL_READY' }
    | { type: 'MODEL_ERROR'; payload: { message: string } }
    | { type: 'AUDIO_READY'; payload: { blob: Blob; sampleRate: number } }
    | { type: 'SPEAK_ERROR'; payload: { message: string } }
    | { type: 'STATUS'; payload: { modelLoaded: boolean } };

// TTS Pipeline interface (simplified)
interface TTSPipeline {
    (text: string, options?: Record<string, unknown>): Promise<{ toBlob(): Promise<Blob> }>;
}

// ============================================================================
// Configuration
// ============================================================================

const MODEL_ID = 'onnx-community/Supertonic-TTS-2-ONNX';

// Configure transformers.js for web worker environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// ============================================================================
// Worker State
// ============================================================================

let tts: TTSPipeline | null = null;
let isModelLoading = false;

// ============================================================================
// Message Handler
// ============================================================================

onmessage = async (e: MessageEvent<TTSWorkerMessage>) => {
    const { type } = e.data;

    try {
        switch (type) {
            case 'LOAD_MODEL':
                await loadModel();
                break;

            case 'SPEAK': {
                const payload = (e.data as Extract<TTSWorkerMessage, { type: 'SPEAK' }>).payload;
                await speak(payload.text, payload.voiceUrl);
                break;
            }

            case 'STOP':
                // Future: implement stop functionality if needed
                break;

            case 'GET_STATUS':
                postMessage({
                    type: 'STATUS',
                    payload: { modelLoaded: tts !== null }
                } as TTSResponseMessage);
                break;

            default:
                console.warn('[TTS Worker] Unknown message type:', type);
        }
    } catch (error) {
        console.error('[TTS Worker] Error:', error);
        postMessage({
            type: 'MODEL_ERROR',
            payload: { message: error instanceof Error ? error.message : String(error) }
        } as TTSResponseMessage);
    }
};

// ============================================================================
// Model Loading
// ============================================================================

async function loadModel(): Promise<void> {
    if (tts) {
        postMessage({ type: 'MODEL_READY' } as TTSResponseMessage);
        return;
    }

    if (isModelLoading) {
        console.log('[TTS Worker] Model already loading...');
        return;
    }

    isModelLoading = true;
    console.log('[TTS Worker] Loading Supertonic TTS model...');

    try {
        // Cast through any to avoid complex union type issues with @huggingface/transformers
        const loadedPipeline = await (pipeline as any)('text-to-speech', MODEL_ID, {
            progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
                postMessage({
                    type: 'PROGRESS',
                    payload: progress
                } as TTSResponseMessage);
            }
        });
        tts = loadedPipeline as TTSPipeline;

        console.log('[TTS Worker] Model loaded successfully!');
        postMessage({ type: 'MODEL_READY' } as TTSResponseMessage);
    } catch (error) {
        console.error('[TTS Worker] Failed to load model:', error);
        postMessage({
            type: 'MODEL_ERROR',
            payload: { message: error instanceof Error ? error.message : String(error) }
        } as TTSResponseMessage);
    } finally {
        isModelLoading = false;
    }
}

// ============================================================================
// Speech Synthesis
// ============================================================================

async function speak(text: string, voiceUrl: string): Promise<void> {
    if (!tts) {
        postMessage({
            type: 'SPEAK_ERROR',
            payload: { message: 'Model not loaded. Call LOAD_MODEL first.' }
        } as TTSResponseMessage);
        return;
    }

    if (!text || text.trim().length === 0) {
        postMessage({
            type: 'SPEAK_ERROR',
            payload: { message: 'No text provided.' }
        } as TTSResponseMessage);
        return;
    }

    console.log('[TTS Worker] Generating speech for:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

    try {
        // Wrap text in language tags for English
        const inputText = `<en>${text}</en>`;

        const output = await tts(inputText, {
            speaker_embeddings: voiceUrl,
            num_inference_steps: 5, // Higher = better quality (1-50)
            speed: 1.05            // Slightly faster speech
        });

        // Convert to blob for transfer
        const blob = await (output as any).toBlob();

        postMessage({
            type: 'AUDIO_READY',
            payload: {
                blob,
                sampleRate: 44100 // Supertonic uses 44.1kHz
            }
        } as TTSResponseMessage);

    } catch (error) {
        console.error('[TTS Worker] Speech generation failed:', error);
        postMessage({
            type: 'SPEAK_ERROR',
            payload: { message: error instanceof Error ? error.message : String(error) }
        } as TTSResponseMessage);
    }
}

console.log('[TTS Worker] Initialized and ready for messages.');
