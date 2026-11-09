/**
 * Deterministic ID generation using crypto.randomUUID() with a simple fallback.
 */

const NANО_ID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
const NANО_ID_LENGTH = 21;

/**
 * Generates a random ID string.
 * Uses crypto.randomUUID() if available, otherwise falls back to a simple random string.
 */
export function generateId(): string {
  // Try crypto.randomUUID first (preferred)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: simple random string using crypto.getRandomValues
  let result = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(NANО_ID_LENGTH);
    crypto.getRandomValues(bytes);
    const chars = NANО_ID_ALPHABET;
    for (let i = 0; i < NANО_ID_LENGTH; i++) {
      const byte = bytes[i] ?? 0;
      const charCode = chars.charCodeAt(byte % chars.length);
      result += String.fromCharCode(charCode);
    }
  } else {
    // Last resort: Math.random
    const chars = NANО_ID_ALPHABET;
    for (let i = 0; i < NANО_ID_LENGTH; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      const charCode = chars.charCodeAt(idx);
      result += String.fromCharCode(charCode);
    }
  }
  
  return result || 'fallback-id';
}