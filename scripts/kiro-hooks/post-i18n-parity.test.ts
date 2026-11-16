/**
 * Unit tests for the en/ja key parity hook logic.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { checkLocaleWrite, compareKeySets, describeMismatch, extractKeys, findLocalePairs } from './post-i18n-parity.mjs';

describe('extractKeys', () => {
  it('reads quoted and bare keys and skips comments', () => {
    const source = [
      "import type { TranslationKey } from './types';",
      'export const en: Record<TranslationKey, string> = {',
      '  // Navigation',
      "  'nav.graveyard': 'The Graveyard',",
      '  "nav.seance": "Séance",',
      "  plain: 'x',",
      "  /* 'old.key': 'removed', */",
      '};',
    ].join('\n');
    expect(extractKeys(source)).toEqual(['nav.graveyard', 'nav.seance', 'plain']);
  });

  it('is not fooled by colons and quotes inside values', () => {
    const source = "export const en = {\n  'a.b': 'Time: 5 minutes',\n  'c.d': \"it's here\",\n};";
    expect(extractKeys(source)).toEqual(['a.b', 'c.d']);
  });

  it('handles CRLF line endings and de-duplicates keys', () => {
    expect(extractKeys("  'a': '1',\r\n  'a': '2',\r\n  'b': '3',\r\n")).toEqual(['a', 'b']);
  });
});

describe('compareKeySets', () => {
  it('reports keys missing on each side', () => {
    expect(compareKeySets(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual({ missingInJa: ['a'], missingInEn: ['d'] });
  });

  it('reports nothing for equal sets in any order', () => {
    expect(compareKeySets(['a', 'b'], ['b', 'a'])).toEqual({ missingInJa: [], missingInEn: [] });
  });
});

describe('describeMismatch', () => {
  it('lists every missing key under the file that lacks it', () => {
    const lines = describeMismatch({ missingInJa: ['x.one', 'x.two'], missingInEn: ['y.one'] }, 'src/i18n/en.ts', 'src/i18n/ja.ts');
    expect(lines).toEqual([
      'src/i18n/ja.ts is missing 2 key(s) present in src/i18n/en.ts:',
      '  - x.one',
      '  - x.two',
      'src/i18n/en.ts is missing 1 key(s) present in src/i18n/ja.ts:',
      '  - y.one',
    ]);
  });

  it('returns no lines when the tables match', () => {
    expect(describeMismatch({ missingInJa: [], missingInEn: [] }, 'en.ts', 'ja.ts')).toEqual([]);
  });
});

describe('checkLocaleWrite with real files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'kiro-i18n-'));
  const i18nDir = path.join(root, 'src', 'i18n');
  mkdirSync(i18nDir, { recursive: true });
  mkdirSync(path.join(root, 'src', 'store'), { recursive: true });
  writeFileSync(path.join(i18nDir, 'en.ts'), "export const en = {\n  'a': 'A',\n  'b': 'B',\n  'c': 'C',\n};\n");
  writeFileSync(path.join(i18nDir, 'ja.ts'), "export const ja = {\n  'a': 'あ',\n  'b': 'い',\n};\n");
  writeFileSync(path.join(root, 'src', 'store', 'en.txt'), 'not a locale');

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const event = (file: string): Record<string, unknown> => ({ cwd: root, tool_input: { command: 'create', path: file, file_text: '' } });

  it('finds the folder that holds both locale files', () => {
    expect(findLocalePairs(path.join(root, 'src'))).toEqual([{ en: path.join(i18nDir, 'en.ts'), ja: path.join(i18nDir, 'ja.ts') }]);
  });

  it('fails with the missing keys when a locale file is written', () => {
    const problems = checkLocaleWrite(event('src/i18n/en.ts'), root);
    expect(problems).toEqual(['src/i18n/ja.ts is missing 1 key(s) present in src/i18n/en.ts:', '  - c']);
    expect(checkLocaleWrite(event('src/i18n/ja.ts'), root)).toEqual(problems);
  });

  it('passes once the tables match', () => {
    writeFileSync(path.join(i18nDir, 'ja.ts'), "export const ja = {\n  'a': 'あ',\n  'b': 'い',\n  'c': 'う',\n};\n");
    expect(checkLocaleWrite(event('src/i18n/ja.ts'), root)).toEqual([]);
  });

  it('ignores writes to other files', () => {
    expect(checkLocaleWrite(event('src/store/en.txt'), root)).toEqual([]);
    expect(checkLocaleWrite(event('src/i18n/types.ts'), root)).toEqual([]);
  });
});
