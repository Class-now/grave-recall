/**
 * Backup and restore: downloads the whole app state as a timestamped JSON
 * file, or replaces it from a file chosen by the user. Everything stays in
 * the browser.
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';

import { exportJson, importJson } from '../../store';
import { importSuccess } from '../../audio/sounds';
import { t, ti } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

import './settings.css';

type Notice = { kind: 'success' | 'error'; text: string } | null;

/** `grave-recall-2024-05-01T12-30-00.json`: sortable and valid in file names on every OS. */
export function exportFileName(now: Date): string {
  return `grave-recall-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function ExportImport(): h.JSX.Element {
  const [notice, setNotice] = useState<Notice>(null);

  function fail(reason: TranslationKey): void {
    setNotice({ kind: 'error', text: ti('settings.importError', { error: t(reason) }) });
  }

  function onExport(): void {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(new Date());
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({ kind: 'success', text: t('settings.exportSuccess') });
  }

  async function onFileChosen(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      if (importJson(text)) {
        importSuccess();
        setNotice({ kind: 'success', text: t('settings.importSuccess') });
      } else {
        fail(isValidJson(text) ? 'error.importFailed' : 'error.invalidJson');
      }
    } catch {
      fail('error.importFailed');
    } finally {
      // Lets the user pick the same file again after fixing it.
      input.value = '';
    }
  }

  return (
    <div class="gr-settings__data">
      <div class="gr-settings__row gr-settings__row--inline">
        <button type="button" class="gr-btn" onClick={onExport}>
          {t('settings.export')}
        </button>
      </div>
      <div class="gr-field">
        <label class="gr-label" for="gr-setting-import">
          {t('settings.import')}
        </label>
        <input
          id="gr-setting-import"
          class="gr-input"
          type="file"
          accept="application/json,.json"
          onChange={(e) => void onFileChosen(e)}
        />
      </div>
      <div class="gr-status" role="status">
        {notice?.kind === 'success' && notice.text}
      </div>
      <div role="alert">{notice?.kind === 'error' && <p class="gr-error">{notice.text}</p>}</div>
    </div>
  );
}