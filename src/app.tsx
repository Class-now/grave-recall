import { h } from 'preact';

import { activeDeckId } from './store';
import { t } from './i18n';

import { CryptEditor } from './components/deck/CryptEditor';
import { CryptList } from './components/deck/CryptList';

import './index.css';

export function App(): h.JSX.Element {
  // Minimal view switch until the full router lands: a selected crypt shows its
  // card list, otherwise the crypt list is shown.
  const inCrypt = activeDeckId.value !== null;
  return (
    <div id="grave-recall-root">
      <h1>{t('app.name')}</h1>
      <main>{inCrypt ? <CryptEditor /> : <CryptList />}</main>
    </div>
  );
}
