// PreToolUse guard: sound is Web Audio synthesis only (product.md, tech.md, design system section 4.1).
// Blocks writes of audio files under src/audio/ or public/.
import path from 'node:path';

import { isMain, runGuard, toProjectPath, writtenPath } from './hook-io.mjs';

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
const GUARDED_PREFIXES = ['src/audio/', 'public/'];

/**
 * @param {string} relPath project-relative path, forward slashes
 * @returns {boolean} true when the path is an audio file in a guarded folder
 */
export function isForbiddenAudioPath(relPath) {
  if (!GUARDED_PREFIXES.some((prefix) => relPath.startsWith(prefix))) return false;
  return AUDIO_EXTENSIONS.includes(path.posix.extname(relPath).toLowerCase());
}

/**
 * @param {Record<string, any>} event PreToolUse event for a write tool
 * @param {string} [root] project root
 * @returns {string[]} problems; empty when the write is allowed
 */
export function checkAudioWrite(event, root = process.cwd()) {
  const target = writtenPath(event);
  if (target === null) return [];
  const rel = toProjectPath(target, root, event.cwd);
  if (rel === null || !isForbiddenAudioPath(rel)) return [];
  return [
    `Blocked: ${rel} is an audio file (${AUDIO_EXTENSIONS.join(', ')} are not allowed).`,
    'Sound in Grave Recall is Web Audio synthesis only. Add a function in src/audio/sounds.ts and a caption in src/audio/captions.ts instead.',
  ];
}

if (isMain(import.meta.url)) runGuard((event) => checkAudioWrite(event));
