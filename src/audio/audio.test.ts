/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cowardMode, volume } from '../store/prefs';
import { en } from '../i18n/en';
import { ja } from '../i18n/ja';

import { captionEvent, resetCaptions, SOUND_CAPTIONS, type SoundId } from './captions';
import { ensureContext, markGestureOccurred, resetAudioContext } from './context';
import {
  candleSeal,
  crowCaw,
  ghostScream,
  hardThud,
  importSuccess,
  pageTurn,
  sessionEndToll,
  softChime,
} from './sounds';

// ---- Minimal mocked Web Audio API ----------------------------------------

class MockParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
}

class MockNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillator extends MockNode {
  type: string = 'sine';
  frequency = new MockParam();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain extends MockNode {
  gain = new MockParam();
}

class MockFilter extends MockNode {
  type: string = 'lowpass';
  frequency = new MockParam();
  Q = new MockParam();
}

class MockBufferSource extends MockNode {
  buffer: unknown = null;
  start = vi.fn();
  stop = vi.fn();
}

class MockConvolver extends MockNode {
  buffer: unknown = null;
}

let contexts: MockAudioContext[] = [];

class MockAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = new MockNode();
  oscillators: MockOscillator[] = [];
  gains: MockGain[] = [];
  filters: MockFilter[] = [];
  bufferSources: MockBufferSource[] = [];
  convolvers: MockConvolver[] = [];
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    contexts.push(this);
  }
  createOscillator(): MockOscillator {
    const n = new MockOscillator();
    this.oscillators.push(n);
    return n;
  }
  createGain(): MockGain {
    const n = new MockGain();
    this.gains.push(n);
    return n;
  }
  createBiquadFilter(): MockFilter {
    const n = new MockFilter();
    this.filters.push(n);
    return n;
  }
  createBufferSource(): MockBufferSource {
    const n = new MockBufferSource();
    this.bufferSources.push(n);
    return n;
  }
  createConvolver(): MockConvolver {
    const n = new MockConvolver();
    this.convolvers.push(n);
    return n;
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

function currentContext(): MockAudioContext {
  const ctx = contexts[contexts.length - 1];
  if (!ctx) throw new Error('No AudioContext was created');
  return ctx;
}

const ALL_SOUNDS: Array<[string, () => void]> = [
  ['ghostScream', ghostScream],
  ['softChime', softChime],
  ['candleSeal', candleSeal],
  ['hardThud', hardThud],
  ['pageTurn', pageTurn],
  ['crowCaw', crowCaw],
  ['sessionEndToll', sessionEndToll],
  ['importSuccess', importSuccess],
];

beforeEach(() => {
  contexts = [];
  vi.stubGlobal('AudioContext', MockAudioContext);
  resetAudioContext();
  resetCaptions();
  cowardMode.value = false;
  volume.value = 0.7;
});

afterEach(() => {
  resetAudioContext();
  vi.unstubAllGlobals();
});

describe('pre-gesture behaviour', () => {
  it('ensureContext returns null and creates nothing before a gesture', () => {
    expect(ensureContext()).toBeNull();
    expect(contexts).toHaveLength(0);
  });

  it.each(ALL_SOUNDS)('%s is a silent no-op before the first gesture', (_name, play) => {
    expect(() => play()).not.toThrow();
    expect(contexts).toHaveLength(0);
    expect(captionEvent.value).toBeNull();
  });

  it('sounds work after markGestureOccurred', () => {
    markGestureOccurred();
    candleSeal();
    expect(currentContext().oscillators.length).toBeGreaterThan(0);
    expect(captionEvent.value?.soundId).toBe('candle-seal');
  });

  it('reuses one AudioContext across gestures', () => {
    markGestureOccurred();
    markGestureOccurred();
    expect(contexts).toHaveLength(1);
  });

  it('resumes a suspended context on a later gesture', () => {
    markGestureOccurred();
    const ctx = currentContext();
    ctx.state = 'suspended';
    markGestureOccurred();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('stays silent without throwing when AudioContext is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => markGestureOccurred()).not.toThrow();
    expect(ensureContext()).toBeNull();
    expect(() => ghostScream()).not.toThrow();
  });
});

describe('master gain', () => {
  it('routes sounds through the master gain and mirrors volume', () => {
    markGestureOccurred();
    const graph = ensureContext();
    expect(graph).not.toBeNull();
    const master = graph?.master as unknown as MockGain;
    expect(master.gain.value).toBe(0.7);
    expect(master.connect).toHaveBeenCalledWith(currentContext().destination);

    volume.value = 0;
    expect(master.gain.value).toBe(0);
    volume.value = 5;
    expect(master.gain.value).toBe(1);

    hardThud();
    const voiceGain = currentContext().gains.find((g) => g !== master);
    expect(voiceGain?.connect).toHaveBeenCalledWith(master);
  });

  it('muting does not suspend the context', () => {
    markGestureOccurred();
    volume.value = 0;
    expect(currentContext().resume).not.toHaveBeenCalled();
    expect(currentContext().state).toBe('running');
  });
});

describe('Coward mode', () => {
  it('plays the scream (sawtooth) when coward mode is off', () => {
    markGestureOccurred();
    ghostScream();
    const ctx = currentContext();
    expect(ctx.oscillators.map((o) => o.type)).toEqual(['sawtooth']);
    expect(ctx.filters[0]?.Q.value).toBe(8);
    expect(captionEvent.value?.soundId).toBe('ghost-scream');
  });

  it('plays softChime (C5 + E5 sines) instead of ghostScream when coward mode is on', () => {
    cowardMode.value = true;
    markGestureOccurred();
    ghostScream();
    const ctx = currentContext();
    expect(ctx.oscillators.map((o) => o.type)).toEqual(['sine', 'sine']);
    expect(ctx.oscillators.map((o) => o.frequency.value)).toEqual([523.25, 659.25]);
    expect(ctx.filters).toHaveLength(0);
    expect(captionEvent.value?.soundId).toBe('coward-chime');
    expect(captionEvent.value?.captionKey).toBe('caption.softChime');
  });

  it('leaves all other sounds unchanged in coward mode', () => {
    cowardMode.value = true;
    markGestureOccurred();
    crowCaw();
    expect(currentContext().oscillators.map((o) => o.type)).toEqual([
      'sawtooth',
      'sawtooth',
      'sawtooth',
    ]);
    expect(captionEvent.value?.soundId).toBe('crow-caw');
  });
});

describe('sound synthesis', () => {
  beforeEach(() => markGestureOccurred());

  it('hardThud is a 60 Hz sine', () => {
    hardThud();
    const osc = currentContext().oscillators[0];
    expect(osc?.type).toBe('sine');
    expect(osc?.frequency.value).toBe(60);
  });

  it('pageTurn uses a noise source filtered at 2 kHz', () => {
    pageTurn();
    const ctx = currentContext();
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0]?.start).toHaveBeenCalled();
    expect(ctx.filters[0]?.frequency.value).toBe(2000);
  });

  it('crowCaw schedules three chirps 600 to 900 Hz, 50 ms long, 80 ms apart', () => {
    crowCaw();
    const oscs = currentContext().oscillators;
    expect(oscs).toHaveLength(3);
    const starts = oscs.map((o) => o.start.mock.calls[0]?.[0] as number);
    expect(starts[1]! - starts[0]!).toBeCloseTo(0.13, 5);
    expect(starts[2]! - starts[1]!).toBeCloseTo(0.13, 5);
    expect(oscs[0]?.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
      900,
      expect.closeTo(0.05, 5),
    );
  });

  it('importSuccess plays five sine pulses 60 ms apart', () => {
    importSuccess();
    const oscs = currentContext().oscillators;
    expect(oscs).toHaveLength(5);
    const starts = oscs.map((o) => o.start.mock.calls[0]?.[0] as number);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]! - starts[i - 1]!).toBeCloseTo(0.06, 5);
    }
  });

  it('sessionEndToll is a 220 Hz sine with a convolver reverb', () => {
    sessionEndToll();
    const ctx = currentContext();
    expect(ctx.oscillators[0]?.frequency.value).toBe(220);
    expect(ctx.convolvers).toHaveLength(1);
    expect(ctx.convolvers[0]?.buffer).not.toBeNull();
  });

  it('candleSeal glides 440 to 880 Hz', () => {
    candleSeal();
    const osc = currentContext().oscillators[0];
    expect(osc?.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
    expect(osc?.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(880, expect.closeTo(0.2, 5));
  });

  it('still shows the caption and does not throw if synthesis fails', () => {
    const ctx = currentContext();
    ctx.createOscillator = () => {
      throw new Error('boom');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => hardThud()).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(captionEvent.value?.soundId).toBe('hard-thud');
    warn.mockRestore();
  });
});

describe('captions', () => {
  it('every sound ID maps to a key present in both locales', () => {
    for (const id of Object.keys(SOUND_CAPTIONS) as SoundId[]) {
      const key = SOUND_CAPTIONS[id];
      expect(en[key], `en ${key}`).toBeTruthy();
      expect(ja[key], `ja ${key}`).toBeTruthy();
    }
  });

  it('each play publishes a new event with the sound duration', () => {
    markGestureOccurred();
    pageTurn();
    const first = captionEvent.value;
    pageTurn();
    const second = captionEvent.value;
    expect(first?.durationMs).toBe(100);
    expect(second?.seq).toBeGreaterThan(first?.seq ?? 0);
  });

  it('covers all eight catalogue sounds', () => {
    expect(Object.keys(SOUND_CAPTIONS)).toHaveLength(8);
  });
});

describe('module boundaries', () => {
  it('audio/ never imports from components/', () => {
    const sources = import.meta.glob<string>('./*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    const files = Object.entries(sources).filter(([name]) => !name.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const [name, source] of files) {
      expect(source, name).not.toMatch(/from\s+['"][^'"]*components\//);
    }
  });
});
