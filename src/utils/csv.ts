/**
 * TSV/CSV parser with auto-detection of delimiter.
 */

export interface ParseResult {
  /** Array of parsed rows, each row is an array of cell strings */
  rows: string[][];
  /** Number of rows that were skipped due to being malformed */
  skippedCount: number;
}

/**
 * Determines the likely delimiter (tab or comma) by checking the first line.
 */
function detectDelimiter(text: string): '\t' | ',' {
  const firstLine = text.split('\n')[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount >= commaCount ? '\t' : ',';
}

/**
 * Parses a cell that may be quoted.
 */
function parseCell(cell: string, _delimiter: string): string {
  if (cell.startsWith('"') && cell.endsWith('"') && cell.length >= 2) {
    // Unescape double-quoted cells: "" becomes "
    return cell.slice(1, -1).replace(/""/g, '"');
  }
  // Don't trim unquoted cells to preserve meaningful whitespace
  return cell;
}

/**
 * Parses a single line, handling quoted fields.
 */
function parseLine(line: string, delimiter: string): string[] | null {
  if (!line.trim()) {
    return null; // Skip empty lines
  }

  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? '';

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(parseCell(current, delimiter));
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last cell
  cells.push(parseCell(current, delimiter));

  // Validate: all cells must be non-empty
  if (cells.some(cell => cell === '')) {
    return null;
  }

  return cells;
}

/**
 * Parses TSV or CSV text, auto-detecting the delimiter.
 * @param text - The input text to parse
 * @returns ParseResult with rows and skippedCount
 */
export function parseTsvCsv(text: string): ParseResult {
  if (!text || !text.trim()) {
    return { rows: [], skippedCount: 0 };
  }

  const delimiter = detectDelimiter(text);
  const lines = text.split('\n');
  const rows: string[][] = [];
  let skippedCount = 0;

  for (const line of lines) {
    const parsed = parseLine(line, delimiter);
    if (parsed !== null) {
      rows.push(parsed);
    } else if (line.trim()) {
      skippedCount++;
    }
  }

  return { rows, skippedCount };
}

/**
 * Converts an array of rows back to TSV format (for round-trip testing).
 */
export function toTsv(rows: string[][]): string {
  return rows
    .map(row =>
      row.map(cell => {
        // Escape cells that contain delimiter, quotes, or newlines
        if (cell.includes('\t') || cell.includes('\n') || cell.includes('"') || cell.includes(',')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join('\t')
    )
    .join('\n');
}