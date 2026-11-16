import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { activeDeckId, locale } from './store';
import { markGestureOccurred } from './audio/context';
import { t } from './i18n';

import { CaptionBar } from './components/captions/CaptionBar';
import { CryptEditor } from './components/deck/CryptEditor';
import { CryptList } from './components/deck/CryptList';
import { SiteHeader } from './components/frame/SiteHeader';
import type { View } from './components/frame/SiteHeader';
import { GraveyardScene } from './components/graveyard/GraveyardScene';
import { SeanceSession } from './components/review/SeanceSession';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { LedgerView } from './components/stats/LedgerView';

import './index.css';

/** Events that count as the first user gesture for the lazy AudioContext. */
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export function App(): h.JSX.Element {
  // Opens on the crypt list, where a new user creates their first crypt.
  const [view, setView] = useState<View>('crypts');
  const [seanceDone, setSeanceDone] = useState(false);

  // The AudioContext may only be created after a user gesture. The first
  // gesture of any kind creates it; the listeners then remove themselves.
  useEffect(() => {
    function onGesture(): void {
      for (const type of GESTURE_EVENTS) document.removeEventListener(type, onGesture, true);
      markGestureOccurred();
    }
    for (const type of GESTURE_EVENTS) document.addEventListener(type, onGesture, true);
    return () => {
      for (const type of GESTURE_EVENTS) document.removeEventListener(type, onGesture, true);
    };
  }, []);

  // Keep the page language in step with the UI language so screen readers pick
  // the right voice (WCAG 3.1.1).
  const lang = locale.value;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function show(next: View): void {
    setSeanceDone(false);
    setView(next);
  }

  // The séance hands control back when its queue is empty.
  function finishSeance(): void {
    setSeanceDone(true);
    setView('graveyard');
  }

  const inCrypt = activeDeckId.value !== null;
  return (
    <div id="grave-recall-root">
      <div class={view === 'graveyard' ? 'gr-frame gr-frame--fit' : 'gr-frame'}>
        <SiteHeader view={view} show={show} />
        <div role="status" class="gr-status">
          {seanceDone && view === 'graveyard' && (
            <p>
              <strong>{t('seance.complete')}</strong> {t('seance.completeDesc')}
            </p>
          )}
        </div>
        <main>
          {view === 'graveyard' && (
            <GraveyardScene onBeginSeance={() => show('seance')} onOpenCrypts={() => show('crypts')} />
          )}
          {view === 'seance' && (
            <SeanceSession key={activeDeckId.value ?? 'all'} deckId={activeDeckId.value} onComplete={finishSeance} />
          )}
          {view === 'ledger' && <LedgerView />}
          {view === 'crypts' && (inCrypt ? <CryptEditor /> : <CryptList />)}
          {view === 'settings' && <SettingsPanel />}
        </main>
      </div>
      <CaptionBar />
    </div>
  );
}
