/**
 * UI language selector. Changing the locale signal re-renders every `t()`
 * call at once, so no reload is needed.
 */
import { h } from 'preact';

import { locale, updatePref, type UserPrefs } from '../../store';
import { t } from '../../i18n';

import './settings.css';

/** Each language is named in itself so it can be found whatever the current locale. */
const LANGUAGES: ReadonlyArray<{ code: UserPrefs['locale']; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
];

export function LanguageSelector(): h.JSX.Element {
  return (
    <fieldset class="gr-settings__fieldset" role="radiogroup">
      <legend class="gr-settings__legend">{t('settings.language')}</legend>
      {LANGUAGES.map(({ code, name }) => {
        const id = `gr-setting-lang-${code}`;
        return (
          <div class="gr-settings__row gr-settings__row--inline" key={code}>
            <input
              id={id}
              class="gr-settings__check"
              type="radio"
              name="gr-setting-language"
              value={code}
              checked={locale.value === code}
              onChange={() => updatePref('locale', code)}
            />
            <label class="gr-settings__label" for={id} lang={code}>
              {name}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}