import { render, h } from 'preact';
import { App } from './app.js';
import { loadPrefs, loadState, loadStarterCrypts, saveState, startAutoSave } from './store/index.js';

// Initialize app state
async function initApp(): Promise<void> {
  // Preferences are stored separately from the app data, so restore them first.
  loadPrefs();

  // Try to load from localStorage
  const loaded = loadState();
  
  // If no saved state, load starter crypts on first launch
  if (!loaded) {
    await loadStarterCrypts();
    // Persist the starter crypts so a reload restores them instead of re-seeding.
    saveState();
  }

  // From here on, every change to decks, cards or the review log is saved.
  startAutoSave();
}

// Start the app
initApp().then(() => {
  const root = document.getElementById('app');
  if (root !== null) {
    render(h(App, null), root);
  }
}).catch((e) => {
  console.error('Failed to initialize app:', e);
  // Still render even if initialization fails
  const root = document.getElementById('app');
  if (root !== null) {
    render(h(App, null), root);
  }
});
