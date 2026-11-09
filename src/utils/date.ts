/**
 * Date arithmetic helpers.
 */

/**
 * Returns the number of whole days between two dates.
 * The result is positive if b > a, negative if b < a.
 */
export function daysBetween(a: Date, b: Date): number {
  const aMs = startOfDay(a).getTime();
  const bMs = startOfDay(b).getTime();
  return Math.floor((bMs - aMs) / (1000 * 60 * 60 * 24));
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