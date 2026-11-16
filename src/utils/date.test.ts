/**
 * Date helper unit tests
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { addDays, daysBetween } from './date';

describe('daysBetween', () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    // Node re-reads TZ on assignment. A zone with DST is needed to expose 23/25-hour days.
    process.env.TZ = 'America/New_York';
  });

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('counts one day across the spring-forward change (23-hour day)', () => {
    const a = new Date(2025, 2, 9, 0, 0, 0); // 2025-03-09 00:00 local
    const b = new Date(2025, 2, 10, 0, 0, 0);
    expect(b.getTime() - a.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(daysBetween(a, b)).toBe(1);
  });

  it('counts one day across the fall-back change (25-hour day)', () => {
    const a = new Date(2025, 10, 2, 0, 0, 0); // 2025-11-02 00:00 local
    const b = new Date(2025, 10, 3, 0, 0, 0);
    expect(b.getTime() - a.getTime()).toBe(25 * 60 * 60 * 1000);
    expect(daysBetween(a, b)).toBe(1);
  });

  it('is exact over a range that spans a DST change', () => {
    const a = new Date(2025, 2, 1, 15, 30);
    const b = new Date(2025, 2, 31, 8, 0);
    expect(daysBetween(a, b)).toBe(30);
  });

  it('ignores the time of day', () => {
    expect(daysBetween(new Date(2025, 5, 1, 23, 59), new Date(2025, 5, 2, 0, 1))).toBe(1);
    expect(daysBetween(new Date(2025, 5, 1, 0, 1), new Date(2025, 5, 1, 23, 59))).toBe(0);
  });

  it('is negative when b is before a', () => {
    expect(daysBetween(new Date(2025, 2, 10), new Date(2025, 2, 9))).toBe(-1);
  });

  it('agrees with addDays for every day of a DST year', () => {
    const start = new Date(2025, 0, 1);
    for (let n = -5; n <= 366; n++) {
      expect(daysBetween(start, addDays(start, n))).toBe(n);
    }
  });
});
