import type { CardId, CardState, CardSRSState, Grade, ScheduleResult } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** λ = ln(10/9) — forgetting-curve rate so that R=0.9 when t=S */
const LAMBDA = Math.log(10 / 9); // ≈ 0.10536

const S_MIN = 1.0;

/** FSRS-style weight parameters (defaults) */
const W = {
  w1: 0.40,
  w2: 0.15,
  w3: 0.30,
  w4: 0.30,
  // post-lapse stability
  w5: 11.0,
  w6: 0.10,
  w7: 0.90,
  // failure stability
  w8: 0.20,
  w9: 0.10,
  w10: 0.80,
  // difficulty
  w11: 0.15,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a brand-new card with default SRS state.
 * Pure function — no side effects.
 */
export function initCard(id: CardId, now: Date = new Date()): CardState {
  return {
    id,
    stability: 1.0,
    difficulty: 5.0,
    retrievability: 1.0,
    lapses: 0,
    reps: 0,
    srsState: 'new',
    dueDate: now,
    lastReviewed: null,
  };
}

/**
 * Forgetting curve: R(t, S) = exp(−λ · t / S)
 *
 * @param state  Current card state (uses stability).
 * @param now    The point in time at which to evaluate R.
 * @returns      Estimated probability of recall in [0, 1].
 */
export function retrievability(state: CardState, now: Date): number {
  const reference = state.lastReviewed ?? state.dueDate;
  const t = Math.max(0, daysBetween(reference, now));
  const s = Math.max(0.01, state.stability);
  const r = Math.exp(-LAMBDA * t / s);
  return clamp(r, 0.0, 1.0);
}

/**
 * Schedule the next review for a card.
 *
 * Pure function: (CardState, Grade, Date) → ScheduleResult.
 * Never throws — invalid input ranges are silently clamped.
 */
export function schedule(
  state: CardState,
  grade: Grade,
  now: Date,
): ScheduleResult {
  const S = Math.max(0.01, state.stability);
  const D = clamp(state.difficulty, 1, 10);
  const R = clamp(retrievability(state, now), 0.0, 1.0);

  let newStability: number;
  let newLapses: number;
  let intervalDays: number;
  let newSrsState: CardSRSState;

  if (grade === 0) {
    // -----------------------------------------------------------------------
    // Again — failure path
    // S' = w8 · D^(−w9) · ((S+1)^w10 − 1) · R
    // -----------------------------------------------------------------------
    newStability = W.w8 * Math.pow(D, -W.w9) * (Math.pow(S + 1, W.w10) - 1) * R;
    newStability = Math.max(newStability, S_MIN);
    newLapses = state.lapses + 1;
    intervalDays = 1;
    newSrsState = 'relearning';
  } else {
    // -----------------------------------------------------------------------
    // Success path (Hard=1, Good=2, Easy=3)
    // -----------------------------------------------------------------------
    newLapses = state.lapses;

    if (state.srsState === 'relearning') {
      // Post-lapse stability:
      // S' = max(S_min, w5 · D^(−w6) · ((S+1)^w7 − 1) · R)
      newStability = W.w5 * Math.pow(D, -W.w6) * (Math.pow(S + 1, W.w7) - 1) * R;
      newStability = Math.max(newStability, S_MIN);
    } else {
      // Regular success:
      // S' = S · (e^(w1·(11−D)·S^(−w2)) · e^(w3·(G−3)) − w4 + 1)
      const factor =
        Math.exp(W.w1 * (11 - D) * Math.pow(S, -W.w2)) *
        Math.exp(W.w3 * (grade - 3)) -
        W.w4 +
        1;
      newStability = S * factor;
      newStability = Math.max(newStability, S_MIN);
    }

    intervalDays = Math.max(1, Math.round(newStability));

    // SRS state transitions
    if (state.srsState === 'new') {
      newSrsState = 'learning';
    } else if (state.srsState === 'learning') {
      newSrsState = 'review';
    } else if (state.srsState === 'relearning') {
      newSrsState = 'review';
    } else {
      newSrsState = 'review';
    }
  }

  // Difficulty update: D' = clamp(D − w11·(G−2), 1, 10)
  const newDifficulty = clamp(D - W.w11 * (grade - 2), 1, 10);

  // Compute next due date
  const dueDate = addDays(now, intervalDays);

  // Compute current retrievability to store on card
  const newRetrievability = clamp(retrievability(state, now), 0.0, 1.0);

  const nextState: CardState = {
    id: state.id,
    stability: newStability,
    difficulty: newDifficulty,
    retrievability: newRetrievability,
    lapses: newLapses,
    reps: state.reps + 1,
    srsState: newSrsState,
    dueDate,
    lastReviewed: now,
  };

  return { nextState, intervalDays };
}
