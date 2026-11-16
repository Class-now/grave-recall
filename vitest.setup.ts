/**
 * Vitest setup file - runs before all tests
 */
import { vi } from 'vitest';

// Mock window.matchMedia globally for all tests. Files that opt into the node
// environment (e.g. src/bundle.test.ts, which runs the Vite build) have no window.
if (typeof window !== 'undefined') Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
