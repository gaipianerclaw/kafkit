import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaRegistryService, SchemaRegistryConfig } from '../services/schemaRegistry';

// Mock fetch
global.fetch = vi.fn();

describe('SchemaRegistryService', () => {
  const mockConfig: SchemaRegistryConfig = {
    url: 'http://localhost:8081',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic operations', () => {
    it('should create service with config', () => {
      const service = new SchemaRegistryService(mockConfig);
      expect(service).toBeDefined();
    });

    it('should list subjects successfully', async () => {
      const mockSubjects = ['user-value', 'order-value', 'product-value'];
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSubjects),
      });

      const service = new SchemaRegistryService(mockConfig);
      const subjects = await service.listSubjects();

      expect(subjects).toEqual(mockSubjects);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8081/subjects',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.schemaregistry.v1+json',
          }),
        })
      );
    });

    it('should get schema by subject and version', async () => {
      const mockSchema = {
        subject: 'user-value',
        version: 1,
        id: 1,
        schema: '{"type":"record","name":"User","fields":[]}',
        schemaType: 'AVRO',
      };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const service = new SchemaRegistryService(mockConfig);
      const schema = await service.getSchema('user-value', 1);

      expect(schema).toEqual({
        id: '1',
        subject: 'user-value',
        version: 1,
        schema: mockSchema.schema,
        type: 'AVRO',
      });
    });

    it('should get latest schema when version is "latest"', async () => {
      const mockSchema = {
        subject: 'user-value',
        version: 3,
        id: 3,
        schema: '{"type":"record","name":"User","fields":[]}',
        schemaType: 'AVRO',
      };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const service = new SchemaRegistryService(mockConfig);
      const schema = await service.getSchema('user-value', 'latest');

      expect(schema.version).toBe(3);
    });

    it('should handle Protobuf schema type', async () => {
      const mockSchema = {
        subject: 'order-value',
        version: 1,
        id: 10,
        schema: 'syntax = "proto3"; message Order {}',
        schemaType: 'PROTOBUF',
      };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const service = new SchemaRegistryService(mockConfig);
      const schema = await service.getSchema('order-value', 1);

      expect(schema.type).toBe('PROTOBUF');
    });

    it('should handle JSON schema type', async () => {
      const mockSchema = {
        subject: 'config-value',
        version: 1,
        id: 20,
        schema: '{"type":"object","properties":{}}',
        schemaType: 'JSON',
      };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const service = new SchemaRegistryService(mockConfig);
      const schema = await service.getSchema('config-value', 1);

      expect(schema.type).toBe('JSON');
    });

    it('should default to AVRO when schemaType is not specified', async () => {
      const mockSchema = {
        subject: 'legacy-value',
        version: 1,
        id: 30,
        schema: '{"type":"record","name":"Legacy","fields":[]}',
        // schemaType not specified (old Schema Registry format)
      };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const service = new SchemaRegistryService(mockConfig);
      const schema = await service.getSchema('legacy-value', 1);

      expect(schema.type).toBe('AVRO');
    });
  });

  describe('authentication', () => {
    it('should include Basic Auth header when credentials provided', async () => {
      const authConfig: SchemaRegistryConfig = {
        url: 'http://localhost:8081',
        auth: {
          type: 'basic',
          username: 'admin',
          password: 'secret',
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const service = new SchemaRegistryService(authConfig);
      await service.listSubjects();

      const expectedCredentials = btoa('admin:secret');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedCredentials}`,
          }),
        })
      );
    });

    it('should include Bearer token when provided', async () => {
      const authConfig: SchemaRegistryConfig = {
        url: 'http://localhost:8081',
        auth: {
          type: 'bearer',
          token: 'my-api-token',
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const service = new SchemaRegistryService(authConfig);
      await service.listSubjects();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-api-token',
          }),
        })
      );
    });

    it('should not include auth header when no auth provided', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const service = new SchemaRegistryService(mockConfig);
      await service.listSubjects();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers).not.toHaveProperty('Authorization');
    });
  });

  describe('error handling', () => {
    it('should throw error when request fails', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const service = new SchemaRegistryService(mockConfig);
      await expect(service.listSubjects()).rejects.toThrow('Schema Registry error: 404 Not Found');
    });

    it('should return null when getSchemaById fails', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const service = new SchemaRegistryService(mockConfig);
      const schema = await service.getSchemaById(999);

      expect(schema).toBeNull();
    });
  });

  describe('test connection', () => {
    it('should return true when connection succeeds', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const service = new SchemaRegistryService(mockConfig);
      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const service = new SchemaRegistryService(mockConfig);
      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('register and delete', () => {
    it('should register a new schema', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 42 }),
      });

      const service = new SchemaRegistryService(mockConfig);
      const schemaId = await service.registerSchema(
        'new-topic-value',
        '{"type":"record","name":"NewTopic","fields":[]}',
        'AVRO'
      );

      expect(schemaId).toBe(42);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8081/subjects/new-topic-value/versions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            schema: '{"type":"record","name":"NewTopic","fields":[]}',
            schemaType: 'AVRO',
          }),
        })
      );
    });

    it('should delete a schema by version', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1]),
      });

      const service = new SchemaRegistryService(mockConfig);
      await service.deleteSchema('topic-value', 1);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8081/subjects/topic-value/versions/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should delete all versions of a schema', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1, 2, 3]),
      });

      const service = new SchemaRegistryService(mockConfig);
      await service.deleteSchema('topic-value', 'all');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8081/subjects/topic-value',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw error when register fails', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
      });

      const service = new SchemaRegistryService(mockConfig);
      await expect(service.registerSchema('topic', '{}', 'AVRO')).rejects.toThrow(
        'Failed to register schema: 409 Conflict'
      );
    });
  });

  describe('get versions', () => {
    it('should get all versions for a subject', async () => {
      const mockVersions = [1, 2, 3];
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersions),
      });

      const service = new SchemaRegistryService(mockConfig);
      const versions = await service.getVersions('user-value');

      expect(versions).toEqual(mockVersions);
    });
  });

  describe('parse methods', () => {
    it('should parse Avro message placeholder', () => {
      const service = new SchemaRegistryService(mockConfig);
      const mockSchema = {
        id: '1',
        subject: 'user-value',
        version: 1,
        schema: '{}',
        type: 'AVRO' as const,
      };
      const result = service.parseAvroMessage(new Uint8Array([1, 2, 3]), mockSchema);

      expect(result).toHaveProperty('schemaId', '1');
      expect(result).toHaveProperty('schemaSubject', 'user-value');
      expect(result).toHaveProperty('rawMessage');
    });

    it('should parse Protobuf message placeholder', () => {
      const service = new SchemaRegistryService(mockConfig);
      const mockSchema = {
        id: '2',
        subject: 'order-value',
        version: 1,
        schema: 'syntax = "proto3";',
        type: 'PROTOBUF' as const,
      };
      const result = service.parseProtobufMessage(new Uint8Array([1, 2, 3]), mockSchema, 'Order');

      expect(result).toHaveProperty('schemaId', '2');
      expect(result).toHaveProperty('messageType', 'Order');
      expect(result).toHaveProperty('rawMessage');
    });
  });

  describe('listSchemas', () => {
    it('should list all schemas with latest version', async () => {
      const mockSubjects = ['user-value', 'order-value'];
      const mockSchema1 = {
        subject: 'user-value',
        version: 3,
        id: 1,
        schema: '{}',
        schemaType: 'AVRO',
      };
      const mockSchema2 = {
        subject: 'order-value',
        version: 2,
        id: 2,
        schema: '{}',
        schemaType: 'PROTOBUF',
      };

      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubjects),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSchema1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSchema2),
        });

      const service = new SchemaRegistryService(mockConfig);
      const schemas = await service.listSchemas();

      expect(schemas).toHaveLength(2);
      expect(schemas[0].subject).toBe('user-value');
      expect(schemas[1].subject).toBe('order-value');
    });

    it('should handle errors for individual subjects', async () => {
      const mockSubjects = ['user-value', 'order-value'];

      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubjects),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            subject: 'user-value',
            version: 1,
            id: 1,
            schema: '{}',
            schemaType: 'AVRO',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

      const service = new SchemaRegistryService(mockConfig);
      const schemas = await service.listSchemas();

      // Should return only the successfully fetched schema
      expect(schemas).toHaveLength(1);
      expect(schemas[0].subject).toBe('user-value');
    });
  });
});
