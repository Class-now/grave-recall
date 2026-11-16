// @vitest-environment node
/**
 * Build-output checks (Task 14): gzipped JS size (AC-NFR-01.2) and the list of
 * hosts the shipped files can contact (AC-NFR-03.1, AC-NFR-03.2).
 *
 * The production build runs in memory (`write: false`), so this test neither
 * needs nor touches `dist/`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { build, type Rollup } from 'vite';

const ROOT = resolve(__dirname, '..');
const JS_BUDGET_BYTES = 150 * 1024;

/** Hosts the page may contact. Fonts are loaded from Google Fonts (AC-NFR-03.1). */
const ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
/** XML namespace identifiers inside SVG/DOM code. They name a schema and are never requested. */
const NAMESPACE_HOSTS = new Set(['www.w3.org']);

type Output = Rollup.OutputChunk | Rollup.OutputAsset;

let output: Output[] = [];

beforeAll(async () => {
  // Vitest runs with NODE_ENV=test, which makes the Preact plugin add its debug and
  // devtools modules. Build the way 'npm run build' does.
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  let result: Awaited<ReturnType<typeof build>>;
  try {
    result = await build({
      root: ROOT,
      mode: 'production',
      logLevel: 'silent',
      build: { write: false },
    });
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
  const builds = Array.isArray(result) ? result : [result];
  output = builds.flatMap((b) => ('output' in b ? b.output : []));
}, 120_000);

function sourceOf(item: Output): string {
  if (item.type === 'chunk') return item.code;
  return typeof item.source === 'string' ? item.source : Buffer.from(item.source).toString('utf8');
}

function hostsIn(text: string): string[] {
  const hosts: string[] = [];
  for (const match of text.matchAll(/(?:https?|wss?):\/\/[^\s"'`)<>\\,;]+/g)) {
    try {
      hosts.push(new URL(match[0]).hostname);
    } catch {
      hosts.push(match[0]);
    }
  }
  return hosts;
}

describe('initial JavaScript size (AC-NFR-01.2)', () => {
  it('gzips to at most 150 KB', () => {
    const chunks = output.filter(
      (o): o is Rollup.OutputChunk => o.type === 'chunk' && !o.isDynamicEntry,
    );
    expect(chunks.length).toBeGreaterThan(0);
    const gzipped = chunks.reduce((sum, c) => sum + gzipSync(c.code).length, 0);
    expect(gzipped).toBeLessThanOrEqual(JS_BUDGET_BYTES);
  });

  it('does not pull in preact/compat or the debug and devtools add-ons', () => {
    const modules = output.flatMap((o) => (o.type === 'chunk' ? Object.keys(o.modules) : []));
    const unwanted = modules.filter((m) => /node_modules\/preact\/(compat|debug|devtools)\//.test(m.replace(/\\/g, '/')));
    expect(unwanted).toEqual([]);
  });
});

describe('outbound requests (AC-NFR-03.1, AC-NFR-03.2)', () => {
  it('only references the font hosts (plus XML namespace names) in the built files', () => {
    const found = new Set<string>();
    for (const item of output) {
      for (const host of hostsIn(sourceOf(item))) found.add(host);
    }
    const unexpected = [...found].filter((h) => !ALLOWED_HOSTS.has(h) && !NAMESPACE_HOSTS.has(h));
    expect(unexpected).toEqual([]);
  });

  it('loads every external stylesheet and script from an allowed host', () => {
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1] ?? '');
    const external = refs.filter((r) => /^(?:https?:)?\/\//.test(r));
    for (const ref of external) {
      const host = new URL(ref.startsWith('//') ? `https:${ref}` : ref).hostname;
      expect(ALLOWED_HOSTS.has(host), `${ref} is not an allowed host`).toBe(true);
    }
  });

  it('has no analytics or tracker snippets in the built files', () => {
    const trackers = /google-analytics|googletagmanager|gtag\(|plausible|segment\.com|mixpanel|hotjar|sentry|fullstory|clarity\.ms/i;
    for (const item of output) {
      expect(trackers.test(sourceOf(item)), `tracker found in ${item.fileName}`).toBe(false);
    }
  });

  it('ships every local file that index.html links to', () => {
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)="(\/[^"/][^"]*)"/g)].map((m) => m[1] ?? '');
    const local = refs.filter((r) => !r.startsWith('//') && !r.startsWith('/src/'));
    expect(local.length).toBeGreaterThan(0);
    for (const ref of local) {
      expect(existsSync(resolve(ROOT, 'public', ref.slice(1))), `public${ref} is missing`).toBe(true);
    }
  });
});
