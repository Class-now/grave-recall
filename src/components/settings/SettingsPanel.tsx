/**
 * Settings: Audio, Appearance, Language and Data sections. Every preference
 * is written through `updatePref`, which persists it to localStorage.
 */
import { h } from 'preact';

import { reducedMotionUser, showCaptions, updatePref, volume } from '../../store';
import { t } from '../../i18n';

import { CowardModeToggle } from './CowardModeToggle';
import { ExportImport } from './ExportImport';
import { LanguageSelector } from './LanguageSelector';
import { ToggleRow } from './ToggleRow';

import '../deck/deck.css';
import './settings.css';

export function SettingsPanel(): h.JSX.Element {
  const percent = Math.round(volume.value * 100);
  return (
    <section class="gr-settings" aria-labelledby="gr-settings-title">
      <h2 id="gr-settings-title" class="gr-settings__title">
        {t('settings.title')}
      </h2>

      <section class="gr-settings__section" aria-labelledby="gr-settings-audio">
        <h3 id="gr-settings-audio" class="gr-settings__heading">
          {t('settings.audio')}
        </h3>
        <div class="gr-settings__row">
          <label class="gr-settings__label" for="gr-setting-volume">
            {t('settings.volume')}
          </label>
          <input
            id="gr-setting-volume"
            class="gr-settings__range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume.value}
            aria-valuetext={`${percent}%`}
            onInput={(e) => updatePref('volume', Number((e.currentTarget as HTMLInputElement).value))}
          />
          <span class="gr-settings__value" aria-hidden="true">
            {percent}%
          </span>
        </div>
        <CowardModeToggle />
        <ToggleRow
          id="gr-setting-captions"
          label={t('settings.captions')}
          description={t('settings.captionsDesc')}
          checked={showCaptions.value}
          onChange={(checked) => updatePref('showCaptions', checked)}
        />
      </section>

      <section class="gr-settings__section" aria-labelledby="gr-settings-appearance">
        <h3 id="gr-settings-appearance" class="gr-settings__heading">
          {t('settings.appearance')}
        </h3>
        <ToggleRow
          id="gr-setting-motion"
          label={t('settings.reducedMotion')}
          description={t('settings.reducedMotionDesc')}
          checked={reducedMotionUser.value}
          onChange={(checked) => updatePref('reducedMotion', checked)}
        />
      </section>

      <section class="gr-settings__section" aria-labelledby="gr-settings-language">
        <h3 id="gr-settings-language" class="gr-settings__heading">
          {t('settings.language')}
        </h3>
        <LanguageSelector />
      </section>

      <section class="gr-settings__section" aria-labelledby="gr-settings-data">
        <h3 id="gr-settings-data" class="gr-settings__heading">
          {t('settings.data')}
        </h3>
        <ExportImport />
      </section>
    </section>
  );
}