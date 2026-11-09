// Branded types for IDs
export type CardId = string & { readonly __brand: 'CardId' };
export type DeckId = string & { readonly __brand: 'DeckId' };

/** User grade: Again=0 | Hard=1 | Good=2 | Easy=3 */
export type Grade = 0 | 1 | 2 | 3;

/** SRS state machine states */
export type CardSRSState = 'new' | 'learning' | 'review' | 'relearning';

/** Full SRS state for a single card */
export interface CardState {
  readonly id: CardId;
  /** S — interval in days at 90% retention */
  readonly stability: number;
  /** D — difficulty scale [1, 10] */
  readonly difficulty: number;
  /** R — probability of recall [0, 1] */
  readonly retrievability: number;
  /** Count of Again grades (lapses) */
  readonly lapses: number;
  /** Total review count */
  readonly reps: number;
  readonly srsState: CardSRSState;
  readonly dueDate: Date;
  readonly lastReviewed: Date | null;
}

/** Result returned by schedule() */
export interface ScheduleResult {
  readonly nextState: CardState;
  readonly intervalDays: number;
}
