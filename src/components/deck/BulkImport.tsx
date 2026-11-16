/**
 * Bulk import of cards from pasted TSV / CSV text (US-08).
 * Each line is `front<delim>back[<delim>example]`; malformed lines are skipped and counted.
 */
import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';

import { addCard, saveState } from '../../store';
import type { DeckId } from '../../scheduler/types';
import { t, ti } from '../../i18n';
import { parseTsvCsv } from '../../utils/csv';

import { validateCard } from './CardEditor';
import { BULK_IMPORT_MAX } from './limits';

import './deck.css';

export interface BulkImportSummary {
  imported: number;
  skipped: number;
  /** Valid rows beyond the per-operation limit that were not imported. */
  overLimit: number;
}

export interface BulkRow {
  front: string;
  back: string;
  example: string | null;
}

/**
 * Parses pasted text into importable rows.
 * Rows with fewer than two cells, empty front/back, or over-length fields are counted as skipped.
 */
export function parseBulkText(text: string): { rows: BulkRow[]; skipped: number } {
  // The csv parser splits on "\n"; strip "\r" so Windows line endings do not leak into cells.
  const parsed = parseTsvCsv(text.replace(/\r\n?/g, '\n'));
  const rows: BulkRow[] = [];
  let skipped = parsed.skippedCount;

  for (const cells of parsed.rows) {
    const front = cells[0]?.trim() ?? '';
    const back = cells[1]?.trim() ?? '';
    const example = cells[2]?.trim() ?? '';
    const errors = validateCard(front, back, example);
    if (cells.length < 2 || errors.front !== undefined || errors.back !== undefined || errors.example !== undefined) {
      skipped++;
      continue;
    }
    rows.push({ front, back, example: example.length > 0 ? example : null });
  }
  return { rows, skipped };
}

export interface BulkImportProps {
  deckId: DeckId;
  onImported?: (summary: BulkImportSummary) => void;
}

export function BulkImport(props: BulkImportProps): h.JSX.Element {
  const { deckId, onImported } = props;
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(e: Event): void {
    e.preventDefault();
    const { rows, skipped } = parseBulkText(text);

    if (rows.length === 0 && text.trim().length === 0) {
      setSummary(null);
      setError(true);
      textareaRef.current?.focus();
      return;
    }

    setError(false);
    const toImport = rows.slice(0, BULK_IMPORT_MAX);
    for (const row of toImport) {
      addCard(deckId, row.front, row.back, row.example);
    }
    if (toImport.length > 0) saveState();

    const result: BulkImportSummary = {
      imported: toImport.length,
      skipped,
      overLimit: rows.length - toImport.length,
    };
    setSummary(result);
    if (toImport.length > 0) setText('');
    onImported?.(result);
  }

  return (
    <section class="gr-section" aria-labelledby="bulk-import-title">
      <h3 id="bulk-import-title" class="gr-subheading">{t('import.title')}</h3>
      <form class="gr-form" onSubmit={submit} noValidate>
        <div class="gr-field">
          <label class="gr-label" for="bulk-import-text">{t('import.paste')}</label>
          <p id="bulk-import-hint" class="gr-meta">{t('import.hint')}</p>
          <textarea
            ref={textareaRef}
            id="bulk-import-text"
            class="gr-input"
            rows={6}
            value={text}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'bulk-import-hint bulk-import-error' : 'bulk-import-hint'}
            onInput={(e) => {
              setText((e.currentTarget as HTMLTextAreaElement).value);
              if (error) setError(false);
            }}
          />
          {error && (
            <p id="bulk-import-error" class="gr-error" role="alert">{t('import.nothing')}</p>
          )}
        </div>
        <div>
          <button type="submit" class="gr-btn gr-btn--primary" aria-label={t('import.submit')}>
            {t('import.submit')}
          </button>
        </div>
      </form>

      <div class="gr-status" role="status" aria-live="polite">
        {summary !== null && (
          <>
            <p>{ti('import.success', { count: summary.imported })}</p>
            <p>{ti('import.skipped', { count: summary.skipped })}</p>
            {summary.overLimit > 0 && <p>{ti('import.tooMany', { count: summary.overLimit })}</p>}
          </>
        )}
      </div>
    </section>
  );
}
