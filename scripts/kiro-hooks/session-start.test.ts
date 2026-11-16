/**
 * Unit tests for the session-start task finder.
 */
import { describe, expect, it } from 'vitest';

import { firstUncheckedTask } from './session-start.mjs';

describe('firstUncheckedTask', () => {
  it('returns the first unchecked checkbox line with its line number', () => {
    const md = ['# Tasks', '- [x] done', '  - [x] nested done', '- [ ] next one', '- [ ] after that'].join('\n');
    expect(firstUncheckedTask(md)).toEqual({ line: 4, text: '- [ ] next one' });
  });

  it('finds nested unchecked tasks and trims indentation', () => {
    expect(firstUncheckedTask('- [x] a\n    - [ ] sub task')).toEqual({ line: 2, text: '- [ ] sub task' });
  });

  it('returns null when every task is checked', () => {
    expect(firstUncheckedTask('- [x] a\n- [x] b\n')).toBeNull();
  });

  it('shortens very long lines', () => {
    const result = firstUncheckedTask(`- [ ] ${'word '.repeat(100)}`);
    expect(result?.text.endsWith('...')).toBe(true);
    expect(result?.text.length).toBeLessThanOrEqual(303);
  });
});
