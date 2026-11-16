// PostToolUse check: the English and Japanese string tables must define the same keys.
// Locale files are found under src/ as a folder that holds both en.ts and ja.ts.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { isMain, runGuard, toProjectPath, writtenPath } from './hook-io.mjs';

const KEY_PATTERN = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([A-Za-z_$][\w$]*))\s*:/;

/**
 * Keys of a locale table, one `key: value` entry per line.
 * @param {string} source contents of en.ts or ja.ts
 * @returns {string[]}
 */
export function extractKeys(source) {
  const keys = new Set();
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const line of withoutBlockComments.split(/\r?\n/)) {
    if (/^\s*\/\//.test(line)) continue;
    const match = KEY_PATTERN.exec(line);
    if (match === null) continue;
    keys.add(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return [...keys];
}

/**
 * @param {string[]} enKeys
 * @param {string[]} jaKeys
 * @returns {{ missingInJa: string[], missingInEn: string[] }}
 */
export function compareKeySets(enKeys, jaKeys) {
  const en = new Set(enKeys);
  const ja = new Set(jaKeys);
  return {
    missingInJa: enKeys.filter((key) => !ja.has(key)),
    missingInEn: jaKeys.filter((key) => !en.has(key)),
  };
}

/**
 * @param {{ missingInJa: string[], missingInEn: string[] }} diff
 * @param {string} enFile
 * @param {string} jaFile
 * @returns {string[]} report lines; empty when the key sets match
 */
export function describeMismatch(diff, enFile, jaFile) {
  const lines = [];
  if (diff.missingInJa.length > 0) {
    lines.push(`${jaFile} is missing ${diff.missingInJa.length} key(s) present in ${enFile}:`);
    lines.push(...diff.missingInJa.map((key) => `  - ${key}`));
  }
  if (diff.missingInEn.length > 0) {
    lines.push(`${enFile} is missing ${diff.missingInEn.length} key(s) present in ${jaFile}:`);
    lines.push(...diff.missingInEn.map((key) => `  - ${key}`));
  }
  return lines;
}

/**
 * Find folders under `srcDir` that contain both en.ts and ja.ts.
 * @param {string} srcDir absolute path of src/
 * @returns {{ en: string, ja: string }[]} absolute paths
 */
export function findLocalePairs(srcDir) {
  /** @type {{ en: string, ja: string }[]} */
  const pairs = [];
  /** @param {string} dir */
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const en = path.join(dir, 'en.ts');
    const ja = path.join(dir, 'ja.ts');
    if (entries.some((e) => e.isFile() && e.name === 'en.ts') && entries.some((e) => e.isFile() && e.name === 'ja.ts')) {
      pairs.push({ en, ja });
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'node_modules') walk(path.join(dir, entry.name));
    }
  };
  if (existsSync(srcDir)) walk(srcDir);
  return pairs;
}

/**
 * @param {Record<string, any>} event PostToolUse event for a write tool
 * @param {string} [root] project root
 * @returns {string[]} problems; empty when the written file is not a locale file or the tables match
 */
export function checkLocaleWrite(event, root = process.cwd()) {
  const target = writtenPath(event);
  if (target === null) return [];
  const rel = toProjectPath(target, root, event.cwd);
  if (rel === null || !rel.startsWith('src/')) return [];
  const pair = findLocalePairs(path.join(root, 'src')).find(
    (p) => toProjectPath(p.en, root) === rel || toProjectPath(p.ja, root) === rel,
  );
  if (pair === undefined) return [];
  const diff = compareKeySets(
    extractKeys(readFileSync(pair.en, 'utf8')),
    extractKeys(readFileSync(pair.ja, 'utf8')),
  );
  return describeMismatch(diff, toProjectPath(pair.en, root) ?? pair.en, toProjectPath(pair.ja, root) ?? pair.ja);
}

if (isMain(import.meta.url)) runGuard(checkLocaleWrite);
