/**
 * Derived stats signals.
 */
import { computed } from '@preact/signals';
import { cards, reviewLog, overdueCount } from './cards';
import { getReviewsToday, getRetentionRate, getStreakDays } from './session';
import { dailyGoal } from './prefs';
import { startOfDay, addDays, daysBetween, todayStart } from '../utils/date';

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

// Fog opacity based on overdue cards
export const fogOpacity = computed(() => {
  const total = cards.value.length;
  if (total === 0) return 0.05;
  const count = overdueCount.value;
  return Math.min(Math.max(count / total, 0.05), 0.60);
});

// Forecast: cards due per day for next 14 days
export const forecastData = computed(() => {
  const result: { date: Date; count: number }[] = [];
  const today = todayStart();

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dueCount = cards.value.filter(card => {
      const dueDate = startOfDay(card.srs.dueDate);
      return daysBetween(date, dueDate) === 0;
    }).length;
    result.push({ date, count: dueCount });
  }

  return result;
});

// Reviews per day for last 30 days
export const reviewsPerDay = computed(() => {
  const result: { date: Date; count: number }[] = [];
  const today = todayStart();

  for (let i = 29; i >= 0; i--) {
    const date = addDays(today, -i);
    const count = reviewLog.value.filter(entry =>
      startOfDay(entry.date).getTime() === date.getTime()
    ).length;
    result.push({ date, count });
  }

  return result;
});