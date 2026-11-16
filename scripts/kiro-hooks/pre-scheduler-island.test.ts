/**
 * Unit tests for the scheduler-island hook logic.
 * These scripts are plain .mjs outside src/, so tsc does not check them; vitest runs this file.
 */
import { describe, it, expect } from 'vitest';

import { checkSchedulerWrite, findForeignImports, importSpecifiers } from './pre-scheduler-island.mjs';

const ROOT = process.cwd();

function writeEvent(path: string, text: string): Record<string, unknown> {
  return { hook_event_name: 'PreToolUse', cwd: ROOT, tool_name: 'fs_write', tool_input: { command: 'create', path, file_text: text } };
}

describe('importSpecifiers', () => {
  it('finds static, type, re-export, side-effect, dynamic and require imports', () => {
    const source = [
      "import { a } from './a.js';",
      "import type { B } from '../store/b';",
      "export * from './c.js';",
      "import './side-effect';",
      "const d = await import('./d.js');",
      "const e = require('node:fs');",
      'import {',
      '  f,',
      "} from 'preact';",
    ].join('\n');
    expect(importSpecifiers(source).sort()).toEqual(
      ['../store/b', './a.js', './c.js', './d.js', './side-effect', 'node:fs', 'preact'].sort(),
    );
  });

  it('ignores imports that only appear in comments', () => {
    const source = "// import x from 'preact'\n/* import y from '../store' */\nexport const z = 1;";
    expect(importSpecifiers(source)).toEqual([]);
  });
});

describe('findForeignImports', () => {
  const file = 'src/scheduler/fsrs.ts';

  it('allows imports that stay inside src/scheduler/', () => {
    const source = "import type { CardState } from './types.js';\nexport { schedule } from './fsrs.js';";
    expect(findForeignImports(source, file)).toEqual([]);
  });

  it('allows the scheduler/ path alias', () => {
    expect(findForeignImports("import { schedule } from 'scheduler/index';", 'src/scheduler/index.ts')).toEqual([]);
  });

  it('flags relative imports that leave src/scheduler/', () => {
    const source = "import { now } from '../utils/date';\nimport { sig } from '../store/cards.js';";
    expect(findForeignImports(source, file)).toEqual(['../utils/date', '../store/cards.js']);
  });

  it('flags a sibling folder whose name starts with scheduler', () => {
    expect(findForeignImports("import x from '../scheduler-extras/x';", file)).toEqual(['../scheduler-extras/x']);
  });

  it('flags packages, node built-ins and src-rooted paths in production files', () => {
    const source = "import { signal } from '@preact/signals';\nimport fs from 'node:fs';\nimport t from 'src/i18n/en';";
    expect(findForeignImports(source, file)).toEqual(['@preact/signals', 'node:fs', 'src/i18n/en']);
  });

  it('lets test files import vitest and fast-check but nothing else outside', () => {
    const source = "import { it } from 'vitest';\nimport * as fc from 'fast-check';\nimport { t } from '../i18n';";
    expect(findForeignImports(source, 'src/scheduler/scheduler.test.ts')).toEqual(['../i18n']);
  });

  it('does not let production files import vitest', () => {
    expect(findForeignImports("import { it } from 'vitest';", file)).toEqual(['vitest']);
  });
});

describe('checkSchedulerWrite', () => {
  it('blocks a write under src/scheduler/ that imports from outside', () => {
    const problems = checkSchedulerWrite(writeEvent('src/scheduler/fsrs.ts', "import { x } from '../store';"), ROOT);
    expect(problems[0]).toContain('src/scheduler/fsrs.ts');
    expect(problems[0]).toContain('../store');
  });

  it('accepts an absolute path inside the project', () => {
    const abs = `${ROOT}/src/scheduler/fsrs.ts`;
    expect(checkSchedulerWrite(writeEvent(abs, "import x from 'preact';"), ROOT)).not.toEqual([]);
  });

  it('allows a clean write under src/scheduler/', () => {
    expect(checkSchedulerWrite(writeEvent('src/scheduler/fsrs.ts', "import type { A } from './types.js';"), ROOT)).toEqual([]);
  });

  it('ignores writes outside src/scheduler/', () => {
    expect(checkSchedulerWrite(writeEvent('src/store/cards.ts', "import { schedule } from '../scheduler/index.js';"), ROOT)).toEqual([]);
  });

  it('checks the inserted text of an edit and ignores the replaced text', () => {
    const event = {
      cwd: ROOT,
      tool_input: { command: 'str_replace', path: 'src/scheduler/fsrs.ts', old_str: "import x from 'preact';", new_str: "import y from './types.js';" },
    };
    expect(checkSchedulerWrite(event, ROOT)).toEqual([]);
  });

  it('ignores events with no file path', () => {
    expect(checkSchedulerWrite({ cwd: ROOT, tool_input: { command: 'ls' } }, ROOT)).toEqual([]);
  });
});
