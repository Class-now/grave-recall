/**
 * Store barrel — re-exports all signals and actions.
 */

// Preferences
export {
  locale,
  cowardMode,
  volume,
  dailyGoal,
  reducedMotion,
  reducedMotionUser,
  showCaptions,
  updatePref,
  loadPrefs,
  getPrefs,
  type UserPrefs,
} from './prefs';

// Decks
export {
  decks,
  activeDeckId,
  activeDeck,
  createDeck,
  renameDeck,
  deleteDeck,
  setActiveDeck,
  loadDecks,
  type Deck,
} from './decks';

// Cards
export {
  cards,
  reviewLog,
  dueCards,
  overdueCards,
  overdueCount,
  newCards,
  reviewCards,
  getCardsForDeck,
  addCard,
  editCard,
  deleteCard,
  updateCardSrs,
  addReviewLog,
  loadCards,
  loadReviewLog,
  clearCards,
  type Card,
  type ReviewLogEntry,
} from './cards';

// Session
export {
  currentCard,
  remainingCount,
  isSessionComplete,
  isCardFlipped,
  startSession,
  flipCard,
  gradeCard,
  endSession,
  getReviewsToday,
  getRetentionRate,
  getStreakDays,
} from './session';

// Stats
export {
  reviewsDoneToday,
  moonPhasePct,
  streakDays,
  retentionRate,
  fogOpacity,
  forecastData,
  reviewsPerDay,
} from './stats';

// Persistence
export {
  saveState,
  loadState,
  exportJson,
  importJson,
  loadStarterCrypts,
  clearAllData,
  type AppExport,
  type DeckExport,
  isAppExport,
  isDeckExport,
} from './persistence';