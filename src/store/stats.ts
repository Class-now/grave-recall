/**
 * Derived stats signals.
 */
import { computed } from '@preact/signals';
import { cards, reviewLog, overdueCount } from './cards';
import { getReviewCounts, getReviewsToday, getRetentionRate, getStreakDays } from './session';
import { dailyGoal } from './prefs';
import { startOfDay, addDays, todayStart } from '../utils/date';

// Reviews done today
export const reviewsDoneToday = computed(() => getReviewsToday());

// Moon phase percentage (progress toward daily goal)
export const moonPhasePct = computed(() => {
  const goal = dailyGoal.value;
  if (goal <= 0) return 0;
  const done = reviewsDoneToday.value;
  return Math.min(done / goal, 1.0);
});

// Streak days
export const streakDays = computed(() => getStreakDays());

// Retention rate (last 30 days)
export const retentionRate = computed(() => getRetentionRate());

/** Review counts for the last 30 days. `rate` is null when there were none ("No data yet"). */
export interface RetentionSummary {
  total: number;
  correct: number;
  rate: number | null;
}

export const retentionSummary = computed<RetentionSummary>(() => {
  const { total, correct } = getReviewCounts(HISTORY_DAYS);
  return { total, correct, rate: total === 0 ? null : correct / total };
});

// Fog opacity based on overdue cards
export const fogOpacity = computed(() => {
  const total = cards.value.length;
  if (total === 0) return 0.05;
  const count = overdueCount.value;
  return Math.min(Math.max(count / total, 0.05), 0.60);
});

/** Number of days shown by the forecast chart. */
export const FORECAST_DAYS = 14;

/** Number of days shown by the reviews-per-day chart. */
export const HISTORY_DAYS = 30;

export interface ForecastDay {
  date: Date;
  count: number;
}

export interface ReviewDay {
  date: Date;
  /** All reviews that day. */
  count: number;
  /** Reviews graded Good or Easy. */
  correct: number;
}

// Forecast: cards due per day for the next 14 days, across all crypts.
// Cards already past due are counted on today, since that is when they will be reviewed.
export const forecastData = computed<ForecastDay[]>(() => {
  const today = todayStart();
  const counts = new Map<number, number>();

  for (const card of cards.value) {
    const dueDay = Math.max(startOfDay(card.srs.dueDate).getTime(), today.getTime());
    counts.set(dueDay, (counts.get(dueDay) ?? 0) + 1);
  }

  const result: ForecastDay[] = [];
  for (let i = 0; i < FORECAST_DAYS; i++) {
    const date = addDays(today, i);
    result.push({ date, count: counts.get(date.getTime()) ?? 0 });
  }
  return result;
});

// Reviews per day for the last 30 days, oldest first, ending today.
export const reviewsPerDay = computed<ReviewDay[]>(() => {
  const today = todayStart();
  const buckets = new Map<number, { count: number; correct: number }>();

  for (const entry of reviewLog.value) {
    const day = startOfDay(entry.date).getTime();
    const bucket = buckets.get(day) ?? { count: 0, correct: 0 };
    bucket.count++;
    if (entry.correct) bucket.correct++;
    buckets.set(day, bucket);
  }

  const result: ReviewDay[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const bucket = buckets.get(date.getTime());
    result.push({ date, count: bucket?.count ?? 0, correct: bucket?.correct ?? 0 });
  }
  return result;
});
