/**
 * Active review session state.
 */
import { signal, computed } from '@preact/signals';
import type { DeckId, Grade } from '../scheduler/types';
import type { Card } from './cards';
import { schedule } from '../scheduler';
import { addReviewLog, updateCardSrs, reviewLog, dueCards } from './cards';
import { startOfDay, isSameDay } from '../utils/date';

// Session queue (cards to review)
const sessionQueue = signal<Card[]>([]);

// Current card index in queue
const currentIndex = signal<number>(0);

// Whether the current card is flipped (showing back)
const isFlipped = signal<boolean>(false);

// Session active flag
const isSessionActive = signal<boolean>(false);

// Computed: current card
export const currentCard = computed(() => {
  if (!isSessionActive.value || sessionQueue.value.length === 0) {
    return null;
  }
  if (currentIndex.value >= sessionQueue.value.length) {
    return null;
  }
  return sessionQueue.value[currentIndex.value];
});

// Computed: remaining count
export const remainingCount = computed(() => {
  if (!isSessionActive.value) return 0;
  return Math.max(0, sessionQueue.value.length - currentIndex.value);
});

// Computed: is session complete
export const isSessionComplete = computed(() => {
  return isSessionActive.value && currentIndex.value >= sessionQueue.value.length;
});

// Computed: is flipped
export const isCardFlipped = computed(() => isFlipped.value);

/**
 * Starts a new review session with due cards, in random order.
 * When `deckId` is given only that crypt's due cards are queued (AC-12.1).
 */
export function startSession(deckId: DeckId | null = null): void {
  const due = deckId === null ? dueCards.value : dueCards.value.filter((c) => c.deckId === deckId);
  // Shuffle the cards for variety
  const shuffled = [...due].sort(() => Math.random() - 0.5);
  sessionQueue.value = shuffled;
  currentIndex.value = 0;
  isFlipped.value = false;
  isSessionActive.value = true;
}

/**
 * Flips the current card to show the back.
 */
export function flipCard(): void {
  if (!isSessionActive.value || !currentCard.value) return;
  isFlipped.value = true;
}

/**
 * Grades the current card and moves to the next.
 */
export function gradeCard(grade: Grade): void {
  if (!isSessionActive.value || !currentCard.value) return;

  const card = currentCard.value;
  const now = new Date();

  // Call the scheduler
  const result = schedule(card.srs, grade, now);

  // Update the card's SRS state
  updateCardSrs(card.id, result.nextState);

  // Add to review log
  addReviewLog({
    date: now,
    cardId: card.id,
    grade,
    correct: grade >= 2, // Good or Easy is "correct"
  });

  // Move to next card
  currentIndex.value = currentIndex.value + 1;
  isFlipped.value = false;
}

/**
 * Ends the current session.
 */
export function endSession(): void {
  isSessionActive.value = false;
  isFlipped.value = false;
  sessionQueue.value = [];
  currentIndex.value = 0;
}

/**
 * Gets reviews done today.
 */
export function getReviewsToday(): number {
  const today = startOfDay(new Date());
  return reviewLog.value.filter(entry => isSameDay(entry.date, today)).length;
}

/**
 * Gets the total review count for the last N days.
 */
function getReviewsInDays(days: number): { total: number; correct: number } {
  const now = new Date();
  const start = startOfDay(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
  
  const recentReviews = reviewLog.value.filter(entry => entry.date >= start);
  const total = recentReviews.length;
  const correct = recentReviews.filter(r => r.correct).length;
  
  return { total, correct };
}

/**
 * Gets retention rate for last 30 days.
 */
export function getRetentionRate(): number {
  const { total, correct } = getReviewsInDays(30);
  if (total === 0) return 0;
  return correct / total;
}

/**
 * Calculates streak (consecutive days with at least 1 review).
 */
export function getStreakDays(): number {
  const log = reviewLog.value;
  if (log.length === 0) return 0;

  // Get unique days with reviews
  const daysWithReviews = new Set<string>();
  for (const entry of log) {
    const day = startOfDay(entry.date).toISOString();
    daysWithReviews.add(day);
  }

  // Sort days descending
  const sortedDays = Array.from(daysWithReviews).sort().reverse();
  
  if (sortedDays.length === 0) return 0;

  // Check if today or yesterday has reviews (streak must be current)
  const today = startOfDay(new Date()).toISOString();
  const yesterday = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000)).toISOString();
  
  if (!sortedDays.includes(today) && !sortedDays.includes(yesterday)) {
    return 0;
  }

  // Count consecutive days
  let streak = 0;
  let currentDate = sortedDays.includes(today) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < sortedDays.length; i++) {
    const expectedDay = startOfDay(currentDate).toISOString();
    if (sortedDays.includes(expectedDay)) {
      streak++;
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return streak;
}