/**
 * CSV/TSV parser unit tests
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseTsvCsv, toTsv } from './csv';

describe('parseTsvCsv', () => {
  it('parses tab-delimited input', () => {
    const input = 'apple\tred\nbanana\tyellow';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['apple', 'red'], ['banana', 'yellow']]);
    expect(result.skippedCount).toBe(0);
  });

  it('parses comma-delimited input', () => {
    const input = 'apple,red\nbanana,yellow';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['apple', 'red'], ['banana', 'yellow']]);
    expect(result.skippedCount).toBe(0);
  });

  it('handles quoted fields with commas inside', () => {
    const input = '"apple, red",fruit\n"banana, yellow",fruit';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['apple, red', 'fruit'], ['banana, yellow', 'fruit']]);
    expect(result.skippedCount).toBe(0);
  });

  it('handles escaped quotes in CSV', () => {
    const input = '"say ""hello""",greeting\n"say ""goodbye""",farewell';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['say "hello"', 'greeting'], ['say "goodbye"', 'farewell']]);
    expect(result.skippedCount).toBe(0);
  });

  it('skips malformed rows with empty cells', () => {
    const input = 'apple\tred\napple\t\nbanana\tyellow';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['apple', 'red'], ['banana', 'yellow']]);
    expect(result.skippedCount).toBe(1);
  });

  it('skips empty lines', () => {
    const input = 'apple\tred\n\nbanana\tyellow\n';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['apple', 'red'], ['banana', 'yellow']]);
    expect(result.skippedCount).toBe(0);
  });

  it('handles empty input', () => {
    const result = parseTsvCsv('');
    expect(result.rows).toEqual([]);
    expect(result.skippedCount).toBe(0);
  });

  it('handles whitespace-only input', () => {
    const result = parseTsvCsv('   \n  \n');
    expect(result.rows).toEqual([]);
    expect(result.skippedCount).toBe(0);
  });

  it('auto-detects tab as preferred delimiter when both tabs and commas present', () => {
    const input = 'a\tb,c\nd\te,f';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['a', 'b,c'], ['d', 'e,f']]);
    expect(result.skippedCount).toBe(0);
  });

  it('auto-detects comma as delimiter when more commas than tabs', () => {
    const input = 'a,b,c\nd,e,f';
    const result = parseTsvCsv(input);
    expect(result.rows).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);
    expect(result.skippedCount).toBe(0);
  });
});

describe('CSV round-trip property test', () => {
  it('should preserve well-formed rows through TSV serialization and parsing', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(
            // Strings that don't need quoting: no tabs, commas, quotes, or newlines, and not whitespace-only
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('\n') && !s.includes('\t') && !s.includes(',') && !s.includes('"') && s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          const tsv = toTsv(rows);
          const result = parseTsvCsv(tsv);
          expect(result.rows).toEqual(rows);
          expect(result.skippedCount).toBe(0);
        }
      )
    );
  });
});
