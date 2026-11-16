/**
 * Network audit (Task 14, AC-NFR-03.1 and AC-NFR-03.2).
 *
 * Two layers: a scan of the source for anything that can open a connection, and
 * a run of the app with every network API replaced by a recording stub.
 * Built-output checks (hosts, trackers) live in bundle.test.ts.
 */
import { h } from 'preact';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';

import { App } from './app';
import { activeDeckId, cards, createDeck, addCard, decks, loadStarterCrypts, reviewLog } from './store';

const SRC = resolve(__dirname);

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe('source scan', () => {
  const files = sourceFiles(SRC);

  it('finds the app source', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('contains no absolute http(s) or websocket URLs', () => {
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\b(?:https?|wss?):\/\//);
    }
  });

  it('uses no network API other than a same-origin fetch of the starter crypts', () => {
    const forbidden = /XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|navigator\.serviceWorker|@import|new Image\(|\.src\s*=/;
    const fetchCalls: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(forbidden);
      for (const m of text.matchAll(/\bfetch\(([^)]*)\)/g)) {
        fetchCalls.push(`${file.slice(SRC.length + 1)}: ${m[1] ?? ''}`);
      }
    }
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatch(/persistence\.ts: `\/starter-crypts\/\$\{file\}`/);
  });

  it('has no CSS url() that points off-site', () => {
    for (const file of files.filter((f) => f.endsWith('.css'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/url\(([^)]*)\)/g)) {
        expect(m[1] ?? '', file).toMatch(/^['"]?(?:#|data:|\/)/);
      }
    }
  });
});

describe('runtime audit', () => {
  const fetchStub = vi.fn();
  const xhrStub = vi.fn();
  const socketStub = vi.fn();
  const beaconStub = vi.fn();

  beforeEach(() => {
    fetchStub.mockReset();
    xhrStub.mockReset();
    socketStub.mockReset();
    beaconStub.mockReset();
    vi.stubGlobal('fetch', fetchStub);
    vi.stubGlobal('XMLHttpRequest', xhrStub);
    vi.stubGlobal('WebSocket', socketStub);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beaconStub });

    decks.value = [];
    cards.value = [];
    reviewLog.value = [];
    activeDeckId.value = null;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'sendBeacon');
  });

  it('first-launch seeding requests only the two bundled starter crypts, same-origin', async () => {
    fetchStub.mockResolvedValue({ ok: false });
    await loadStarterCrypts();

    const urls = fetchStub.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual(['/starter-crypts/english-100.json', '/starter-crypts/french-50.json']);
    for (const url of urls) expect(url.startsWith('/')).toBe(true);
    expect(urls.some((u) => u.startsWith('//'))).toBe(false);
  });

  it('rendering and navigating every view makes no network call', () => {
    const deck = createDeck('Audit');
    addCard(deck.id, 'word', 'meaning', 'an example');

    render(h(App, null));
    const views = screen.getByRole('navigation').querySelectorAll('button');
    expect(views.length).toBe(5);
    for (const button of views) fireEvent.click(button);

    expect(fetchStub).not.toHaveBeenCalled();
    expect(xhrStub).not.toHaveBeenCalled();
    expect(socketStub).not.toHaveBeenCalled();
    expect(beaconStub).not.toHaveBeenCalled();
  });
});
