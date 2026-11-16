/**
 * Settings panel tests (Task 12): each preference updates its signal and is
 * persisted, the language switches immediately, and export/import behave.
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';

import {
  addCard,
  cards,
  createDeck,
  decks,
  exportJson,
  isAppExport,
  loadPrefs,
  reviewLog,
} from '../../store';
import { cowardMode, locale, reducedMotion, reducedMotionUser, showCaptions, volume } from '../../store/prefs';
import { ensureContext, markGestureOccurred, resetAudioContext } from '../../audio/context';
import { captionEvent, resetCaptions } from '../../audio/captions';
import { en } from '../../i18n/en';
import { ja } from '../../i18n/ja';

import { FakeAudioContext } from '../../__fixtures__/fake-audio';
import { ExportImport, exportFileName } from './ExportImport';
import { SettingsPanel } from './SettingsPanel';

const PREFS_KEY = 'grave-recall-prefs';

function storedPrefs(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Record<string, unknown>;
}

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  locale.value = 'en';
  cowardMode.value = false;
  volume.value = 0.7;
  reducedMotionUser.value = false;
  showCaptions.value = true;
  localStorage.clear();
  resetCaptions();
}

beforeEach(() => {
  FakeAudioContext.reset();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  resetAudioContext();
  resetState();
});

afterEach(() => {
  cleanup();
  resetAudioContext();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetState();
});

describe('<SettingsPanel>', () => {
  it('has Audio, Appearance, Language and Data sections', () => {
    render(h(SettingsPanel, null));
    expect(screen.getByRole('heading', { level: 2, name: en['settings.title'] })).toBeTruthy();
    for (const key of ['settings.audio', 'settings.appearance', 'settings.language', 'settings.data'] as const) {
      expect(screen.getByRole('region', { name: en[key] })).toBeTruthy();
    }
  });

  it('exposes every control with an accessible name', () => {
    render(h(SettingsPanel, null));
    expect(screen.getByRole('slider', { name: en['settings.volume'] })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: en['settings.cowardMode'] })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: en['settings.captions'] })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: en['settings.reducedMotion'] })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: en['settings.language'] })).toBeTruthy();
    expect(screen.getByRole('button', { name: en['settings.export'] })).toBeTruthy();
    expect(screen.getByLabelText(en['settings.import'])).toBeTruthy();
  });
});

describe('Coward mode toggle', () => {
  it('updates the cowardMode signal and persists it', () => {
    render(h(SettingsPanel, null));
    const box = screen.getByRole('checkbox', { name: en['settings.cowardMode'] }) as HTMLInputElement;
    expect(box.checked).toBe(false);

    fireEvent.click(box);
    expect(cowardMode.value).toBe(true);
    expect(storedPrefs().cowardMode).toBe(true);

    // Restored on reload (AC-26.4).
    cowardMode.value = false;
    loadPrefs();
    expect(cowardMode.value).toBe(true);

    fireEvent.click(box);
    expect(cowardMode.value).toBe(false);
    expect(storedPrefs().cowardMode).toBe(false);
  });

  it('is independent of reduced motion (AC-26.5)', () => {
    render(h(SettingsPanel, null));
    fireEvent.click(screen.getByRole('checkbox', { name: en['settings.cowardMode'] }));
    expect(cowardMode.value).toBe(true);
    expect(reducedMotionUser.value).toBe(false);

    fireEvent.click(screen.getByRole('checkbox', { name: en['settings.reducedMotion'] }));
    expect(reducedMotionUser.value).toBe(true);
    expect(cowardMode.value).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: en['settings.cowardMode'] }));
    expect(cowardMode.value).toBe(false);
    expect(reducedMotionUser.value).toBe(true);
  });
});

describe('reduced-motion override', () => {
  it('sets the override, turns the effective reducedMotion signal on, and persists', () => {
    render(h(SettingsPanel, null));
    const box = screen.getByRole('checkbox', { name: en['settings.reducedMotion'] }) as HTMLInputElement;
    expect(reducedMotion.value).toBe(false);

    fireEvent.click(box);
    expect(reducedMotionUser.value).toBe(true);
    expect(reducedMotion.value).toBe(true);
    expect(storedPrefs().reducedMotion).toBe(true);

    fireEvent.click(box);
    expect(reducedMotionUser.value).toBe(false);
    expect(reducedMotion.value).toBe(false);
  });

  it('describes itself as separate from the device setting', () => {
    render(h(SettingsPanel, null));
    const box = screen.getByRole('checkbox', { name: en['settings.reducedMotion'] });
    const describedBy = box.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe(en['settings.reducedMotionDesc']);
    expect(en['settings.reducedMotionDesc']).toMatch(/device/i);
  });
});

describe('volume slider', () => {
  it('covers 0 to 1 and updates the signal and storage', () => {
    render(h(SettingsPanel, null));
    const slider = screen.getByRole('slider', { name: en['settings.volume'] }) as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('1');

    fireEvent.input(slider, { target: { value: '0.3' } });
    expect(volume.value).toBeCloseTo(0.3);
    expect(storedPrefs().volume).toBeCloseTo(0.3);
    expect(slider.getAttribute('aria-valuetext')).toBe('30%');
  });

  it('moves the master GainNode', () => {
    markGestureOccurred();
    const graph = ensureContext();
    expect(graph).not.toBeNull();

    render(h(SettingsPanel, null));
    const slider = screen.getByRole('slider', { name: en['settings.volume'] });
    fireEvent.input(slider, { target: { value: '0.25' } });
    expect(graph?.master.gain.value).toBeCloseTo(0.25);

    fireEvent.input(slider, { target: { value: '0' } });
    expect(graph?.master.gain.value).toBe(0);
  });
});

describe('show-captions toggle', () => {
  it('updates the signal and persists it (AC-25.4)', () => {
    render(h(SettingsPanel, null));
    const box = screen.getByRole('checkbox', { name: en['settings.captions'] }) as HTMLInputElement;
    expect(box.checked).toBe(true);

    fireEvent.click(box);
    expect(showCaptions.value).toBe(false);
    expect(storedPrefs().showCaptions).toBe(false);

    fireEvent.click(box);
    expect(showCaptions.value).toBe(true);
    expect(storedPrefs().showCaptions).toBe(true);
  });
});

describe('<LanguageSelector>', () => {
  it('switches the rendered text immediately and persists the choice', () => {
    render(h(SettingsPanel, null));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(en['settings.title']);

    fireEvent.click(screen.getByRole('radio', { name: '日本語' }));
    expect(locale.value).toBe('ja');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(ja['settings.title']);
    expect(screen.getByRole('button', { name: ja['settings.export'] })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: ja['settings.cowardMode'] })).toBeTruthy();
    expect(storedPrefs().locale).toBe('ja');

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(en['settings.title']);
  });

  it('shows the current locale as selected and keeps names in their own language', () => {
    locale.value = 'ja';
    render(h(SettingsPanel, null));
    expect((screen.getByRole('radio', { name: '日本語' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'English' }) as HTMLInputElement).checked).toBe(false);
  });

  it('ignores a corrupt stored locale on load', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ locale: 'xx', volume: 7 }));
    loadPrefs();
    expect(locale.value).toBe('en');
    expect(volume.value).toBe(0.7);
  });
});

describe('<ExportImport>', () => {
  function stubDownload(): { blobs: Blob[]; names: string[]; click: MockInstance } {
    const blobs: Blob[] = [];
    const names: string[] = [];
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return 'blob:grave-recall-test';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    return { blobs, names, click };
  }

  function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  function chooseFile(contents: string, label: string = en['settings.import']): void {
    const input = screen.getByLabelText(label) as HTMLInputElement;
    const file = new File([contents], 'backup.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('formats a sortable, file-system-safe timestamped name', () => {
    expect(exportFileName(new Date('2025-06-15T12:30:45.123Z'))).toBe('grave-recall-2025-06-15T12-30-45.json');
  });

  it('exports valid JSON as a timestamped download', async () => {
    const deck = createDeck('Crypt');
    addCard(deck.id, 'front', 'back', 'example');
    const { blobs, names, click } = stubDownload();

    render(h(ExportImport, null));
    fireEvent.click(screen.getByRole('button', { name: en['settings.export'] }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(names[0]).toMatch(/^grave-recall-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.type).toBe('application/json');

    const parsed: unknown = JSON.parse(await readBlob(blobs[0] as Blob));
    expect(isAppExport(parsed)).toBe(true);
    expect((parsed as { decks: unknown[] }).decks).toHaveLength(1);
    expect((parsed as { cards: unknown[] }).cards).toHaveLength(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:grave-recall-test');
    expect(screen.getByRole('status').textContent).toBe(en['settings.exportSuccess']);
    // The temporary link is gone again.
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('imports a valid file, replacing the current state, and plays the import sound', async () => {
    const deck = createDeck('Backed up');
    addCard(deck.id, 'kept', 'answer', null);
    const backup = exportJson();

    decks.value = [];
    cards.value = [];
    createDeck('Something else');
    markGestureOccurred();

    render(h(ExportImport, null));
    chooseFile(backup);

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(en['settings.importSuccess']));
    expect(decks.value.map((d) => d.name)).toEqual(['Backed up']);
    expect(cards.value.map((c) => c.front)).toEqual(['kept']);
    expect(captionEvent.value?.soundId).toBe('import-success');
    expect(screen.queryByRole('alert')?.textContent).toBe('');
  });

  it('importing an export of an empty state empties the current state', async () => {
    const empty = exportJson();
    const deck = createDeck('Doomed');
    addCard(deck.id, 'x', 'y', null);

    render(h(ExportImport, null));
    chooseFile(empty);

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(en['settings.importSuccess']));
    expect(decks.value).toEqual([]);
    expect(cards.value).toEqual([]);
  });

  it('shows a localised error for invalid JSON and leaves state unchanged', async () => {
    const deck = createDeck('Untouched');
    addCard(deck.id, 'front', 'back', null);
    const decksBefore = decks.value;
    const cardsBefore = cards.value;
    markGestureOccurred();

    render(h(ExportImport, null));
    chooseFile('{ this is not json');

    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(''));
    expect(screen.getByRole('alert').textContent).toBe(`Import failed: ${en['error.invalidJson']}`);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(decks.value).toBe(decksBefore);
    expect(cards.value).toBe(cardsBefore);
    expect(captionEvent.value).toBeNull();
  });

  it('shows the error in the active language', async () => {
    locale.value = 'ja';
    render(h(ExportImport, null));
    chooseFile('nope', ja['settings.import']);

    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(''));
    expect(screen.getByRole('alert').textContent).toBe(`インポート失敗: ${ja['error.invalidJson']}`);
  });

  it('rejects well-formed JSON of the wrong shape without changing state', async () => {
    createDeck('Untouched');
    const decksBefore = decks.value;

    render(h(ExportImport, null));
    chooseFile(JSON.stringify({ version: 2, hello: 'world' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(''));
    expect(screen.getByRole('alert').textContent).toBe(`Import failed: ${en['error.importFailed']}`);
    expect(decks.value).toBe(decksBefore);
  });

  it('does not half-apply a file whose later records are malformed', async () => {
    createDeck('Untouched');
    const decksBefore = decks.value;
    const cardsBefore = cards.value;

    // Decks are valid but the card has no scheduling state.
    const broken = {
      version: 1,
      exportedAt: new Date().toISOString(),
      decks: [{ id: 'd1', name: 'New', createdAt: new Date().toISOString() }],
      cards: [{ id: 'c1', deckId: 'd1', front: 'a', back: 'b' }],
      reviewLog: [],
      prefs: {},
    };

    render(h(ExportImport, null));
    chooseFile(JSON.stringify(broken));

    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(''));
    expect(decks.value).toBe(decksBefore);
    expect(cards.value).toBe(cardsBefore);
  });
});
