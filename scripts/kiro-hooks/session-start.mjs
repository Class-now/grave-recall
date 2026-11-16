// SessionStart (agentSpawn) hook: show the working tree state and the next open spec task.
// Whatever this prints to stdout is added to the agent's context.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { isMain } from './hook-io.mjs';

const MAX_LINE = 300;

/**
 * First unchecked task line (`- [ ] ...`) in a tasks.md.
 * @param {string} markdown
 * @returns {{ line: number, text: string } | null}
 */
export function firstUncheckedTask(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? '';
    if (/^\s*[-*]\s+\[ \]\s/.test(text)) {
      const trimmed = text.trim();
      return { line: i + 1, text: trimmed.length > MAX_LINE ? `${trimmed.slice(0, MAX_LINE)}...` : trimmed };
    }
  }
  return null;
}

/**
 * @param {string} specsDir absolute path of .kiro/specs
 * @returns {string[]} output lines
 */
export function describeNextTasks(specsDir) {
  if (!existsSync(specsDir)) return ['No .kiro/specs folder.'];
  const lines = [];
  for (const entry of readdirSync(specsDir, { withFileTypes: true })) {
    const tasksFile = path.join(specsDir, entry.name, 'tasks.md');
    if (!entry.isDirectory() || !existsSync(tasksFile)) continue;
    const label = `.kiro/specs/${entry.name}/tasks.md`;
    const next = firstUncheckedTask(readFileSync(tasksFile, 'utf8'));
    lines.push(next === null ? `${label}: no unchecked tasks` : `${label}:${next.line}: ${next.text}`);
  }
  return lines.length > 0 ? lines : ['No tasks.md files found.'];
}

function main() {
  const git = spawnSync('git', ['status', '--short'], { encoding: 'utf8' });
  const status = git.status === 0 ? git.stdout.trimEnd() : `(git status failed: ${(git.stderr ?? '').trim()})`;
  const out = [
    'git status --short:',
    status === '' ? '(clean)' : status,
    '',
    'Next unchecked task:',
    ...describeNextTasks(path.join(process.cwd(), '.kiro', 'specs')),
  ];
  process.stdout.write(`${out.join('\n')}\n`);
}

if (isMain(import.meta.url)) main();
