/**
 * File Mode - File parsing utilities
 */

import { FileFormat, ParseResult, ParsedMessage } from './types';

/**
 * Detect file format from filename and content
 */
export function detectFormat(filename: string, sample: string): FileFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'jsonl' || ext === 'ndjson') return 'jsonl';
  if (ext === 'json') {
    // Check if it's JSON Lines disguised as .json
    const lines = sample.split('\n').filter(l => l.trim());
    if (lines.length > 1 && lines.every(l => l.trim().startsWith('{'))) {
      return 'jsonl';
    }
    return 'json';
  }
  
  // Content-based detection
  const lines = sample.split('\n').filter(l => l.trim());
  if (lines.length === 0) return 'jsonl';
  
  // Check for JSON Lines first (before CSV to avoid misdetecting JSON with commas)
  if (lines[0].trim().startsWith('{')) {
    try {
      JSON.parse(lines[0]);
      return 'jsonl';
    } catch {
      // Not valid JSON, continue to check other formats
    }
  }
  
  // Check for JSON Array
  if (sample.trim().startsWith('[')) {
    return 'json';
  }
  
  // Check for CSV (only if not valid JSON)
  if (lines[0].includes(',') || lines[0].includes('\t')) {
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    if (commaCount > 0 || tabCount > 0) {
      return 'csv';
    }
  }
  
  return 'jsonl';
}

/**
 * Parse file content based on format
 */
export function parseFile(content: string, format: FileFormat): ParseResult {
  switch (format) {
    case 'json':
      return parseJsonArray(content);
    case 'jsonl':
      return parseJsonLines(content);
    case 'csv':
      return parseCsv(content);
    default:
      return parseJsonLines(content);
  }
}

/**
 * Parse JSON Array format
 */
function parseJsonArray(content: string): ParseResult {
  const errors: string[] = [];
  const messages: ParsedMessage[] = [];
  
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      return { messages: [], errors: [], totalLines: 0 };
    }
    
    const parsed = JSON.parse(trimmed);
    
    if (!Array.isArray(parsed)) {
      // Single object, wrap in array
      messages.push(normalizeMessage(parsed));
      return { messages, errors, totalLines: 1 };
    }
    
    for (let i = 0; i < parsed.length; i++) {
      try {
        messages.push(normalizeMessage(parsed[i]));
      } catch (error) {
        errors.push(`Item ${i + 1}: ${error}`);
      }
    }
    
    return { messages, errors, totalLines: parsed.length };
  } catch (error) {
    errors.push(`Parse error: ${error}`);
    return { messages, errors, totalLines: 0 };
  }
}

/**
 * Parse JSON Lines format
 */
function parseJsonLines(content: string): ParseResult {
  const errors: string[] = [];
  const messages: ParsedMessage[] = [];
  
  const lines = content.split('\n').filter(l => l.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const parsed = JSON.parse(line);
      messages.push(normalizeMessage(parsed));
    } catch (error) {
      errors.push(`Line ${i + 1}: Invalid JSON`);
    }
  }
  
  return { messages, errors, totalLines: lines.length };
}

/**
 * Parse CSV format
 */
function parseCsv(content: string): ParseResult {
  const errors: string[] = [];
  const messages: ParsedMessage[] = [];
  
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    return { messages: [], errors: [], totalLines: 0 };
  }
  
  // Detect separator
  const firstLine = lines[0];
  const separator = firstLine.includes('\t') ? '\t' : ',';
  
  // Parse headers
  const headers = firstLine.split(separator).map(h => 
    h.trim().replace(/^["']|["']$/g, '')
  );
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCsvLine(line, separator);
      const row: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        row[header] = values[idx] !== undefined ? values[idx] : '';
      });
      
      messages.push({
        value: row,
        _raw: row,
      });
    } catch (error) {
      errors.push(`Row ${i}: Parse error`);
    }
  }
  
  return { messages, errors, totalLines: lines.length - 1 };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCsvLine(line: string, separator: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last value
  values.push(current.trim());
  
  // Trim quotes from values
  return values.map(v => v.replace(/^["']|["']$/g, ''));
}

/**
 * Normalize a message from various formats to standard format
 */
function normalizeMessage(data: any): ParsedMessage {
  if (typeof data === 'string') {
    return { value: data };
  }
  
  if (typeof data !== 'object' || data === null) {
    return { value: String(data) };
  }
  
  // Handle Kafka consumer export format
  if (data.key !== undefined || data.value !== undefined) {
    return {
      key: data.key !== undefined ? String(data.key) : undefined,
      value: typeof data.value === 'object' ? JSON.stringify(data.value) : String(data.value),
      headers: data.headers,
      partition: data.partition,
    };
  }
  
  // Handle direct message format
  return {
    value: data,
  };
}

/**
 * Estimate total message count without full parsing
 */
export function estimateMessageCount(content: string, format: FileFormat): number {
  const lines = content.split('\n').filter(l => l.trim());
  
  switch (format) {
    case 'jsonl':
      return lines.length;
    case 'csv':
      return Math.max(0, lines.length - 1); // Exclude header
    case 'json':
      try {
        const parsed = JSON.parse(content.trim());
        return Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        return lines.length;
      }
    default:
      return lines.length;
  }
}
