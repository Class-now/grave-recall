/**
 * Page header: tombstone logo, the app title and the stone-slab view tabs.
 * The tabs are plain buttons in a labelled `<nav>`; the current view carries
 * `aria-current="page"`. The logo and divider are aria-hidden ornaments.
 */
import { h } from 'preact';

import { t } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

import { TombstoneLogo } from './TombstoneLogo';

import './frame.css';

export type View = 'graveyard' | 'seance' | 'ledger' | 'crypts' | 'settings';

const VIEWS: ReadonlyArray<{ view: View; label: TranslationKey }> = [
  { view: 'graveyard', label: 'nav.graveyard' },
  { view: 'seance', label: 'nav.seance' },
  { view: 'ledger', label: 'nav.stats' },
  { view: 'crypts', label: 'nav.crypts' },
  { view: 'settings', label: 'nav.settings' },
];

export interface SiteHeaderProps {
  /** The view currently shown. */
  view: View;
  /** Switches to another view. */
  show: (next: View) => void;
}

export function SiteHeader(props: SiteHeaderProps): h.JSX.Element {
  const { view, show } = props;
  return (
    <header class="gr-header">
      <div class="gr-header__brand">
        <TombstoneLogo />
        <h1 class="gr-header__title">{t('app.name')}</h1>
      </div>
      <nav class="gr-nav" aria-label={t('nav.main')}>
        {VIEWS.map((item) => (
          <button
            key={item.view}
            type="button"
            class="gr-tab"
            aria-current={view === item.view ? 'page' : undefined}
            onClick={() => show(item.view)}
          >
            {t(item.label)}
          </button>
        ))}
      </nav>
      <div class="gr-divider" aria-hidden="true" />
    </header>
  );
}
