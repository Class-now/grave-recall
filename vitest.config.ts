import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Cast is needed because vitest bundles its own vite copy (v5) while
// @preact/preset-vite targets the top-level vite (v6). The plugin is
// structurally compatible at runtime even though the types diverge.
// skipLibCheck in tsconfig suppresses lib-level errors; this is the
// only project-file cast required.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plugin = preact() as any;

export default defineConfig({
  plugins: [plugin],
  test: {
    environment: 'jsdom',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  },
});
