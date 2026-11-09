import { render, h } from 'preact';
import { App } from './app.js';
import { loadState, loadStarterCrypts } from './store/index.js';

// Initialize app state
async function initApp(): Promise<void> {
  // Try to load from localStorage
  const loaded = loadState();
  
  // If no saved state, load starter crypts on first launch
  if (!loaded) {
    await loadStarterCrypts();
  }
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
