/**
 * File Mode - Type definitions
 */

/** Supported file formats */
export type FileFormat = 'auto' | 'json' | 'jsonl' | 'csv';

/** Parsed message structure */
export interface ParsedMessage {
  /** Message key (optional) */
  key?: string;
  /** Message value (required) */
  value: string | object;
  /** Message headers */
  headers?: Record<string, string>;
  /** Target partition (optional) */
  partition?: number;
  /** Raw data for CSV mapping */
  _raw?: Record<string, any>;
}

/** Column mapping for CSV files */
export interface ColumnMapping {
  /** Column containing the message key */
  keyColumn: string;
  /** Column containing the message value */
  valueColumn: string;
  /** Column containing headers (JSON string) */
  headerColumn: string;
  /** Column containing partition number */
  partitionColumn: string;
  /** Whether to use partition from file (default: false) */
  useFilePartition: boolean;
}

/** Timestamp mode types */
export type TimestampMode = 'file' | 'current' | 'fixed' | 'offset';

/** Timestamp configuration */
export interface TimestampConfig {
  /** Timestamp mode */
  mode: TimestampMode;
  /** 
   * Fixed timestamp value (for 'fixed' mode)
   * Can be ISO string or Unix timestamp (ms)
   */
  fixedValue?: string | number;
  /**
   * Offset in milliseconds (for 'offset' mode)
   * Positive = add to original timestamp, Negative = subtract
   */
  offsetMs?: number;
}

/** Value timestamp field configuration */
export interface ValueTimestampConfig {
  /** Whether to modify timestamp in value */
  enabled: boolean;
  /** JSON path to timestamp field (e.g., 'timestamp', 'data.ts') */
  fieldPath: string;
  /** Detected timestamp format */
  format: 'unix_ms' | 'unix_sec' | 'iso8601' | 'iso8601_space' | 'unknown';
  /** 
   * Original timestamp format pattern for formatting output
   * e.g., 'yyyy-MM-dd HH:mm:ss.SSS' for CSV datetime format
   */
  originalFormat?: string;
  /** Timestamp modification mode */
  mode: TimestampMode;
  /** Fixed timestamp value (for 'fixed' mode) */
  fixedValue?: string | number;
  /** Offset in milliseconds (for 'offset' mode) */
  offsetMs?: number;
}

/** Sending strategy types */
export type StrategyType = 'immediate' | 'tps' | 'interval' | 'cron';

/** Sending strategy configuration */
export interface SendingStrategy {
  type: StrategyType;
  config: {
    /** TPS rate (for tps strategy) */
    tps?: number;
    /** Interval in seconds (for interval strategy) */
    intervalSeconds?: number;
    /** Cron expression (for cron strategy) */
    cronExpression?: string;
    /** Start time (for cron strategy) */
    startTime?: string;
    /** End time (for cron strategy) */
    endTime?: string;
  };
}

/** File parsing result */
export interface ParseResult {
  /** Parsed messages */
  messages: ParsedMessage[];
  /** Validation errors */
  errors: string[];
  /** Total line count */
  totalLines: number;
}

/** Progress state */
export interface SendProgress {
  /** Total messages to send */
  total: number;
  /** Successfully sent */
  sent: number;
  /** Failed to send */
  failed: number;
  /** Current position */
  current: number;
}
