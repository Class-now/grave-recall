/**
 * Lazy AudioContext singleton.
 *
 * The context is created only after the first user gesture. Before that,
 * `ensureContext()` returns null and every sound is a silent no-op. All sound
 * output is routed through a single master GainNode that mirrors the volume
 * preference. Muting sets the gain to 0; the context is never suspended.
 */
import { effect } from '@preact/signals';

import { volume } from '../store/prefs';

export interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
}

let gestureOccurred = false;
let graph: AudioGraph | null = null;
let disposeVolumeEffect: (() => void) | null = null;

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function resumeIfSuspended(ctx: AudioContext): void {
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch((e: unknown) => {
        console.warn('AudioContext resume failed:', e);
      });
    }
  } catch (e) {
    console.warn('AudioContext resume failed:', e);
  }
}

/**
 * Records that a user gesture (click, keydown, touchstart) has happened and
 * creates the AudioContext and master gain if they do not exist yet.
 * Safe to call repeatedly. Never throws.
 */
export function markGestureOccurred(): void {
  if (graph) {
    resumeIfSuspended(graph.ctx);
    return;
  }
  if (gestureOccurred) return; // creation already attempted and failed
  gestureOccurred = true;

  try {
    if (typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = clampVolume(volume.peek());
    master.connect(ctx.destination);
    graph = { ctx, master };

    disposeVolumeEffect = effect(() => {
      master.gain.value = clampVolume(volume.value);
    });
    resumeIfSuspended(ctx);
  } catch (e) {
    console.warn('AudioContext unavailable; sounds disabled:', e);
    graph = null;
  }
}

/**
 * Returns the audio graph, or null if no user gesture has occurred yet
 * (or the AudioContext could not be created). Never creates the context.
 */
export function ensureContext(): AudioGraph | null {
  return graph;
}

/** Whether a user gesture has been recorded. */
export function hasGestureOccurred(): boolean {
  return gestureOccurred;
}

/** Test hook: tears down the singleton so tests can start from the pre-gesture state. */
export function resetAudioContext(): void {
  disposeVolumeEffect?.();
  disposeVolumeEffect = null;
  graph = null;
  gestureOccurred = false;
}
