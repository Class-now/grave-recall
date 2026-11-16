/**
 * Minimal fake Web Audio API for component tests: enough surface for every
 * sound in src/audio/sounds.ts to run without a browser.
 */
import { vi } from 'vitest';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
}

class FakeNode {
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  type = 'sine';
  buffer: unknown = null;
  frequency = new FakeParam();
  gain = new FakeParam();
  Q = new FakeParam();
}

export class FakeAudioContext {
  /** Number of contexts constructed since the last `reset()`. */
  static created = 0;

  static reset(): void {
    FakeAudioContext.created = 0;
  }

  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = new FakeNode();
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    FakeAudioContext.created += 1;
  }

  createOscillator = (): FakeNode => new FakeNode();
  createGain = (): FakeNode => new FakeNode();
  createBiquadFilter = (): FakeNode => new FakeNode();
  createBufferSource = (): FakeNode => new FakeNode();
  createConvolver = (): FakeNode => new FakeNode();
  createBuffer = (_channels: number, length: number): { getChannelData: () => Float32Array } => {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  };
}