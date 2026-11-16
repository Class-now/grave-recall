// Shared helpers for the Kiro agent hook scripts in this folder.
//
// A Kiro command hook receives one JSON object on stdin:
//   { hook_event_name, cwd, session_id, tool_name, tool_input, tool_response? }
// Exit codes used here: 0 = ok (stdout goes to the agent), 2 = failure or block
// (stderr goes back to the agent; for PreToolUse the tool call is blocked).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keys under tool_input that hold the target file path, across write tool variants. */
const PATH_KEYS = ['path', 'file_path', 'filePath', 'target_file', 'file'];
/** Keys that hold text being replaced or metadata, not text being written. */
const NON_CONTENT_KEYS = new Set([...PATH_KEYS, 'command', 'old_str', 'old_string', 'oldStr', 'explanation', 'summary']);

/**
 * Parse the raw stdin text of a hook event.
 * @param {string} raw
 * @returns {Record<string, any> | null}
 */
export function parseEvent(raw) {
  try {
    const value = JSON.parse(raw);
    return value !== null && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/** @returns {string} */
export function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/**
 * The file path a write tool call targets, as given by the tool (may be relative or absolute).
 * @param {Record<string, any>} event
 * @returns {string | null}
 */
export function writtenPath(event) {
  const input = event?.tool_input;
  if (input === null || typeof input !== 'object') return null;
  for (const key of PATH_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return null;
}

/**
 * All text a write tool call puts into the file (file_text, new_str, insert_text, ...).
 * Text that is being replaced (old_str) is ignored.
 * @param {Record<string, any>} event
 * @returns {string}
 */
export function writtenText(event) {
  const input = event?.tool_input;
  if (input === null || typeof input !== 'object') return '';
  return Object.entries(input)
    .filter(([key, value]) => !NON_CONTENT_KEYS.has(key) && typeof value === 'string')
    .map(([, value]) => value)
    .join('\n');
}

/**
 * Turn a tool path into a forward-slash path relative to the project root.
 * Returns null when the path is outside the project.
 * @param {string} filePath
 * @param {string} [root]
 * @param {string} [cwd] directory that relative paths are relative to
 * @returns {string | null}
 */
export function toProjectPath(filePath, root = process.cwd(), cwd = root) {
  const absolute = path.resolve(cwd, filePath);
  const relative = path.relative(root, absolute);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join('/');
}

/**
 * True when the module is the process entry point (so tests can import it without running it).
 * @param {string} metaUrl import.meta.url of the calling module
 * @returns {boolean}
 */
export function isMain(metaUrl) {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}

/**
 * Run a guard: read the event, ask `check` for a list of problems, exit 2 if there are any.
 * A bad or missing event exits 1, which Kiro shows as a warning without blocking.
 * @param {(event: Record<string, any>) => string[]} check
 * @returns {never}
 */
export function runGuard(check) {
  const event = parseEvent(readStdin());
  if (event === null) {
    process.stderr.write('kiro-hook: could not read the hook event from stdin\n');
    process.exit(1);
  }
  const problems = check(event);
  if (problems.length > 0) {
    process.stderr.write(`${problems.join('\n')}\n`);
    process.exit(2);
  }
  process.exit(0);
}
