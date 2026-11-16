/**
 * Shared keyboard helpers for the séance. The séance listens on `document` so
 * keys work wherever focus sits inside the review area (or nowhere), without
 * hijacking keys meant for controls elsewhere, such as the view switcher.
 */

/** CSS class of the séance root element; key handling is limited to it. */
export const SEANCE_ROOT_CLASS = 'gr-seance';

/**
 * True when a key press should drive the séance: the target is the page body
 * or lies inside the séance root, is not a text field, and no modifier key is
 * held (so browser shortcuts such as Ctrl+1 keep working).
 */
export function isSeanceKeyEvent(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const target = e.target;
  if (!(target instanceof Element)) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]') !== null) return false;
  return target === document.body || target.closest(`.${SEANCE_ROOT_CLASS}`) !== null;
}
