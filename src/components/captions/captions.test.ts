/**
 * Caption bar and live region tests (AC-25.1, AC-25.3, AC-25.4).
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/preact';

import { announceCaption, CAPTION_HIDE_DELAY_MS, resetCaptions } from '../../audio/captions';
import { resetAudioContext } from '../../audio/context';
import { importSuccess, pageTurn } from '../../audio/sounds';
import { locale, showCaptions } from '../../store/prefs';
import { en } from '../../i18n/en';
import { ja } from '../../i18n/ja';

import { FakeAudioContext } from '../../__fixtures__/fake-audio';
import { App } from '../../app';
import { CaptionBar } from './CaptionBar';

function bar(): HTMLElement {
  return screen.getByTestId('caption-bar');
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeAudioContext.reset();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  resetAudioContext();
  resetCaptions();
  locale.value = 'en';
  showCaptions.value = false;
});

afterEach(() => {
  cleanup();
  resetAudioContext();
  resetCaptions();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  locale.value = 'en';
  showCaptions.value = false;
});

describe('<CaptionBar> live region', () => {
  it('is rendered before any sound, as an empty polite live region that is not visible', () => {
    render(h(CaptionBar, null));
    expect(bar().getAttribute('aria-live')).toBe('polite');
    expect(bar().textContent).toBe('');
    expect(bar().classList.contains('gr-captions--visible')).toBe(false);
  });

  it('shows the caption for a sound in the live region (AC-25.1)', () => {
    render(h(CaptionBar, null));
    act(() => announceCaption('page-turn', 100));
    expect(bar().textContent).toBe(en['caption.pageTurn']);
    expect(bar().classList.contains('gr-captions--visible')).toBe(true);
  });

  it('hides the caption after the sound duration plus 500 ms, not before (AC-25.3)', () => {
    render(h(CaptionBar, null));
    act(() => announceCaption('candle-seal', 500));

    advance(500 + CAPTION_HIDE_DELAY_MS - 1);
    expect(bar().textContent).toBe(en['caption.candleSeal']);

    advance(1);
    expect(bar().textContent).toBe('');
    expect(bar().classList.contains('gr-captions--visible')).toBe(false);
  });

  it('restarts the hide timer when a new sound plays', () => {
    render(h(CaptionBar, null));
    act(() => announceCaption('page-turn', 100));
    advance(500);
    act(() => announceCaption('hard-thud', 150));
    advance(200); // the first caption's timer would have fired by now
    expect(bar().textContent).toBe(en['caption.hardThud']);
    advance(450);
    expect(bar().textContent).toBe('');
  });

  it('announces a repeated caption again by replacing its text node', () => {
    render(h(CaptionBar, null));
    act(() => announceCaption('page-turn', 100));
    const first = bar().firstElementChild;
    act(() => announceCaption('page-turn', 100));
    const second = bar().firstElementChild;
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });

  it('translates the caption and follows a language change', () => {
    render(h(CaptionBar, null));
    act(() => announceCaption('crow-caw', 300));
    expect(bar().textContent).toBe(en['caption.crowCaw']);
    act(() => {
      locale.value = 'ja';
    });
    expect(bar().textContent).toBe(ja['caption.crowCaw']);
  });

  it('stays visible with the latest caption when "Show Captions" is on (AC-25.4)', () => {
    showCaptions.value = true;
    render(h(CaptionBar, null));
    act(() => announceCaption('hard-thud', 150));
    advance(10_000);
    expect(bar().textContent).toBe(en['caption.hardThud']);
    expect(bar().classList.contains('gr-captions--visible')).toBe(true);
  });

  it('hides an expired caption when "Show Captions" is switched off', () => {
    showCaptions.value = true;
    render(h(CaptionBar, null));
    act(() => announceCaption('hard-thud', 150));
    advance(10_000);
    act(() => {
      showCaptions.value = false;
    });
    expect(bar().textContent).toBe('');
  });

  it('cancels its timer on unmount', () => {
    const view = render(h(CaptionBar, null));
    act(() => announceCaption('page-turn', 100));
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('caption bar in the app root', () => {
  it('is part of <App> and shows captions for sounds that really play', () => {
    render(h(App, null));
    expect(bar().getAttribute('aria-live')).toBe('polite');

    // Before the first gesture sounds are silent and publish no caption.
    act(() => pageTurn());
    expect(bar().textContent).toBe('');

    act(() => {
      document.dispatchEvent(new Event('keydown', { bubbles: true }));
    });
    act(() => pageTurn());
    expect(bar().textContent).toBe(en['caption.pageTurn']);

    act(() => importSuccess());
    expect(bar().textContent).toBe(en['caption.importSuccess']);

    advance(2000);
    expect(bar().textContent).toBe('');
  });
});
