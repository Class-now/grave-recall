/**
 * AC-24.4: a runtime change of `prefers-reduced-motion` updates the signal
 * without a reload.
 *
 * prefs.ts reads and subscribes to the media query when it is first imported,
 * so each test installs a controllable matchMedia and imports a fresh copy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ChangeListener = (e: { matches: boolean }) => void;

interface FakeMediaQuery {
  matches: boolean;
  media: string;
  addEventListener: (type: string, listener: ChangeListener) => void;
  removeEventListener: (type: string, listener: ChangeListener) => void;
}

let osReduces = false;
let listeners: ChangeListener[] = [];

/** Simulates the user flipping the OS setting while the page is open. */
function setOsReducedMotion(value: boolean): void {
  osReduces = value;
  for (const listener of listeners) listener({ matches: value });
}

function installMatchMedia(): void {
  window.matchMedia = vi.fn((query: string): FakeMediaQuery => ({
    get matches(): boolean {
      return query.includes('prefers-reduced-motion') ? osReduces : false;
    },
    media: query,
    addEventListener: (type, listener) => {
      if (type === 'change') listeners.push(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners = listeners.filter((l) => l !== listener);
    },
  })) as unknown as typeof window.matchMedia;
}

async function freshPrefs(): Promise<typeof import('./prefs')> {
  vi.resetModules();
  return import('./prefs');
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  osReduces = false;
  listeners = [];
  installMatchMedia();
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.resetModules();
});

describe('reducedMotion signal and the prefers-reduced-motion media query', () => {
  it('starts from the OS setting', async () => {
    osReduces = true;
    const prefs = await freshPrefs();
    expect(prefs.reducedMotion.value).toBe(true);
  });

  it('subscribes to the media query exactly once', async () => {
    await freshPrefs();
    expect(listeners).toHaveLength(1);
  });

  it('follows the OS setting when it changes at runtime', async () => {
    const prefs = await freshPrefs();
    expect(prefs.reducedMotion.value).toBe(false);

    setOsReducedMotion(true);
    expect(prefs.reducedMotion.value).toBe(true);

    setOsReducedMotion(false);
    expect(prefs.reducedMotion.value).toBe(false);
  });

  it('notifies effects that read the signal when the OS setting changes', async () => {
    const { reducedMotion } = await freshPrefs();
    const { effect } = await import('@preact/signals');
    const seen: boolean[] = [];
    const dispose = effect(() => {
      seen.push(reducedMotion.value);
    });
    setOsReducedMotion(true);
    setOsReducedMotion(false);
    dispose();
    expect(seen).toEqual([false, true, false]);
  });

  it('keeps reduced motion on while the user override is set, whatever the OS does', async () => {
    const prefs = await freshPrefs();
    prefs.updatePref('reducedMotion', true);
    expect(prefs.reducedMotion.value).toBe(true);

    setOsReducedMotion(true);
    setOsReducedMotion(false);
    expect(prefs.reducedMotion.value).toBe(true);
  });

  it('returns to the OS setting when the override is switched off', async () => {
    const prefs = await freshPrefs();
    prefs.updatePref('reducedMotion', true);

    osReduces = true; // OS changed while the override hid it
    prefs.updatePref('reducedMotion', false);
    expect(prefs.reducedMotion.value).toBe(true);

    setOsReducedMotion(false);
    expect(prefs.reducedMotion.value).toBe(false);
  });
});
