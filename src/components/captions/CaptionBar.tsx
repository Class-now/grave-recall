/**
 * Caption bar and screen-reader live region for synthesised sounds (AC-25.1).
 *
 * The bar is always rendered so the `aria-live="polite"` region exists before
 * the first sound. A caption shows for the sound's duration plus
 * `CAPTION_HIDE_DELAY_MS`, then hides (AC-25.3). With "Show Captions" on, the
 * bar stays visible and keeps the latest caption (AC-25.4). Captions are
 * shown whether or not the browser could play the sound.
 */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { CAPTION_HIDE_DELAY_MS, captionEvent } from '../../audio/captions';
import { showCaptions } from '../../store/prefs';
import { t } from '../../i18n';

import './captions.css';

export function CaptionBar(): h.JSX.Element {
  const event = captionEvent.value;
  const permanent = showCaptions.value;
  /** Sequence number of the latest caption whose hide timer has run out. */
  const [expiredSeq, setExpiredSeq] = useState(0);

  useEffect(() => {
    if (event === null) return undefined;
    const { seq, durationMs } = event;
    const timer = setTimeout(() => setExpiredSeq(seq), durationMs + CAPTION_HIDE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [event]);

  const active = event !== null && event.seq !== expiredSeq;
  const shown = event !== null && (active || permanent) ? event : null;

  return (
    <div
      class={shown === null ? 'gr-captions' : 'gr-captions gr-captions--visible'}
      aria-live="polite"
      aria-atomic="true"
      data-testid="caption-bar"
    >
      {/* Keyed by sequence number so a repeated caption is a new node and is announced again. */}
      {shown !== null && (
        <span key={shown.seq} class="gr-captions__text">
          {t(shown.captionKey)}
        </span>
      )}
    </div>
  );
}
