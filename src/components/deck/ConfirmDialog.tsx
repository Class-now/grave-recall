/**
 * Modal confirmation dialog with a focus trap.
 *
 * - Focus moves to the Cancel button on open (the safe default for destructive actions).
 * - Tab / Shift+Tab cycle inside the dialog.
 * - Escape cancels.
 * - On close, focus returns to the element that opened the dialog.
 */
import { h } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

import { t } from '../../i18n';

import './deck.css';

export interface ConfirmDialogProps {
  /** Stable id prefix used for aria-labelledby / aria-describedby. */
  id: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog(props: ConfirmDialogProps): h.JSX.Element {
  const { id, title, description, confirmLabel, onConfirm, onCancel } = props;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Layout effect so focus moves into the dialog in the same frame it appears.
  useLayoutEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const dialog = dialogRef.current;
    return () => {
      // Restore focus only if the user has not already moved it elsewhere.
      const active = document.activeElement;
      const focusIsInDialog = dialog !== null && active !== null && dialog.contains(active);
      if ((focusIsInDialog || active === document.body) && opener !== null && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (dialog === null) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) {
      e.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div class="gr-modal-backdrop">
      <div
        ref={dialogRef}
        class="gr-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        onKeyDown={onKeyDown}
      >
        <h2 id={`${id}-title`} class="gr-modal__title">{title}</h2>
        <p id={`${id}-desc`} class="gr-modal__desc">{description}</p>
        <div class="gr-modal__actions">
          <button
            ref={cancelRef}
            type="button"
            class="gr-btn"
            aria-label={t('common.cancel')}
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            class="gr-btn gr-btn--danger"
            aria-label={confirmLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
