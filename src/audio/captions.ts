/**
 * Caption mapping for every synthesised sound.
 *
 * Each sound ID maps to a TranslationKey that exists in both locale files.
 * Playing a sound publishes a CaptionEvent; the caption bar / live region
 * (Task 13) subscribes to `captionEvent` and hides itself after
 * `durationMs + CAPTION_HIDE_DELAY_MS`.
 */
import { signal } from '@preact/signals';

import type { TranslationKey } from '../i18n/types';

export type SoundId =
  | 'ghost-scream'
  | 'coward-chime'
  | 'candle-seal'
  | 'hard-thud'
  | 'page-turn'
  | 'crow-caw'
  | 'session-end-toll'
  | 'import-success';

export const SOUND_CAPTIONS: Record<SoundId, TranslationKey> = {
  'ghost-scream': 'caption.ghostScream',
  'coward-chime': 'caption.softChime',
  'candle-seal': 'caption.candleSeal',
  'hard-thud': 'caption.hardThud',
  'page-turn': 'caption.pageTurn',
  'crow-caw': 'caption.crowCaw',
  'session-end-toll': 'caption.sessionEndToll',
  'import-success': 'caption.importSuccess',
};

/** Extra time a caption stays visible after its sound ends (AC-25.3). */
export const CAPTION_HIDE_DELAY_MS = 500;

export interface CaptionEvent {
  /** Increments on every event so repeated identical sounds still notify subscribers. */
  seq: number;
  soundId: SoundId;
  captionKey: TranslationKey;
  durationMs: number;
}

/** Most recent caption event, or null if no sound has played. */
export const captionEvent = signal<CaptionEvent | null>(null);

let seq = 0;

export function announceCaption(soundId: SoundId, durationMs: number): void {
  seq += 1;
  captionEvent.value = {
    seq,
    soundId,
    captionKey: SOUND_CAPTIONS[soundId],
    durationMs,
  };
}

/** Test hook: clears the published caption. */
export function resetCaptions(): void {
  captionEvent.value = null;
}
