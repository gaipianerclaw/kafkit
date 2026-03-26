// Protobuf 消息解析工具

export interface ProtobufField {
  name: string;
  number: number;
  type: string;
  repeated?: boolean;
  optional?: boolean;
}

export interface ProtobufMessage {
  name: string;
  fields: ProtobufField[];
}

// 简单 Protobuf 解析器
export class ProtobufParser {
  private schema: ProtobufMessage | null = null;

  constructor(schemaText?: string) {
    if (schemaText) {
      this.schema = this.parseSchema(schemaText);
    }
  }

  // 解析 .proto 文件内容
  private parseSchema(schemaText: string): ProtobufMessage | null {
    try {
      // 简化解析 - 提取 message 定义
      const messageMatch = schemaText.match(/message\s+(\w+)\s*\{([^}]+)\}/);
      if (!messageMatch) return null;

      const messageName = messageMatch[1];
      const fieldsText = messageMatch[2];

      const fields: ProtobufField[] = [];
      const fieldRegex = /(?:repeated\s+)?(?:optional\s+)?(\w+)\s+(\w+)\s*=\s*(\d+)/g;
      let match;

      while ((match = fieldRegex.exec(fieldsText)) !== null) {
        fields.push({
          type: match[1],
          name: match[2],
          number: parseInt(match[3]),
          repeated: fieldsText.substring(match.index, match.index + 9) === 'repeated ',
          optional: fieldsText.substring(match.index, match.index + 9) === 'optional ',
        });
      }

      return { name: messageName, fields };
    } catch (e) {
      console.error('[ProtobufParser] Failed to parse schema:', e);
      return null;
    }
  }

  // 尝试解析 Protobuf JSON 格式
  static tryParseJson(jsonStr: string): unknown | null {
    try {
      const parsed = JSON.parse(jsonStr);
      // Protobuf JSON 通常有 @type 字段
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (obj['@type'] || obj['__protobuf_schema']) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // 格式化数据
  formatData(data: unknown): string {
    if (!data) return 'null';
    return JSON.stringify(data, null, 2);
  }

  // 获取字段列表
  getFields(): ProtobufField[] {
    return this.schema?.fields || [];
  }

  // 解码 base64 编码的 protobuf 数据
  static decodeBase64(base64Str: string): Uint8Array {
    try {
      const binaryString = atob(base64Str);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error('[ProtobufParser] Failed to decode base64:', e);
      return new Uint8Array();
    }
  }
}

// Protobuf 格式检测
export function detectProtobufFormat(data: string | Uint8Array): 'json' | 'binary' | 'unknown' {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        // Protobuf JSON 特征
        if (obj['@type'] || obj['__protobuf_schema'] || obj['protoPayload']) {
          return 'json';
        }
      }
    } catch {
      // 尝试 base64 解码
      try {
        const decoded = atob(data);
        // 如果能解码且看起来是二进制数据
        if (decoded.length > 0 && /[^\x20-\x7E]/.test(decoded)) {
          return 'binary';
        }
      } catch {
        // 不是 base64
      }
    }
  } else if (data instanceof Uint8Array) {
    // 检查是否有 protobuf 特征（如字段标签）
    if (data.length > 0 && (data[0] & 0x07) <= 5) {
      return 'binary';
    }
  }
  return 'unknown';
}

// 解析 Protobuf 字段（简化版）
export function parseProtobufFields(data: Uint8Array): Array<{ field: number; type: string; value: unknown }> {
  const fields: Array<{ field: number; type: string; value: unknown }> = [];
  let offset = 0;

  while (offset < data.length) {
    // 读取 tag (field number + wire type)
    let tag = 0;
    let shift = 0;
    while (offset < data.length) {
      const byte = data[offset++];
      tag |= (byte & 0x7F) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }

    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;

    // 根据 wire type 解析值
    let value: unknown;
    let type: string;

    switch (wireType) {
      case 0: // Varint
        let varint = 0;
        shift = 0;
        while (offset < data.length) {
          const byte = data[offset++];
          varint |= (byte & 0x7F) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        value = varint;
        type = 'varint';
        break;

      case 2: // Length-delimited
        let length = 0;
        shift = 0;
        while (offset < data.length) {
          const byte = data[offset++];
          length |= (byte & 0x7F) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const bytes = data.slice(offset, offset + length);
        // 尝试解析为字符串
        try {
          value = new TextDecoder().decode(bytes);
          type = 'string';
        } catch {
          value = bytes;
          type = 'bytes';
        }
        offset += length;
        break;

      case 1: // 64-bit
        value = data.slice(offset, offset + 8);
        type = 'fixed64';
        offset += 8;
        break;

      case 5: // 32-bit
        value = data.slice(offset, offset + 4);
        type = 'fixed32';
        offset += 4;
        break;

      default:
        value = null;
        type = 'unknown';
        break;
    }

    fields.push({ field: fieldNumber, type, value });
  }

  return fields;
}
