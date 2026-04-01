import { describe, it, expect } from 'vitest';
import { readFilePreview, createFileMessageGenerator } from '../../pages/Producer/FileMode/streamFileParser';
import type { ValueTimestampConfig } from '../../pages/Producer/FileMode/types';
import type { ParsedMessage, ColumnMappingType } from '../../pages/Producer/FileMode/FileMode';

// 模拟 buildRecord 中的时间戳修改逻辑
function calculateNewTimestampValue(originalValue: any, config: ValueTimestampConfig): any {
  let originalMs: number;

  if (typeof originalValue === 'number') {
    originalMs = config.format === 'unix_sec' ? originalValue * 1000 : originalValue;
  } else if (typeof originalValue === 'string') {
    const parseValue = config.format === 'iso8601_space' 
      ? originalValue.replace(' ', 'T') 
      : originalValue;
    originalMs = new Date(parseValue).getTime();
    if (isNaN(originalMs)) {
      return originalValue;
    }
  } else {
    return originalValue;
  }

  let newMs: number;
  switch (config.mode) {
    case 'file':
      return originalValue;
    case 'current':
      newMs = Date.now();
      break;
    case 'fixed':
      if (typeof config.fixedValue === 'number') {
        newMs = config.fixedValue;
      } else if (typeof config.fixedValue === 'string') {
        const parsed = new Date(config.fixedValue).getTime();
        newMs = isNaN(parsed) ? originalMs : parsed;
      } else {
        newMs = originalMs;
      }
      break;
    case 'offset':
      newMs = originalMs + (config.offsetMs || 0);
      break;
    default:
      return originalValue;
  }

  switch (config.format) {
    case 'unix_ms':
      return newMs;
    case 'unix_sec':
      return Math.floor(newMs / 1000);
    case 'iso8601':
      return new Date(newMs).toISOString();
    case 'iso8601_space':
      return formatDateWithSpace(newMs);
    default:
      return newMs;
  }
}

function formatDateWithSpace(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const padMs = (n: number) => String(n).padStart(3, '0');
  
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${padMs(date.getMilliseconds())}`;
}

/**
 * Rebuild a CSV row from modified data and original column order
 */
function rebuildCsvRow(data: Record<string, string>, headers: string[]): string {
  return headers.map(header => {
    const value = data[header] ?? '';
    if (value.includes(',') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');
}

// 模拟 buildRecord 函数的时间戳修改部分
function buildRecordWithTimestampModification(
  msg: ParsedMessage,
  mapping: ColumnMappingType,
  valueTimestampConfig: ValueTimestampConfig
): { key?: string; value: string } {
  // Build base record
  let key: string | undefined;
  let value: string;

  // If message has direct key/value fields, use them
  if (msg.key !== undefined || msg.value !== undefined) {
    key = msg.key;
    value = typeof msg.value === 'object' ? JSON.stringify(msg.value) : String(msg.value);
  } else {
    // Otherwise, use column mapping for CSV-style data
    const data = msg._raw || {};
    key = mapping.keyColumn ? data[mapping.keyColumn] : undefined;
    value = mapping.valueColumn ? data[mapping.valueColumn] : JSON.stringify(data);
  }

  // Modify timestamp in value if enabled
  if (valueTimestampConfig.enabled && valueTimestampConfig.fieldPath) {
    // For CSV column paths (e.g., "csv_column_1")
    if (valueTimestampConfig.fieldPath.startsWith('csv_column_')) {
      const columnIndex = parseInt(valueTimestampConfig.fieldPath.replace('csv_column_', ''), 10);
      
      // Get the original CSV line - either from msg._raw._line or rebuild from _raw
      let csvLine: string | undefined;
      
      if (msg._raw?._line && typeof msg._raw._line === 'string') {
        // Use stored original line
        csvLine = msg._raw._line;
      } else if (msg.value && typeof msg.value === 'string' && msg.value.includes(',')) {
        // msg.value might be the original CSV line
        csvLine = msg.value;
      } else {
        // Rebuild CSV line from _raw data using header order
        const data = msg._raw || {};
        const headers = Object.keys(data);
        csvLine = rebuildCsvRow(data, headers);
      }
      
      if (csvLine) {
        const parts = csvLine.split(',');
        if (columnIndex >= 0 && columnIndex < parts.length) {
          const newTimestamp = calculateNewTimestampValue(parts[columnIndex].trim(), valueTimestampConfig);
          parts[columnIndex] = String(newTimestamp);
          const modifiedLine = parts.join(',');
          
          // Update value based on mapping
          if (mapping.valueColumn && msg._raw) {
            // If valueColumn is set, extract the modified value from the column
            const headers = Object.keys(msg._raw);
            const valueIndex = headers.indexOf(mapping.valueColumn);
            if (valueIndex >= 0 && valueIndex < parts.length) {
              value = parts[valueIndex];
            } else {
              value = modifiedLine;
            }
          } else {
            value = modifiedLine;
          }
        }
      }
    } else {
      // For column name paths (e.g., "timestamp"), modify in msg._raw and rebuild value
      const data = msg._raw || {};
      const fieldPath = valueTimestampConfig.fieldPath;
      
      if (fieldPath in data) {
        const originalValue = data[fieldPath];
        const newValue = calculateNewTimestampValue(originalValue, valueTimestampConfig);
        
        // Create modified data with new timestamp
        const modifiedData = { ...data, [fieldPath]: String(newValue) };
        
        // Rebuild value based on how it was originally built
        if (msg.key !== undefined || msg.value !== undefined) {
          // Check if original value was a CSV string (contains commas)
          const originalValueStr = typeof msg.value === 'string' ? msg.value : '';
          if (originalValueStr.includes(',') && !originalValueStr.startsWith('{')) {
            // Rebuild as CSV row using original column order from Object.keys
            value = rebuildCsvRow(modifiedData, Object.keys(data));
          } else {
            // Original value was JSON object
            value = JSON.stringify(modifiedData);
          }
        } else if (mapping.valueColumn) {
          value = modifiedData[mapping.valueColumn] || '';
        } else {
          // If no value column specified, rebuild as CSV row
          value = rebuildCsvRow(modifiedData, Object.keys(data));
        }
      }
    }
  }

  return { key, value };
}

describe('JSONL File Timestamp Modification', () => {
  // 读取真实数据文件的第一行
  const sampleJsonlLine = '{"key": "138", "value": "C14,2026-04-01 15:49:53.207,00,00,0,010232,3,00,00,0,010232,3,00,00,0,010232,3,00,00,0,010232,3,00,00,0,010232,3,0120,0009,303032,1D,0E,31,32,1425,2425,3425,4425,5426,6426,7426,8426,1,1,1,887.88"}';
  
  const parsedMsg = JSON.parse(sampleJsonlLine);
  const csvValue = parsedMsg.value;
  const csvParts = csvValue.split(',');

  it('should parse the sample JSONL correctly', () => {
    expect(parsedMsg.key).toBe('138');
    expect(csvParts[0]).toBe('C14');
    expect(csvParts[1]).toBe('2026-04-01 15:49:53.207');
  });

  it('should modify timestamp using csv_column_1 path with current time mode', () => {
    // 模拟 ValueTimestampMapper 检测到的字段路径
    const config: ValueTimestampConfig = {
      enabled: true,
      fieldPath: 'csv_column_1',  // 第二列（索引1）是时间戳
      format: 'iso8601_space',
      mode: 'current',
    };

    const mapping: ColumnMappingType = {
      keyColumn: '',
      valueColumn: '',
      headerColumn: '',
      partitionColumn: '',
      useFilePartition: false,
    };

    // 构建 ParsedMessage，模拟从 JSONL 解析的格式
    const msg: ParsedMessage = {
      key: parsedMsg.key,
      value: parsedMsg.value,
      _raw: { _line: parsedMsg.value },  // 保存原始 CSV 行
    };

    const result = buildRecordWithTimestampModification(msg, mapping, config);

    // 验证结果
    expect(result.key).toBe('138');
    
    // 解析修改后的 value
    const modifiedParts = result.value.split(',');
    expect(modifiedParts[0]).toBe('C14'); // 第一列不变
    
    // 验证时间戳被修改（应该是当前时间）
    const modifiedTimestamp = modifiedParts[1];
    const modifiedDate = new Date(modifiedTimestamp.replace(' ', 'T'));
    
    // 应该是有效的时间戳
    expect(isNaN(modifiedDate.getTime())).toBe(false);
    
    // 应该接近当前时间（5秒内）
    const now = Date.now();
    expect(Math.abs(modifiedDate.getTime() - now)).toBeLessThan(5000);
    
    // 其他列应该保持不变
    expect(modifiedParts[2]).toBe('00');
    expect(modifiedParts[3]).toBe('00');
    expect(modifiedParts[4]).toBe('0');
    expect(modifiedParts[5]).toBe('010232');
  });

  it('should keep original timestamp when mode is file', () => {
    const config: ValueTimestampConfig = {
      enabled: true,
      fieldPath: 'csv_column_1',
      format: 'iso8601_space',
      mode: 'file',
    };

    const mapping: ColumnMappingType = {
      keyColumn: '',
      valueColumn: '',
      headerColumn: '',
      partitionColumn: '',
      useFilePartition: false,
    };

    const msg: ParsedMessage = {
      key: parsedMsg.key,
      value: parsedMsg.value,
      _raw: { _line: parsedMsg.value },
    };

    const result = buildRecordWithTimestampModification(msg, mapping, config);

    // 时间戳应该保持不变
    const modifiedParts = result.value.split(',');
    expect(modifiedParts[1]).toBe('2026-04-01 15:49:53.207');
  });

  it('should apply offset when mode is offset', () => {
    const config: ValueTimestampConfig = {
      enabled: true,
      fieldPath: 'csv_column_1',
      format: 'iso8601_space',
      mode: 'offset',
      offsetMs: 3600000, // +1小时
    };

    const mapping: ColumnMappingType = {
      keyColumn: '',
      valueColumn: '',
      headerColumn: '',
      partitionColumn: '',
      useFilePartition: false,
    };

    const msg: ParsedMessage = {
      key: parsedMsg.key,
      value: parsedMsg.value,
      _raw: { _line: parsedMsg.value },
    };

    const result = buildRecordWithTimestampModification(msg, mapping, config);

    // 验证时间戳增加了1小时
    const modifiedParts = result.value.split(',');
    expect(modifiedParts[1]).toBe('2026-04-01 16:49:53.207');
  });

  it('should handle valueColumn mapping correctly', () => {
    // 模拟设置了 valueColumn 的情况
    const config: ValueTimestampConfig = {
      enabled: true,
      fieldPath: 'csv_column_1',
      format: 'iso8601_space',
      mode: 'current',
    };

    const mapping: ColumnMappingType = {
      keyColumn: '',
      valueColumn: 'csv_column_2', // 假设 valueColumn 指向第三列
      headerColumn: '',
      partitionColumn: '',
      useFilePartition: false,
    };

    // 创建 _raw 对象来模拟 CSV 列映射
    const msg: ParsedMessage = {
      key: parsedMsg.key,
      value: '00', // 这是第三列的值
      _raw: {
        _line: parsedMsg.value,
        csv_column_0: 'C14',
        csv_column_1: '2026-04-01 15:49:53.207',
        csv_column_2: '00',
        csv_column_3: '00',
        csv_column_4: '0',
      },
    };

    const result = buildRecordWithTimestampModification(msg, mapping, config);

    // 由于 valueColumn 是 csv_column_2，value 应该是修改后的第三列
    expect(result.value).toBe('00'); // 第三列是 "00"
  });

  // 集成测试：使用真实的文件内容
  describe('Integration test with real JSONL content', () => {
    it('should parse JSONL and preserve _line for timestamp modification', async () => {
      // 创建一个模拟的 JSONL 文件内容
      const jsonlContent = [
        '{"key": "138", "value": "C14,2026-04-01 15:49:53.207,00,00,0,010232"}',
        '{"key": "138", "value": "C14,2026-04-01 15:49:53.407,00,00,0,010232"}',
        '{"key": "138", "value": "C14,2026-04-01 15:49:53.607,00,00,0,010232"}',
      ].join('\n');

      // 创建 File 对象
      const file = new File([jsonlContent], 'test.jsonl', { type: 'application/json' });

      // 读取预览
      const preview = await readFilePreview(file, 'jsonl');
      
      expect(preview.messages.length).toBe(3);
      
      // 验证每条消息都保留了原始行
      for (const msg of preview.messages) {
        expect(msg._raw).toBeDefined();
        expect(msg._raw?._line).toBeDefined();
        
        // 验证 msg.value 是 CSV 格式（不是 JSON）
        expect(msg.value).toContain('C14');
        expect(msg.value).toContain(',');
        expect((msg.value as string).startsWith('{')).toBe(false);
        
        // 验证可以直接使用 msg.value 作为 CSV 行
        const csvParts = (msg.value as string).split(',');
        expect(csvParts[0]).toBe('C14');
        expect(csvParts[1]).toMatch(/^2026-04-01/); // 时间戳格式
        
        // 验证 _line 是原始 JSON 行
        const parsed = JSON.parse(msg._raw?._line as string);
        expect(parsed.key).toBe('138');
      }
    });

    it('should modify timestamp in real JSONL file content', async () => {
      const jsonlContent = '{"key": "138", "value": "C14,2026-04-01 15:49:53.207,00,00,0,010232"}';
      const file = new File([jsonlContent], 'test.jsonl', { type: 'application/json' });

      const preview = await readFilePreview(file, 'jsonl');
      expect(preview.messages.length).toBe(1);

      const msg = preview.messages[0];
      
      // 验证消息结构
      expect(msg.key).toBe('138');
      expect(msg.value).toBe('C14,2026-04-01 15:49:53.207,00,00,0,010232');
      expect(msg._raw?._line).toBe(jsonlContent);

      // 模拟时间戳修改 - 注意：我们需要使用 msg.value 作为 CSV 行，而不是 _line
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'csv_column_1',
        format: 'iso8601_space',
        mode: 'current',
      };

      const mapping: ColumnMappingType = {
        keyColumn: '',
        valueColumn: '',
        headerColumn: '',
        partitionColumn: '',
        useFilePartition: false,
      };

      // 直接使用 msg.value（CSV 格式）而不是 _line（JSON 格式）
      const csvLine = msg.value as string;
      const parts = csvLine.split(',');
      const columnIndex = 1; // csv_column_1
      const newTimestamp = calculateNewTimestampValue(parts[columnIndex].trim(), config);
      parts[columnIndex] = String(newTimestamp);
      const modifiedValue = parts.join(',');

      // 验证时间戳被修改
      const modifiedParts = modifiedValue.split(',');
      expect(modifiedParts[0]).toBe('C14');
      
      const modifiedTimestamp = modifiedParts[1];
      const modifiedDate = new Date(modifiedTimestamp.replace(' ', 'T'));
      
      // 应该是当前时间（5秒内）
      expect(Math.abs(modifiedDate.getTime() - Date.now())).toBeLessThan(5000);
      
      // 其他列应该保持不变
      expect(modifiedParts[2]).toBe('00');
      expect(modifiedParts[3]).toBe('00');
      expect(modifiedParts[4]).toBe('0');
      expect(modifiedParts[5]).toBe('010232');
    });
  });
});
