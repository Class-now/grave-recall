/**
 * A labelled checkbox with a description. Shared by the settings toggles so
 * each one is a native, keyboard-operable control with an accessible name and
 * description.
 */
import { h } from 'preact';

import './settings.css';

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps): h.JSX.Element {
  const descId = `${id}-desc`;
  return (
    <div class="gr-settings__row">
      <input
        id={id}
        class="gr-settings__check"
        type="checkbox"
        checked={checked}
        aria-describedby={descId}
        onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
      />
      <label class="gr-settings__label" for={id}>
        {label}
      </label>
      <p id={descId} class="gr-settings__desc">
        {description}
      </p>
    </div>
  );
}