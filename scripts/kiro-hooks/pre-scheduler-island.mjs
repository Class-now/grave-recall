// PreToolUse guard: src/scheduler/ is an island (structure.md, rule 1).
// Blocks a write into src/scheduler/ whose content imports anything from outside it.
import path from 'node:path';

import { isMain, runGuard, toProjectPath, writtenPath, writtenText } from './hook-io.mjs';

const SCHEDULER_DIR = 'src/scheduler';
/** Packages a scheduler test file may import. Production files may import nothing. */
const TEST_ONLY_PACKAGES = ['vitest', 'fast-check'];

const IMPORT_PATTERNS = [
  // import x from 'a', import type { x } from 'a', export * from 'a' (also multi-line lists)
  /\b(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
  // import 'a'
  /\bimport\s*['"]([^'"]+)['"]/g,
  // import('a')
  /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
  // require('a')
  /\brequire\s*\(\s*['"]([^'"]+)['"]/g,
];

/**
 * Remove comments so that an import mentioned in a comment is not flagged.
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

/**
 * Every module specifier imported by the source text.
 * @param {string} source
 * @returns {string[]}
 */
export function importSpecifiers(source) {
  const clean = stripComments(source);
  const found = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of clean.matchAll(pattern)) {
      if (match[1] !== undefined) found.add(match[1]);
    }
  }
  return [...found];
}

/**
 * @param {string} specifier module specifier as written
 * @param {string} filePath project-relative path of the file that contains it
 * @returns {boolean}
 */
export function isAllowedSchedulerImport(specifier, filePath) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), specifier));
    return target === SCHEDULER_DIR || target.startsWith(`${SCHEDULER_DIR}/`);
  }
  // tsconfig "paths" alias for the scheduler itself
  if (specifier === 'scheduler' || specifier.startsWith('scheduler/')) return true;
  const isTestFile = /\.test\.[cm]?[jt]sx?$/.test(filePath);
  return isTestFile && TEST_ONLY_PACKAGES.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

/**
 * Imports in `source` that break the scheduler island rule.
 * @param {string} source
 * @param {string} filePath project-relative path, forward slashes
 * @returns {string[]}
 */
export function findForeignImports(source, filePath) {
  return importSpecifiers(source).filter((specifier) => !isAllowedSchedulerImport(specifier, filePath));
}

/**
 * @param {Record<string, any>} event PreToolUse event for a write tool
 * @param {string} [root] project root
 * @returns {string[]} problems; empty when the write is allowed
 */
export function checkSchedulerWrite(event, root = process.cwd()) {
  const target = writtenPath(event);
  if (target === null) return [];
  const rel = toProjectPath(target, root, event.cwd);
  if (rel === null || !rel.startsWith(`${SCHEDULER_DIR}/`)) return [];
  const foreign = findForeignImports(writtenText(event), rel);
  if (foreign.length === 0) return [];
  return [
    `Blocked: ${rel} imports from outside src/scheduler/: ${foreign.join(', ')}.`,
    'The scheduler is a pure island (structure.md rule 1): import only from files inside src/scheduler/.',
  ];
}

if (isMain(import.meta.url)) runGuard((event) => checkSchedulerWrite(event));
