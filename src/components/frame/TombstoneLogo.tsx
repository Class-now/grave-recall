/**
 * Tombstone logo for the page header: an arched stone with a cross incision,
 * the silhouette of public/grave.svg. A page frame ornament (spooky-design-system
 * section 6.1): static, carries no data, hidden from assistive technology.
 */
import { h } from 'preact';

export function TombstoneLogo(): h.JSX.Element {
  return (
    <svg
      class="gr-logo"
      viewBox="0 0 32 32"
      width="40"
      height="40"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 28 V14 A8 8 0 0 1 24 14 V28 Z"
        fill="var(--color-stone-worn)"
        stroke="var(--color-border)"
        stroke-width="1"
      />
      <path d="M16 8 V18 M12 12 H20" stroke="var(--color-void)" stroke-width="2" fill="none" />
    </svg>
  );
}
