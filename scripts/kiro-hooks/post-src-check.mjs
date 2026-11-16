// PostToolUse check: after a write under src/, run the type-check and the tests related to that file.
// Failures go to stderr with exit code 2 so Kiro reports them back to the agent.
import { spawnSync } from 'node:child_process';

import { isMain, parseEvent, readStdin, toProjectPath, writtenPath } from './hook-io.mjs';

/** Only plain path characters reach the shell command line. */
const SAFE_PATH = /^[\w@./-]+$/;
const MAX_OUTPUT_LINES = 60;
const STEP_TIMEOUT_MS = 140_000;

/**
 * @param {Record<string, any>} event PostToolUse event for a write tool
 * @param {string} [root]
 * @returns {string | null} project-relative path when the write was under src/ and is safe to pass to a shell
 */
export function srcTarget(event, root = process.cwd()) {
  const target = writtenPath(event);
  if (target === null) return null;
  const rel = toProjectPath(target, root, event.cwd);
  if (rel === null || !rel.startsWith('src/') || !SAFE_PATH.test(rel)) return null;
  return rel;
}

/**
 * Keep the end of long command output, where the errors are.
 * @param {string} text
 * @returns {string}
 */
export function tailLines(text, max = MAX_OUTPUT_LINES) {
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.length <= max ? lines.join('\n') : [`... (${lines.length - max} earlier lines omitted)`, ...lines.slice(-max)].join('\n');
}

/**
 * @param {string} command fixed command line (no untrusted text except a validated path)
 * @returns {{ ok: boolean, output: string }}
 */
function runStep(command) {
  const result = spawnSync(command, { shell: true, encoding: 'utf8', timeout: STEP_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return { ok: result.status === 0 && result.error === undefined, output };
}

function main() {
  const event = parseEvent(readStdin());
  if (event === null) {
    process.stderr.write('kiro-hook: could not read the hook event from stdin\n');
    process.exit(1);
  }
  const rel = srcTarget(event);
  if (rel === null) process.exit(0);

  const steps = [
    { label: 'npm run typecheck', command: 'npm run typecheck' },
    { label: `npx vitest related ${rel} --run`, command: `npx vitest related ${rel} --run --passWithNoTests --silent` },
  ];
  const failures = [];
  for (const step of steps) {
    const { ok, output } = runStep(step.command);
    if (!ok) failures.push(`FAILED: ${step.label}\n${tailLines(output)}`);
  }
  if (failures.length > 0) {
    process.stderr.write(`${failures.join('\n\n')}\n`);
    process.exit(2);
  }
  process.stdout.write(`typecheck and related tests passed for ${rel}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) main();
