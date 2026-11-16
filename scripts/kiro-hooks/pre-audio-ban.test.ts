/**
 * Unit tests for the audio-file ban hook logic (sound is synthesis only).
 */
import { describe, it, expect } from 'vitest';

import { AUDIO_EXTENSIONS, checkAudioWrite, isForbiddenAudioPath } from './pre-audio-ban.mjs';

const ROOT = process.cwd();

function writeEvent(path: string): Record<string, unknown> {
  return { hook_event_name: 'PreToolUse', cwd: ROOT, tool_name: 'fs_write', tool_input: { command: 'create', path, file_text: '' } };
}

describe('isForbiddenAudioPath', () => {
  it.each(AUDIO_EXTENSIONS)('blocks %s in src/audio/ and public/', (ext) => {
    expect(isForbiddenAudioPath(`src/audio/scream${ext}`)).toBe(true);
    expect(isForbiddenAudioPath(`public/sounds/toll${ext}`)).toBe(true);
  });

  it('matches extensions case-insensitively', () => {
    expect(isForbiddenAudioPath('public/Toll.MP3')).toBe(true);
  });

  it('allows non-audio files in guarded folders', () => {
    expect(isForbiddenAudioPath('src/audio/sounds.ts')).toBe(false);
    expect(isForbiddenAudioPath('public/starter-crypts/english-100.json')).toBe(false);
    expect(isForbiddenAudioPath('public/grave.svg')).toBe(false);
  });

  it('leaves other folders alone', () => {
    expect(isForbiddenAudioPath('docs/demo.mp3')).toBe(false);
    expect(isForbiddenAudioPath('src/audio-extra/x.mp3')).toBe(false);
  });

  it('does not treat a name that merely contains an extension as audio', () => {
    expect(isForbiddenAudioPath('public/notes-about-mp3.txt')).toBe(false);
  });
});

describe('checkAudioWrite', () => {
  it('blocks writing an audio file under public/', () => {
    const problems = checkAudioWrite(writeEvent('public/sounds/crow.ogg'), ROOT);
    expect(problems[0]).toContain('public/sounds/crow.ogg');
  });

  it('blocks an absolute path inside the project', () => {
    expect(checkAudioWrite(writeEvent(`${ROOT}/src/audio/caw.wav`), ROOT)).not.toEqual([]);
  });

  it('allows ordinary source files', () => {
    expect(checkAudioWrite(writeEvent('src/audio/sounds.ts'), ROOT)).toEqual([]);
  });

  it('ignores paths outside the project and events without a path', () => {
    expect(checkAudioWrite(writeEvent('../elsewhere/public/x.mp3'), ROOT)).toEqual([]);
    expect(checkAudioWrite({ cwd: ROOT, tool_input: {} }, ROOT)).toEqual([]);
  });
});
