// Avro 消息解析工具

export interface AvroSchema {
  type: string;
  name?: string;
  namespace?: string;
  fields?: AvroField[];
  items?: AvroSchema;
  values?: AvroSchema;
}

interface AvroField {
  name: string;
  type: AvroType;
  default?: unknown;
}

type AvroType = string | AvroSchema | (string | AvroSchema)[];

// 简单 Avro 解析器（基于 JSON）
export class AvroParser {
  private schema: AvroSchema | null = null;

  constructor(schemaJson?: string) {
    if (schemaJson) {
      try {
        this.schema = JSON.parse(schemaJson);
      } catch (e) {
        console.error('[AvroParser] Invalid schema:', e);
      }
    }
  }

  // 检测是否为 Avro 二进制数据
  static isAvroBinary(data: Uint8Array): boolean {
    // Avro 魔数: 0x4F 0x62 0x6A 0x01 (Obj\x01)
    return data.length >= 4 && 
           data[0] === 0x4F && 
           data[1] === 0x62 && 
           data[2] === 0x6A && 
           data[3] === 0x01;
  }

  // 尝试解析 Avro JSON 格式
  static tryParseJson(jsonStr: string): unknown | null {
    try {
      const parsed = JSON.parse(jsonStr);
      // 检查是否有 Avro 特征字段
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        // Avro 记录通常有特定字段
        if (obj['__avro_schema'] || obj['__schema_id']) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // 格式化 Avro 数据
  formatData(data: unknown): string {
    if (!data) return 'null';
    
    // 格式化输出
    return JSON.stringify(data, null, 2);
  }

  // 获取字段列表
  getFields(): string[] {
    if (!this.schema?.fields) return [];
    return this.schema.fields.map(f => f.name);
  }

  // 验证数据是否符合 schema
  validate(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.schema) {
      return { valid: false, errors: ['No schema provided'] };
    }

    // 简化验证 - 实际应该递归验证
    if (this.schema.type === 'record' && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      for (const field of this.schema.fields || []) {
        if (!(field.name in obj) && field.default === undefined) {
          errors.push(`Missing required field: ${field.name}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Avro 格式检测
export function detectAvroFormat(data: string | Uint8Array): 'json' | 'binary' | 'unknown' {
  if (typeof data === 'string') {
    // 尝试 JSON 解析
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        // 检查 Avro 特征
        if (obj['schema'] || obj['payload'] || obj['__avro_schema']) {
          return 'json';
        }
      }
    } catch {
      // 不是 JSON
    }
  } else if (data instanceof Uint8Array) {
    if (AvroParser.isAvroBinary(data)) {
      return 'binary';
    }
  }
  return 'unknown';
}
