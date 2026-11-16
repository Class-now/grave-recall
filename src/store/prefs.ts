/**
 * User preferences signals.
 */
import { signal, effect } from '@preact/signals';

// User preferences type
export interface UserPrefs {
  locale: 'en' | 'ja';
  cowardMode: boolean;
  volume: number; // 0-1
  dailyGoal: number; // cards per day
  reducedMotion: boolean; // user override
  showCaptions: boolean;
}

// Default preferences
const defaultPrefs: UserPrefs = {
  locale: 'en',
  cowardMode: false,
  volume: 0.7,
  dailyGoal: 20,
  reducedMotion: false,
  // Off by default: captions appear while a sound plays, then hide (AC-25.3).
  // The Settings toggle keeps the bar visible permanently (AC-25.4).
  showCaptions: false,
};

// Load initial reducedMotion from OS preference
function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Create signals
export const locale = signal<UserPrefs['locale']>(defaultPrefs.locale);
export const cowardMode = signal<boolean>(defaultPrefs.cowardMode);
export const volume = signal<number>(defaultPrefs.volume);
export const dailyGoal = signal<number>(defaultPrefs.dailyGoal);
export const reducedMotionUser = signal<boolean>(defaultPrefs.reducedMotion);
export const showCaptions = signal<boolean>(defaultPrefs.showCaptions);

// Computed: actual reduced motion (OS or user override)
export const reducedMotion = signal<boolean>(getInitialReducedMotion());

// Subscribe to OS reduced motion changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', (e) => {
    // Only update if user hasn't set an override
    if (!reducedMotionUser.value) {
      reducedMotion.value = e.matches;
    }
  });
}

// Subscribe to user override changes
effect(() => {
  if (reducedMotionUser.value) {
    reducedMotion.value = true;
  } else {
    // Check OS preference again
    reducedMotion.value = getInitialReducedMotion();
  }
});

/**
 * Updates a preference and persists to localStorage.
 */
export function updatePref<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]): void {
  switch (key) {
    case 'locale':
      locale.value = value as 'en' | 'ja';
      break;
    case 'cowardMode':
      cowardMode.value = value as boolean;
      break;
    case 'volume':
      volume.value = value as number;
      break;
    case 'dailyGoal':
      dailyGoal.value = value as number;
      break;
    case 'reducedMotion':
      reducedMotionUser.value = value as boolean;
      break;
    case 'showCaptions':
      showCaptions.value = value as boolean;
      break;
  }
  // Trigger persistence
  savePrefs();
}

/**
 * Loads preferences from localStorage.
 */
export function loadPrefs(): void {
  try {
    const stored = localStorage.getItem('grave-recall-prefs');
    if (stored) {
      const prefs: Partial<UserPrefs> = JSON.parse(stored);
      if (prefs.locale === 'en' || prefs.locale === 'ja') locale.value = prefs.locale;
      if (typeof prefs.cowardMode === 'boolean') cowardMode.value = prefs.cowardMode;
      if (typeof prefs.volume === 'number' && prefs.volume >= 0 && prefs.volume <= 1) volume.value = prefs.volume;
      if (typeof prefs.dailyGoal === 'number') dailyGoal.value = prefs.dailyGoal;
      if (typeof prefs.reducedMotion === 'boolean') reducedMotionUser.value = prefs.reducedMotion;
      if (typeof prefs.showCaptions === 'boolean') showCaptions.value = prefs.showCaptions;
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e);
  }
}

/**
 * Saves preferences to localStorage.
 */
function savePrefs(): void {
  try {
    const prefs: UserPrefs = {
      locale: locale.value,
      cowardMode: cowardMode.value,
      volume: volume.value,
      dailyGoal: dailyGoal.value,
      reducedMotion: reducedMotionUser.value,
      showCaptions: showCaptions.value,
    };
    localStorage.setItem('grave-recall-prefs', JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
}

/**
 * Gets current preferences as an object.
 */
export function getPrefs(): UserPrefs {
  return {
    locale: locale.value,
    cowardMode: cowardMode.value,
    volume: volume.value,
    dailyGoal: dailyGoal.value,
    reducedMotion: reducedMotionUser.value,
    showCaptions: showCaptions.value,
  };
}