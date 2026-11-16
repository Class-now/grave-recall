/**
 * Coward mode: replaces the ghost scream with a soft chime and suppresses the
 * jumpscare flash. Independent of the reduced-motion setting.
 */
import { h } from 'preact';

import { cowardMode, updatePref } from '../../store';
import { t } from '../../i18n';

import { ToggleRow } from './ToggleRow';

export function CowardModeToggle(): h.JSX.Element {
  return (
    <ToggleRow
      id="gr-setting-coward"
      label={t('settings.cowardMode')}
      description={t('settings.cowardModeDesc')}
      checked={cowardMode.value}
      onChange={(checked) => updatePref('cowardMode', checked)}
    />
  );
}