/**
 * Test helper: runs axe-core on a rendered element and fails with a readable
 * list of violations.
 *
 * `color-contrast` is switched off because jsdom has no layout or stylesheets,
 * so axe cannot compute it. Contrast is audited from the design tokens in
 * src/design/contrast.test.ts instead.
 */
import axe from 'axe-core';
import { expect, vi } from 'vitest';

export interface AxeOptions {
  /** Extra rule ids to disable (for component-level runs that cannot satisfy page-level rules). */
  disable?: string[];
}

/** Page-level rules that only make sense when the whole document is tested. */
export const PAGE_LEVEL_RULES: string[] = ['region', 'landmark-one-main', 'page-has-heading-one'];

export async function expectNoAxeViolations(target: Element, options: AxeOptions = {}): Promise<void> {
  const rules: Record<string, { enabled: boolean }> = { 'color-contrast': { enabled: false } };
  for (const id of options.disable ?? []) rules[id] = { enabled: false };

  // axe probes canvas text metrics for icon-ligature detection; jsdom logs a
  // "not implemented" error for every probe. Returning null makes axe skip it.
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  let results: axe.AxeResults;
  try {
    results = await axe.run(target, { rules });
  } finally {
    canvas.mockRestore();
  }
  const summary = results.violations.map((v) => {
    const nodes = v.nodes.map((n) => `    ${n.target.join(' ')}\n      ${n.html.slice(0, 160)}`).join('\n');
    return `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n${nodes}`;
  });
  expect(summary, `axe violations:\n${summary.join('\n')}`).toEqual([]);
}
