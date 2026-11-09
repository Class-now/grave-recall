import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { initCard, retrievability, schedule } from './index.js';
import type { CardId, CardSRSState, CardState, Grade } from './types.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbCardId = fc.string({ minLength: 1, maxLength: 36 }).map((s) => s as CardId);

const arbSrsState: fc.Arbitrary<CardSRSState> = fc.constantFrom(
  'new',
  'learning',
  'review',
  'relearning',
);

const arbDate = fc
  .integer({ min: 0, max: 365 * 10 })
  .map((daysAgo) => new Date(Date.now() - daysAgo * 86_400_000));

const arbCardState: fc.Arbitrary<CardState> = fc
  .record({
    id: arbCardId,
    stability: fc.float({ min: Math.fround(0.01), max: Math.fround(365), noNaN: true }),
    difficulty: fc.float({ min: Math.fround(1), max: Math.fround(10), noNaN: true }),
    retrievability: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    lapses: fc.nat({ max: 50 }),
    reps: fc.nat({ max: 200 }),
    srsState: arbSrsState,
    dueDate: arbDate,
    lastReviewed: fc.option(arbDate, { nil: null }),
  });

const arbGrade: fc.Arbitrary<Grade> = fc.constantFrom(0, 1, 2, 3) as fc.Arbitrary<Grade>;
const arbSuccessGrade: fc.Arbitrary<Grade> = fc.constantFrom(1, 2, 3) as fc.Arbitrary<Grade>;

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('initCard', () => {
  it('creates a card with expected defaults', () => {
    const now = new Date();
    const card = initCard('test-id' as CardId, now);
    expect(card.id).toBe('test-id');
    expect(card.stability).toBe(1.0);
    expect(card.difficulty).toBe(5.0);
    expect(card.retrievability).toBe(1.0);
    expect(card.lapses).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.srsState).toBe('new');
    expect(card.dueDate).toBe(now);
    expect(card.lastReviewed).toBeNull();
  });
});

describe('retrievability', () => {
  it('returns 1.0 when t=0 (reviewed right now)', () => {
    const card = initCard('x' as CardId, new Date());
    const r = retrievability(card, card.dueDate);
    expect(r).toBe(1.0);
  });

  it('returns 0.9 when t equals stability', () => {
    const now = new Date();
    const card: CardState = {
      ...initCard('x' as CardId, now),
      stability: 10,
      lastReviewed: now,
    };
    const future = new Date(now.getTime() + 10 * 86_400_000);
    const r = retrievability(card, future);
    expect(r).toBeCloseTo(0.9, 5);
  });
});

describe('schedule — unit cases', () => {
  const baseCard: CardState = {
    id: 'base' as CardId,
    stability: 10,
    difficulty: 5,
    retrievability: 0.9,
    lapses: 0,
    reps: 5,
    srsState: 'review',
    dueDate: new Date('2024-01-01'),
    lastReviewed: new Date('2024-01-01'),
  };
  const now = new Date('2024-01-11'); // t = 10 days = exactly S

  it('Again: interval is 1, lapses increments, srsState → relearning', () => {
    const { nextState, intervalDays } = schedule(baseCard, 0, now);
    expect(intervalDays).toBe(1);
    expect(nextState.lapses).toBe(baseCard.lapses + 1);
    expect(nextState.srsState).toBe('relearning');
  });

  it('Good: interval > 0, reps increments, srsState → review', () => {
    const { nextState, intervalDays } = schedule(baseCard, 2, now);
    expect(intervalDays).toBeGreaterThan(0);
    expect(nextState.reps).toBe(baseCard.reps + 1);
    expect(nextState.srsState).toBe('review');
  });

  it('Easy: interval > Good interval', () => {
    const { intervalDays: goodDays } = schedule(baseCard, 2, now);
    const { intervalDays: easyDays } = schedule(baseCard, 3, now);
    expect(easyDays).toBeGreaterThan(goodDays);
  });

  it('new → learning after any grade', () => {
    const newCard: CardState = { ...baseCard, srsState: 'new', reps: 0 };
    const { nextState } = schedule(newCard, 0, now);
    expect(nextState.srsState).toBe('relearning');
    const { nextState: ns2 } = schedule(newCard, 2, now);
    expect(ns2.srsState).toBe('learning');
  });

  it('learning → review after success', () => {
    const learningCard: CardState = { ...baseCard, srsState: 'learning' };
    const { nextState } = schedule(learningCard, 2, now);
    expect(nextState.srsState).toBe('review');
  });

  it('relearning → review after success', () => {
    const relearnCard: CardState = { ...baseCard, srsState: 'relearning' };
    const { nextState } = schedule(relearnCard, 2, now);
    expect(nextState.srsState).toBe('review');
  });
});

// ---------------------------------------------------------------------------
// Property tests (P-01 through P-12)
// ---------------------------------------------------------------------------

describe('P-01 — monotone interval growth on success', () => {
  it('all success grades produce interval > 0', () => {
    fc.assert(
      fc.property(arbCardState, arbSuccessGrade, arbDate, (state, grade, now) => {
        const { intervalDays } = schedule(state, grade, now);
        return intervalDays > 0;
      }),
    );
  });

  it('Easy > Good > Hard intervals', () => {
    fc.assert(
      fc.property(arbCardState, arbDate, (state, now) => {
        const hard = schedule(state, 1, now).intervalDays;
        const good = schedule(state, 2, now).intervalDays;
        const easy = schedule(state, 3, now).intervalDays;
        return easy >= good && good >= hard;
      }),
    );
  });
});

describe('P-02 — failure resets to interval=1, lapses++', () => {
  it('Again always produces intervalDays=1 and lapses+1', () => {
    fc.assert(
      fc.property(arbCardState, arbDate, (state, now) => {
        const { nextState, intervalDays } = schedule(state, 0, now);
        return intervalDays === 1 && nextState.lapses === state.lapses + 1;
      }),
    );
  });
});

describe('P-03 — difficulty clamped to [1, 10]', () => {
  it('difficulty is always in [1, 10] after schedule', () => {
    fc.assert(
      fc.property(arbCardState, arbGrade, arbDate, (state, grade, now) => {
        const { nextState } = schedule(state, grade, now);
        return nextState.difficulty >= 1 && nextState.difficulty <= 10;
      }),
    );
  });
});

describe('P-04 — difficulty direction per grade', () => {
  it('Again increases difficulty (or stays at 10)', () => {
    fc.assert(
      fc.property(arbCardState, arbDate, (state, now) => {
        // Only meaningful when D < 10 — at boundary, clamp keeps it at 10
        const { nextState } = schedule(state, 0, now);
        return nextState.difficulty >= Math.min(state.difficulty, 10);
      }),
    );
  });

  it('Easy decreases difficulty (or stays at 1)', () => {
    fc.assert(
      fc.property(arbCardState, arbDate, (state, now) => {
        const { nextState } = schedule(state, 3, now);
        return nextState.difficulty <= Math.max(state.difficulty, 1);
      }),
    );
  });

  it('Good leaves difficulty unchanged', () => {
    fc.assert(
      fc.property(arbCardState, arbDate, (state, now) => {
        const clamped = Math.max(1, Math.min(10, state.difficulty));
        const { nextState } = schedule(state, 2, now);
        return Math.abs(nextState.difficulty - clamped) < 1e-9;
      }),
    );
  });
});

describe('P-05 — stability always positive', () => {
  it('stability > 0 for any grade', () => {
    fc.assert(
      fc.property(arbCardState, arbGrade, arbDate, (state, grade, now) => {
        const { nextState } = schedule(state, grade, now);
        return nextState.stability > 0;
      }),
    );
  });
});

describe('P-06 — retrievability in [0, 1]', () => {
  it('retrievability is always in [0, 1]', () => {
    fc.assert(
      fc.property(arbCardState, arbDate, (state, now) => {
        const r = retrievability(state, now);
        return r >= 0 && r <= 1;
      }),
    );
  });
});

describe('P-07 — retrievability monotone decreasing in time', () => {
  it('later time → lower or equal retrievability', () => {
    fc.assert(
      fc.property(
        arbCardState,
        fc.nat({ max: 365 }),
        fc.nat({ max: 365 }),
        (state, d1, d2) => {
          const base = state.lastReviewed ?? state.dueDate;
          const t1 = new Date(base.getTime() + d1 * 86_400_000);
          const t2 = new Date(base.getTime() + (d1 + d2) * 86_400_000);
          return retrievability(state, t1) >= retrievability(state, t2);
        },
      ),
    );
  });
});

describe('P-08 — retrievability at t=0 is 1.0', () => {
  it('R(state, lastReviewed) === 1.0', () => {
    fc.assert(
      fc.property(arbCardState, (state) => {
        const ref = state.lastReviewed ?? state.dueDate;
        const r = retrievability(state, ref);
        return Math.abs(r - 1.0) < 1e-9;
      }),
    );
  });
});

describe('P-09 — due date is in the future after successful review', () => {
  it('dueDate > now for all success grades', () => {
    fc.assert(
      fc.property(arbCardState, arbSuccessGrade, arbDate, (state, grade, now) => {
        const { nextState } = schedule(state, grade, now);
        return nextState.dueDate.getTime() > now.getTime();
      }),
    );
  });
});

describe('P-10 — valid SRS state transitions', () => {
  const validTransitions: Record<CardSRSState, Record<Grade, CardSRSState>> = {
    new: { 0: 'relearning', 1: 'learning', 2: 'learning', 3: 'learning' },
    learning: { 0: 'relearning', 1: 'review', 2: 'review', 3: 'review' },
    review: { 0: 'relearning', 1: 'review', 2: 'review', 3: 'review' },
    relearning: { 0: 'relearning', 1: 'review', 2: 'review', 3: 'review' },
  };

  it('srsState transitions are valid', () => {
    fc.assert(
      fc.property(arbCardState, arbGrade, arbDate, (state, grade, now) => {
        const { nextState } = schedule(state, grade, now);
        const expected = validTransitions[state.srsState][grade];
        return nextState.srsState === expected;
      }),
    );
  });
});

describe('P-11 — reps always increments', () => {
  it('reps === state.reps + 1 for any grade', () => {
    fc.assert(
      fc.property(arbCardState, arbGrade, arbDate, (state, grade, now) => {
        const { nextState } = schedule(state, grade, now);
        return nextState.reps === state.reps + 1;
      }),
    );
  });
});

describe('P-12 — determinism', () => {
  it('same inputs produce identical outputs', () => {
    fc.assert(
      fc.property(arbCardState, arbGrade, arbDate, (state, grade, now) => {
        const r1 = schedule(state, grade, now);
        const r2 = schedule(state, grade, now);
        return (
          r1.intervalDays === r2.intervalDays &&
          r1.nextState.stability === r2.nextState.stability &&
          r1.nextState.difficulty === r2.nextState.difficulty &&
          r1.nextState.lapses === r2.nextState.lapses &&
          r1.nextState.reps === r2.nextState.reps &&
          r1.nextState.srsState === r2.nextState.srsState &&
          r1.nextState.dueDate.getTime() === r2.nextState.dueDate.getTime()
        );
      }),
    );
  });
});
