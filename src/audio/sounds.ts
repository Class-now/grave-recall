/**
 * Named sounds. Every sound is synthesised, routed through the master
 * GainNode, and announces its caption. Before the first user gesture all
 * functions are silent no-ops (no sound, no caption, no error).
 */
import { cowardMode } from '../store/prefs';

import { ensureContext } from './context';
import { announceCaption, type SoundId } from './captions';
import {
  createFilter,
  createGain,
  createImpulse,
  createNoise,
  createOscillator,
  scheduleEnvelope,
  type Envelope,
} from './synth';

export const SoundClass = {
  SCARE: 'SCARE',
  AMBIENT: 'AMBIENT',
  REWARD: 'REWARD',
  NEUTRAL: 'NEUTRAL',
} as const;
export type SoundClass = (typeof SoundClass)[keyof typeof SoundClass];

interface SoundDefinition {
  soundClass: SoundClass;
  /** Audible length in ms; used for caption auto-hide. */
  durationMs: number;
  build: (ctx: AudioContext, out: AudioNode, t0: number) => void;
}

/** Plays one oscillator through its own envelope gain into `out`, then stops it. Returns the envelope gain. */
function playVoice(
  ctx: AudioContext,
  out: AudioNode,
  osc: OscillatorNode,
  t0: number,
  env: Envelope,
): GainNode {
  const gain = createGain(ctx, 0);
  const end = scheduleEnvelope(gain.gain, t0, env);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t0);
  osc.stop(end + 0.05);
  return gain;
}

const DEFINITIONS: Record<SoundId, SoundDefinition> = {
  // Sawtooth glide 80 -> 400 Hz over 0.6 s, band-pass Q=8, 0.8 s decay.
  'ghost-scream': {
    soundClass: SoundClass.SCARE,
    durationMs: 800,
    build(ctx, out, t0) {
      const osc = createOscillator(ctx, 'sawtooth', 80);
      osc.frequency.setValueAtTime(80, t0);
      osc.frequency.linearRampToValueAtTime(400, t0 + 0.6);
      const filter = createFilter(ctx, 'bandpass', 600, 8);
      const gain = createGain(ctx, 0);
      const end = scheduleEnvelope(gain.gain, t0, { attack: 0.05, peak: 0.6, decay: 0.75 });
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(end + 0.05);
    },
  },

  // Two sines (C5 + E5) under a triangle envelope, 0.4 s.
  'coward-chime': {
    soundClass: SoundClass.AMBIENT,
    durationMs: 400,
    build(ctx, out, t0) {
      for (const freq of [523.25, 659.25]) {
        playVoice(ctx, out, createOscillator(ctx, 'sine', freq), t0, {
          attack: 0.2,
          peak: 0.25,
          decay: 0.2,
        });
      }
    },
  },

  // Sine 440 -> 880 Hz over 0.2 s, harmonic fades out, 0.5 s total.
  'candle-seal': {
    soundClass: SoundClass.REWARD,
    durationMs: 500,
    build(ctx, out, t0) {
      const fundamental = createOscillator(ctx, 'sine', 440);
      fundamental.frequency.setValueAtTime(440, t0);
      fundamental.frequency.linearRampToValueAtTime(880, t0 + 0.2);
      playVoice(ctx, out, fundamental, t0, { attack: 0.02, peak: 0.4, decay: 0.48 });

      const harmonic = createOscillator(ctx, 'sine', 880);
      harmonic.frequency.setValueAtTime(880, t0);
      harmonic.frequency.linearRampToValueAtTime(1760, t0 + 0.2);
      playVoice(ctx, out, harmonic, t0, { attack: 0.02, peak: 0.15, decay: 0.3 });
    },
  },

  // Low 60 Hz sine pulse, 0.15 s.
  'hard-thud': {
    soundClass: SoundClass.NEUTRAL,
    durationMs: 150,
    build(ctx, out, t0) {
      playVoice(ctx, out, createOscillator(ctx, 'sine', 60), t0, {
        attack: 0.01,
        peak: 0.8,
        decay: 0.14,
      });
    },
  },

  // White-noise burst filtered at 2 kHz, 0.1 s.
  'page-turn': {
    soundClass: SoundClass.AMBIENT,
    durationMs: 100,
    build(ctx, out, t0) {
      const noise = createNoise(ctx, 0.1);
      const filter = createFilter(ctx, 'bandpass', 2000, 1);
      const gain = createGain(ctx, 0);
      scheduleEnvelope(gain.gain, t0, { attack: 0.01, peak: 0.3, decay: 0.09 });
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      noise.start(t0);
      noise.stop(t0 + 0.1);
    },
  },

  // Three sawtooth chirps 600 -> 900 Hz, 50 ms each, 80 ms apart.
  'crow-caw': {
    soundClass: SoundClass.AMBIENT,
    durationMs: 310,
    build(ctx, out, t0) {
      for (let i = 0; i < 3; i++) {
        const start = t0 + i * (0.05 + 0.08);
        const osc = createOscillator(ctx, 'sawtooth', 600);
        osc.frequency.setValueAtTime(600, start);
        osc.frequency.linearRampToValueAtTime(900, start + 0.05);
        playVoice(ctx, out, osc, start, { attack: 0.01, peak: 0.25, decay: 0.04 });
      }
    },
  },

  // Sine 220 Hz, 0.3 s attack, 1.5 s decay, convolver reverb.
  'session-end-toll': {
    soundClass: SoundClass.AMBIENT,
    durationMs: 1800,
    build(ctx, out, t0) {
      const reverb = createImpulse(ctx, 0.8);
      const wet = createGain(ctx, 0.35);
      reverb.connect(wet);
      wet.connect(out);

      const gain = playVoice(ctx, out, createOscillator(ctx, 'sine', 220), t0, {
        attack: 0.3,
        peak: 0.5,
        decay: 1.5,
      });
      gain.connect(reverb);
    },
  },

  // Ascending pentatonic arpeggio (C D E G A), five 60 ms sine pulses.
  'import-success': {
    soundClass: SoundClass.AMBIENT,
    durationMs: 300,
    build(ctx, out, t0) {
      [523.25, 587.33, 659.25, 783.99, 880].forEach((freq, i) => {
        playVoice(ctx, out, createOscillator(ctx, 'sine', freq), t0 + i * 0.06, {
          attack: 0.01,
          peak: 0.25,
          decay: 0.05,
        });
      });
    },
  },
};

function play(id: SoundId): void {
  const graph = ensureContext();
  if (!graph) return; // pre-gesture: silently dropped

  const def = DEFINITIONS[id];

  // Coward mode: every SCARE sound becomes the soft chime.
  if (def.soundClass === SoundClass.SCARE && cowardMode.value) {
    softChime();
    return;
  }

  try {
    def.build(graph.ctx, graph.master, graph.ctx.currentTime);
  } catch (e) {
    console.warn(`Sound "${id}" failed:`, e);
  }
  // Captions are shown whether or not synthesis succeeded.
  announceCaption(id, def.durationMs);
}

/** Again grade. Replaced by `softChime()` in Coward mode. */
export function ghostScream(): void {
  play('ghost-scream');
}

/** Coward-mode replacement for `ghostScream()`. */
export function softChime(): void {
  play('coward-chime');
}

/** Good or Easy grade. */
export function candleSeal(): void {
  play('candle-seal');
}

/** Hard grade. */
export function hardThud(): void {
  play('hard-thud');
}

/** Card flip. */
export function pageTurn(): void {
  play('page-turn');
}

/** Streak extended. */
export function crowCaw(): void {
  play('crow-caw');
}

/** Review session completed. */
export function sessionEndToll(): void {
  play('session-end-toll');
}

/** JSON import succeeded. */
export function importSuccess(): void {
  play('import-success');
}
