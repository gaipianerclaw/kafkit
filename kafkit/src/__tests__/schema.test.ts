import { describe, it, expect } from 'vitest';
import { detectAvroFormat, AvroParser } from '../utils/schema/avro';
import { detectProtobufFormat, ProtobufParser, parseProtobufFields } from '../utils/schema/protobuf';

describe('Schema Utils', () => {
  describe('Avro', () => {
    describe('detectAvroFormat', () => {
      it('should detect Avro JSON with __avro_schema', () => {
        const data = JSON.stringify({ __avro_schema: 'user.v1', name: 'John' });
        expect(detectAvroFormat(data)).toBe('json');
      });

      it('should detect Avro JSON with schema field', () => {
        const data = JSON.stringify({ schema: 'user.v1', payload: {} });
        expect(detectAvroFormat(data)).toBe('json');
      });

      it('should return unknown for regular JSON', () => {
        const data = JSON.stringify({ name: 'John', age: 30 });
        expect(detectAvroFormat(data)).toBe('unknown');
      });

      it('should return unknown for non-JSON string', () => {
        expect(detectAvroFormat('plain text')).toBe('unknown');
      });
    });

    describe('AvroParser', () => {
      it('should try parse Avro JSON', () => {
        const data = JSON.stringify({ __avro_schema: 'user.v1', name: 'John' });
        const result = AvroParser.tryParseJson(data);
        expect(result).not.toBeNull();
        expect((result as any).__avro_schema).toBe('user.v1');
      });

      it('should return null for non-Avro JSON', () => {
        const data = JSON.stringify({ name: 'John' });
        const result = AvroParser.tryParseJson(data);
        expect(result).toBeNull();
      });

      it('should format data correctly', () => {
        const parser = new AvroParser();
        const data = { name: 'John', age: 30 };
        const formatted = parser.formatData(data);
        expect(formatted).toContain('"name": "John"');
        expect(formatted).toContain('"age": 30');
      });
    });
  });

  describe('Protobuf', () => {
    describe('detectProtobufFormat', () => {
      it('should detect Protobuf JSON with @type', () => {
        const data = JSON.stringify({ '@type': 'Order', orderId: '123' });
        expect(detectProtobufFormat(data)).toBe('json');
      });

      it('should detect Protobuf JSON with __protobuf_schema', () => {
        const data = JSON.stringify({ __protobuf_schema: 'product.proto', id: 'P001' });
        expect(detectProtobufFormat(data)).toBe('json');
      });

      it('should return unknown for regular JSON', () => {
        const data = JSON.stringify({ name: 'John', age: 30 });
        expect(detectProtobufFormat(data)).toBe('unknown');
      });
    });

    describe('ProtobufParser', () => {
      it('should try parse Protobuf JSON', () => {
        const data = JSON.stringify({ '@type': 'Order', orderId: '123' });
        const result = ProtobufParser.tryParseJson(data);
        expect(result).not.toBeNull();
        expect((result as any)['@type']).toBe('Order');
      });

      it('should decode base64 correctly', () => {
        const text = 'Hello World';
        const base64 = btoa(text);
        const decoded = ProtobufParser.decodeBase64(base64);
        const decodedText = new TextDecoder().decode(decoded);
        expect(decodedText).toBe(text);
      });

      it('should parse schema correctly', () => {
        const schema = `
          message User {
            string name = 1;
            int32 age = 2;
          }
        `;
        const parser = new ProtobufParser(schema);
        const fields = parser.getFields();
        expect(fields).toHaveLength(2);
        expect(fields[0].name).toBe('name');
        expect(fields[1].name).toBe('age');
      });
    });

    describe('parseProtobufFields', () => {
      it('should parse varint field', () => {
        // Field 1, wire type 0 (varint), value 150
        const data = new Uint8Array([0x08, 0x96, 0x01]);
        const fields = parseProtobufFields(data);
        expect(fields).toHaveLength(1);
        expect(fields[0].field).toBe(1);
        expect(fields[0].type).toBe('varint');
        expect(fields[0].value).toBe(150);
      });

      it('should parse string field', () => {
        // Field 2, wire type 2 (length-delimited), length 5, "hello"
        const data = new Uint8Array([0x12, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f]);
        const fields = parseProtobufFields(data);
        expect(fields).toHaveLength(1);
        expect(fields[0].field).toBe(2);
        expect(fields[0].type).toBe('string');
        expect(fields[0].value).toBe('hello');
      });
    });
  });
});
