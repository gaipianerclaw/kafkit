/**
 * File Mode - Streaming file parser for large files
 * Processes files line by line to avoid memory issues
 */

import { FileFormat, ParsedMessage } from './types';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const PREVIEW_LINES = 100; // Number of lines to read for preview

/**
 * File info with size check
 */
export function getFileInfo(file: File): {
  size: number;
  sizeFormatted: string;
  isLarge: boolean;
  lineCount?: number;
} {
  const size = file.size;
  const sizeFormatted = formatFileSize(size);
  const isLarge = size > 100 * 1024 * 1024; // > 100MB considered large

  return { size, sizeFormatted, isLarge };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Read only the first N lines from a file for preview
 * This avoids loading the entire file into memory
 */
export async function readFilePreview(
  file: File,
  format: FileFormat
): Promise<{
  messages: ParsedMessage[];
  errors: string[];
  totalLines: number;
  hasMore: boolean;
}> {
  const messages: ParsedMessage[] = [];
  const errors: string[] = [];
  
  // Special handling for JSON Array format
  if (format === 'json') {
    return readJsonArrayPreview(file);
  }
  
  // Special handling for CSV format - need to parse headers first
  if (format === 'csv') {
    return readCsvPreview(file);
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let processedLines = 0;
    let buffer = '';
    let hasMore = false;
    
    reader.onload = (e) => {
      try {
        const chunk = e.target?.result as string;
        buffer += chunk;
        
        const lines = buffer.split('\n');
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (processedLines >= PREVIEW_LINES) {
            hasMore = true;
            break;
          }
          
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          try {
            const msg = parseLine(trimmed, format, processedLines);
            if (msg) messages.push(msg);
          } catch (error) {
            errors.push(`Line ${processedLines + 1}: ${error}`);
          }
          
          processedLines++;
        }
        
        if (processedLines >= PREVIEW_LINES) {
          hasMore = true;
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onloadend = () => {
      // Process any remaining content in buffer
      if (buffer.trim() && processedLines < PREVIEW_LINES) {
        try {
          const msg = parseLine(buffer.trim(), format, processedLines);
          if (msg) messages.push(msg);
        } catch (error) {
          errors.push(`Line ${processedLines + 1}: ${error}`);
        }
        processedLines++;
      }
      
      resolve({
        messages,
        errors,
        totalLines: processedLines,
        hasMore,
      });
    };
    
    reader.onerror = () => reject(reader.error);
    
    // Read first 1MB for preview
    const previewSize = Math.min(1024 * 1024, file.size);
    const blob = file.slice(0, previewSize);
    reader.readAsText(blob);
  });
}

/**
 * Special preview handler for CSV format
 * Parses headers and then data rows
 */
async function readCsvPreview(file: File): Promise<{
  messages: ParsedMessage[];
  errors: string[];
  totalLines: number;
  hasMore: boolean;
}> {
  const messages: ParsedMessage[] = [];
  const errors: string[] = [];
  
  try {
    // Read first 1MB for preview
    const previewSize = Math.min(1024 * 1024, file.size);
    const blob = file.slice(0, previewSize);
    const text = await readChunk(blob);
    
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      return { messages, errors, totalLines: 0, hasMore: false };
    }
    
    // Parse headers from first line
    const headers = parseCsvHeaders(lines[0]);
    
    // Parse data rows (skip header, limit to PREVIEW_LINES)
    let processedRows = 0;
    const hasMore = lines.length - 1 > PREVIEW_LINES;
    
    for (let i = 1; i < lines.length && processedRows < PREVIEW_LINES; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const row = parseCsvRowRaw(line, headers);
        // Normalize to extract key/value/headers/partition from row
        const msg = normalizeMessage(row);
        messages.push(msg);
        processedRows++;
      } catch (error) {
        errors.push(`Row ${i}: ${error}`);
      }
    }
    
    return {
      messages,
      errors,
      totalLines: lines.length - 1, // Exclude header
      hasMore,
    };
  } catch (error) {
    errors.push(`Parse error: ${error}`);
    return { messages, errors, totalLines: 0, hasMore: false };
  }
}

/**
 * Special preview handler for JSON Array format
 */
async function readJsonArrayPreview(file: File): Promise<{
  messages: ParsedMessage[];
  errors: string[];
  totalLines: number;
  hasMore: boolean;
}> {
  const messages: ParsedMessage[] = [];
  const errors: string[] = [];
  
  try {
    // Read first 1MB for preview
    const previewSize = Math.min(1024 * 1024, file.size);
    const blob = file.slice(0, previewSize);
    const text = await readChunk(blob);
    
    // Try to parse as JSON array
    let parsed;
    let parseError = null;
    
    try {
      parsed = JSON.parse(text.trim());
    } catch (e) {
      parseError = e;
      // If parsing fails, it might be partial content
      // Try progressively smaller truncations
      parsed = tryParsePartialJsonArray(text);
      if (parsed) {
        parseError = null;
      }
    }
    
    if (parseError) {
      throw parseError;
    }
    
    if (!parsed) {
      throw new Error('Failed to parse JSON');
    }
    
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const hasMore = file.size > previewSize || items.length > PREVIEW_LINES;
    
    // Take first PREVIEW_LINES items
    const previewItems = items.slice(0, PREVIEW_LINES);
    
    for (const item of previewItems) {
      try {
        messages.push(normalizeMessage(item));
      } catch (error) {
        errors.push(`Item ${messages.length + 1}: ${error}`);
      }
    }
    
    return {
      messages,
      errors,
      totalLines: items.length,
      hasMore,
    };
  } catch (error) {
    errors.push(`Parse error: ${error}`);
    // Return empty but don't crash
    return { messages, errors, totalLines: 0, hasMore: false };
  }
}

/**
 * Try to parse partial JSON array by finding valid object boundaries
 */
function tryParsePartialJsonArray(text: string): any[] | null {
  // Find the array start
  const arrayStart = text.indexOf('[');
  if (arrayStart === -1) return null;
  
  // Try to find valid JSON object boundaries
  // Look for patterns like },{ or }] 
  const items: any[] = [];
  let currentPos = arrayStart + 1;
  let inString = false;
  let escapeNext = false;
  let braceDepth = 0;
  let objectStart = -1;
  
  for (let i = currentPos; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !inString) {
      inString = true;
    } else if (char === '"' && inString) {
      inString = false;
    } else if (!inString) {
      if (char === '{') {
        if (braceDepth === 0) {
          objectStart = i;
        }
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth === 0 && objectStart !== -1) {
          // Found a complete object
          const objText = text.slice(objectStart, i + 1);
          try {
            const obj = JSON.parse(objText);
            items.push(obj);
            if (items.length >= PREVIEW_LINES) {
              break;
            }
          } catch (e) {
            // Skip invalid object
          }
          objectStart = -1;
        }
      }
    }
  }
  
  return items.length > 0 ? items : null;
}

/**
 * Create an async generator that yields messages from a file one by one
 * This allows processing files of any size without loading them into memory
 */
export async function* createFileMessageGenerator(
  file: File,
  format: FileFormat,
  onProgress?: (current: number) => void
): AsyncGenerator<ParsedMessage, void, unknown> {
  // For JSON array format, we need special handling
  if (format === 'json') {
    yield* jsonArrayGenerator(file, onProgress);
    return;
  }
  
  // For CSV format, read headers first then parse rows
  if (format === 'csv') {
    yield* csvGenerator(file, onProgress);
    return;
  }
  
  let offset = 0;
  let buffer = '';
  let lineNumber = 0;
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const text = await readChunk(chunk);
    buffer += text;
    
    const lines = buffer.split('\n');
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        const msg = parseLine(trimmed, format, lineNumber);
        if (msg) {
          yield msg;
          lineNumber++;
          onProgress?.(lineNumber);
        }
      } catch (error) {
        // Skip invalid lines but continue processing
        console.warn(`Failed to parse line ${lineNumber}:`, error);
        lineNumber++;
      }
    }
    
    offset += CHUNK_SIZE;
  }
  
  // Process any remaining content
  if (buffer.trim()) {
    try {
      const msg = parseLine(buffer.trim(), format, lineNumber);
      if (msg) {
        yield msg;
        onProgress?.(lineNumber + 1);
      }
    } catch (error) {
      console.warn(`Failed to parse last line:`, error);
    }
  }
}

/**
 * Generator for CSV format - reads headers first then yields parsed rows
 */
async function* csvGenerator(
  file: File,
  onProgress?: (current: number) => void
): AsyncGenerator<ParsedMessage, void, unknown> {
  let offset = 0;
  let buffer = '';
  let lineNumber = 0;
  let headers: string[] | null = null;
  let isFirstLine = true;
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const text = await readChunk(chunk);
    buffer += text;
    
    const lines = buffer.split('\n');
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // First non-empty line is headers
      if (isFirstLine) {
        headers = parseCsvHeaders(trimmed);
        isFirstLine = false;
        continue;
      }
      
      // Parse data rows
      if (headers) {
        try {
          const row = parseCsvRowRaw(trimmed, headers);
          const msg = normalizeMessage(row);
          yield msg;
          lineNumber++;
          onProgress?.(lineNumber);
        } catch (error) {
          console.warn(`Failed to parse CSV row ${lineNumber}:`, error);
          lineNumber++;
        }
      }
    }
    
    offset += CHUNK_SIZE;
  }
  
  // Process any remaining content
  if (buffer.trim() && !isFirstLine && headers) {
    try {
      const row = parseCsvRowRaw(buffer.trim(), headers);
      const msg = normalizeMessage(row);
      yield msg;
      onProgress?.(lineNumber + 1);
    } catch (error) {
      console.warn(`Failed to parse last CSV row:`, error);
    }
  }
}

/**
 * Generator for JSON Array format - yields items from the array
 */
async function* jsonArrayGenerator(
  file: File,
  onProgress?: (current: number) => void
): AsyncGenerator<ParsedMessage, void, unknown> {
  // For JSON array, we need to read the entire content
  // This is a limitation - very large JSON arrays may cause issues
  // Recommendation: use JSONL format for very large files
  const text = await readChunk(file);
  
  try {
    const parsed = JSON.parse(text.trim());
    const items = Array.isArray(parsed) ? parsed : [parsed];
    
    for (let i = 0; i < items.length; i++) {
      yield normalizeMessage(items[i]);
      onProgress?.(i + 1);
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON array: ${error}`);
  }
}

/**
 * Read a chunk as text
 */
function readChunk(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(chunk);
  });
}

/**
 * Parse a single line based on format
 */
function parseLine(line: string, format: FileFormat, _lineNumber: number): ParsedMessage | null {
  switch (format) {
    case 'jsonl':
    case 'json':
      return parseJsonLine(line);
    case 'csv':
      // For CSV preview, we return raw line
      // Full CSV parsing with headers happens in the main component
      return { value: line, _raw: { line } };
    default:
      return parseJsonLine(line);
  }
}

/**
 * Parse a JSON line
 */
function parseJsonLine(line: string): ParsedMessage {
  const parsed = JSON.parse(line);
  return normalizeMessage(parsed);
}

/**
 * Normalize a message from various formats
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
 * Parse CSV headers from the first line
 */
export function parseCsvHeaders(firstLine: string): string[] {
  const separator = firstLine.includes('\t') ? '\t' : ',';
  return firstLine.split(separator).map(h => 
    h.trim().replace(/^["']|["']$/g, '')
  );
}

/**
 * Parse a single CSV line with headers, return raw row object
 */
export function parseCsvRowRaw(line: string, headers: string[]): Record<string, string> {
  const separator = line.includes('\t') ? '\t' : ',';
  const values = parseCsvLineInternal(line, separator);
  const row: Record<string, string> = {};
  
  headers.forEach((header, idx) => {
    row[header] = values[idx] !== undefined ? values[idx] : '';
  });
  
  return row;
}

/**
 * Parse a single CSV line with headers
 * @deprecated Use parseCsvRowRaw + normalizeMessage instead
 */
export function parseCsvRow(line: string, headers: string[]): ParsedMessage {
  const row = parseCsvRowRaw(line, headers);
  return {
    value: row,
    _raw: row,
  };
}

function parseCsvLineInternal(line: string, separator: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values.map(v => v.replace(/^["']|["']$/g, ''));
}

/**
 * Get approximate line count without reading entire file
 */
export async function estimateLineCount(file: File): Promise<number> {
  if (file.size === 0) return 0;
  
  // Read first 64KB to estimate average line size
  const sampleSize = Math.min(64 * 1024, file.size);
  const sample = await readChunk(file.slice(0, sampleSize));
  const lines = sample.split('\n').length;
  
  // Estimate total lines based on sample
  const estimatedTotal = Math.floor((lines / sampleSize) * file.size);
  return estimatedTotal;
}
