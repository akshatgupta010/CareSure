import fs from 'fs';
import { parse } from 'csv-parse';
import { AppError } from '../../utils/errors.js';

/**
 * Sanitizes CSV values against spreadsheet formula injection attacks (=, +, -, @).
 */
export function sanitizeCellValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (['=', '+', '-', '@'].includes(str.charAt(0))) {
    // Neutralize formula injection prefix
    str = `'${str}`;
  }
  return str;
}

export interface ParseResult<T> {
  rowsParsed: number;
  rowsRejected: number;
  data: T[];
  rejected: Array<{ row: number; reason: string }>;
}

export async function parseCsvFile<T>(
  filePath: string,
  rowMapper: (record: Record<string, string>, rowIndex: number) => T
): Promise<ParseResult<T>> {
  if (!fs.existsSync(filePath)) {
    throw new AppError('CSV_PARSE_ERROR', 400, 'Uploaded CSV file not found on disk');
  }

  const parser = fs.createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  const data: T[] = [];
  const rejected: Array<{ row: number; reason: string }> = [];
  let rowIndex = 1;

  for await (const record of parser) {
    rowIndex++;
    try {
      // Sanitize all record cells
      const sanitizedRecord: Record<string, string> = {};
      for (const [key, val] of Object.entries(record)) {
        sanitizedRecord[key.trim()] = sanitizeCellValue(val);
      }

      const mapped = rowMapper(sanitizedRecord, rowIndex);
      if (mapped) {
        data.push(mapped);
      }
    } catch (err: any) {
      rejected.push({
        row: rowIndex,
        reason: err.message || 'Row validation failed',
      });
    }
  }

  return {
    rowsParsed: data.length,
    rowsRejected: rejected.length,
    data,
    rejected,
  };
}
