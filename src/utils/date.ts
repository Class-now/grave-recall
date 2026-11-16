/**
 * Date arithmetic helpers.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the number of calendar days between two dates (local time).
 * The result is positive if b > a, negative if b < a.
 *
 * Each date is reduced to its local calendar day and that day is expressed as
 * a UTC timestamp, so a 23- or 25-hour day at a DST change still counts as
 * exactly one day.
 */
export function daysBetween(a: Date, b: Date): number {
  const aDay = startOfDay(a);
  const bDay = startOfDay(b);
  const aUtc = Date.UTC(aDay.getFullYear(), aDay.getMonth(), aDay.getDate());
  const bUtc = Date.UTC(bDay.getFullYear(), bDay.getMonth(), bDay.getDate());
  return Math.round((bUtc - aUtc) / MS_PER_DAY);
}

/**
 * Returns a new Date at the start of the day (midnight) in local time.
 */
export function startOfDay(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Returns a new Date with n days added.
 * @param d - The base date
 * @param n - Number of days to add (can be negative)
 */
export function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/**
 * Returns true if two dates are on the same day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns a Date representing "now" at the start of today.
 */
export function todayStart(): Date {
  return startOfDay(new Date());
}

/**
 * Formats a date as a local calendar day, YYYY-MM-DD. Unlike toISOString()
 * this does not shift the day for time zones ahead of or behind UTC.
 */
export function formatDay(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
