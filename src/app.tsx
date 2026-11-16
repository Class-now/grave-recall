import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { activeDeckId } from './store';
import { markGestureOccurred } from './audio/context';
import { t } from './i18n';
import type { TranslationKey } from './i18n/types';

import { CryptEditor } from './components/deck/CryptEditor';
import { CryptList } from './components/deck/CryptList';
import { GraveyardScene } from './components/graveyard/GraveyardScene';
import { SeanceSession } from './components/review/SeanceSession';
import { LedgerView } from './components/stats/LedgerView';

import './index.css';

type View = 'graveyard' | 'seance' | 'ledger' | 'crypts';

const VIEWS: ReadonlyArray<{ view: View; label: TranslationKey }> = [
  { view: 'graveyard', label: 'nav.graveyard' },
  { view: 'seance', label: 'nav.seance' },
  { view: 'ledger', label: 'nav.stats' },
  { view: 'crypts', label: 'nav.crypts' },
];

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
      <h1>{t('app.name')}</h1>
      <nav aria-label={t('nav.main')}>
        {VIEWS.map((item) => (
          <button
            key={item.view}
            type="button"
            class="gr-btn"
            aria-current={view === item.view ? 'page' : undefined}
            onClick={() => show(item.view)}
          >
            {t(item.label)}
          </button>
        ))}
      </nav>
      <div role="status">
        {seanceDone && view === 'graveyard' && (
          <p>
            <strong>{t('seance.complete')}</strong> {t('seance.completeDesc')}
          </p>
        )}
      </div>
      <main>
        {view === 'graveyard' && <GraveyardScene />}
        {view === 'seance' && (
          <SeanceSession key={activeDeckId.value ?? 'all'} deckId={activeDeckId.value} onComplete={finishSeance} />
        )}
        {view === 'ledger' && <LedgerView />}
        {view === 'crypts' && (inCrypt ? <CryptEditor /> : <CryptList />)}
      </main>
    </div>
  );
}
