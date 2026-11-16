/**
 * Page frame tests: the logo and divider are inert ornaments, and the frame CSS
 * carries the rules the layout relies on. jsdom cannot measure layout, so the
 * CSS is checked as text (the approach contrast.test.ts uses for index.css).
 */
import { h } from 'preact';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/preact';

import { SiteHeader } from './SiteHeader';
import { TombstoneLogo } from './TombstoneLogo';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, 'frame.css'), 'utf8');

afterEach(cleanup);

describe('TombstoneLogo', () => {
  it('is hidden from assistive technology and has no focusable descendants', () => {
    const { container } = render(h(TombstoneLogo, null));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('role')).toBeNull();
    expect(svg?.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    expect(svg?.textContent).toBe('');
  });

  it('draws the arched stone and the cross incision with token colours only', () => {
    const { container } = render(h(TombstoneLogo, null));
    const paths = Array.from(container.querySelectorAll('path'));
    expect(paths).toHaveLength(2);
    expect(paths[0]?.getAttribute('d')).toBe('M8 28 V14 A8 8 0 0 1 24 14 V28 Z');
    expect(paths[1]?.getAttribute('d')).toBe('M16 8 V18 M12 12 H20');
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(html).toContain('var(--color-');
  });
});

describe('SiteHeader', () => {
  it('renders the divider as an aria-hidden, non-focusable ornament', () => {
    const { container } = render(h(SiteHeader, { view: 'crypts', show: vi.fn() }));
    const divider = container.querySelector('.gr-divider');
    expect(divider?.getAttribute('aria-hidden')).toBe('true');
    expect(divider?.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    expect(divider?.textContent).toBe('');
  });

  it('has exactly one tab stop per view tab and none in the ornaments', () => {
    const { container } = render(h(SiteHeader, { view: 'graveyard', show: vi.fn() }));
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(5);
  });

  it('reports the clicked view through show', () => {
    const show = vi.fn();
    const { container } = render(h(SiteHeader, { view: 'graveyard', show }));
    const tabs = container.querySelectorAll('nav button');
    (tabs[1] as HTMLButtonElement).click();
    expect(show).toHaveBeenCalledWith('seance');
  });
});

describe('frame.css', () => {
  it('centres a container with a max width and inline padding', () => {
    expect(css).toMatch(/max-width:\s*75rem/);
    expect(css).toMatch(/margin-inline:\s*auto/);
    expect(css).toMatch(/padding-inline:\s*1rem/);
  });

  it('sets the title in the display face without synthetic bold', () => {
    expect(css).toContain('font-synthesis-weight: none');
    expect(css).toContain('var(--font-display)');
    expect(css).toMatch(/letter-spacing:\s*0\.05em/);
    expect(css).toMatch(/:lang\(ja\)/);
    expect(css).toMatch(/Mincho/);
  });

  it('styles the active tab and the keyboard focus ring', () => {
    expect(css).toMatch(/\[aria-current="page"\]/);
    const focus = /:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(focus).toContain('var(--color-focus-ring)');
    expect(focus).toMatch(/outline:\s*2px solid/);
    expect(focus).toMatch(/outline-offset/);
  });

  it('keeps tabs at least 2.5rem tall and wrapping', () => {
    expect(css).toMatch(/min-height:\s*2\.5rem/);
    expect(css).toMatch(/flex-wrap:\s*wrap/);
  });

  it('does not depend on the generic button class', () => {
    expect(css).not.toContain('.gr-btn');
  });

  it('takes no layout space for the status line', () => {
    const status = /\.gr-status\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(status).toMatch(/height:\s*0/);
    const inner = /\.gr-status > p\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(inner).toMatch(/position:\s*absolute/);
  });

  it('uses no hard-coded colours', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('leaves no navigation rules behind in index.css', () => {
    const index = readFileSync(resolve(here, '../../index.css'), 'utf8');
    expect(index).not.toContain('#grave-recall-root nav');
  });
});
