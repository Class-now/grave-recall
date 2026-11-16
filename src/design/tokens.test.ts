import { describe, it, expect } from 'vitest';
import { TOKEN_MAP } from './tokens.js';
import type { CssTokenName } from './tokens.js';

/**
 * Type-level check: every CSS token name listed in TOKEN_MAP must have a
 * corresponding TS constant (enforced by the mapped type in tokens.ts).
 *
 * Runtime check: verifies that the hex values look like CSS colours or
 * numbers (motion durations), and that none are empty.
 */
describe('Design tokens', () => {
  const cssColorTokenNames: CssTokenName[] = [
    '--color-void',
    '--color-grave-soil',
    '--color-stone-dark',
    '--color-stone-mid',
    '--color-stone-worn',
    '--color-stone-crumbled',
    '--color-moss',
    '--color-fog-base',
    '--color-ghost-body',
    '--color-ghost-glow',
    '--color-candle-flame',
    '--color-candle-wax',
    '--color-moon-full',
    '--color-moon-new',
    '--color-crow',
    '--color-crow-eye',
    '--color-danger',
    '--color-warning',
    '--color-success',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-inverse',
    '--color-surface-card',
    '--color-surface-panel',
    '--color-border',
    '--color-focus-ring',
    '--color-sky-top',
    '--color-sky-horizon',
    '--color-hill-far',
    '--color-hill-near',
    '--color-tree',
    '--color-iron',
    '--color-ground-fore',
    '--color-halo',
  ];

  const motionTokenNames: CssTokenName[] = [
    '--motion-instant',
    '--motion-fast',
    '--motion-normal',
    '--motion-slow',
    '--motion-ambient',
  ];

  it('every colour token has a hex value matching #rrggbb', () => {
    for (const name of cssColorTokenNames) {
      const value = TOKEN_MAP[name];
      expect(typeof value, `${name} should be a string`).toBe('string');
      expect(
        (value as string),
        `${name} should be a valid hex colour`,
      ).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('every motion token has a non-negative number value', () => {
    for (const name of motionTokenNames) {
      const value = TOKEN_MAP[name];
      expect(typeof value, `${name} should be a number`).toBe('number');
      expect(value as number, `${name} should be >= 0`).toBeGreaterThanOrEqual(0);
    }
  });

  it('TOKEN_MAP covers all expected CSS tokens (no missing keys)', () => {
    const allExpected = [...cssColorTokenNames, ...motionTokenNames];
    for (const name of allExpected) {
      expect(
        Object.prototype.hasOwnProperty.call(TOKEN_MAP, name),
        `Missing token: ${name}`,
      ).toBe(true);
    }
  });
});
