/**
 * Schema Registry Service
 * 
 * Manages Avro/Protobuf/JSON schemas with caching and local storage persistence.
 * Compatible with Confluent Schema Registry API.
 */

export type SchemaType = 'AVRO' | 'PROTOBUF' | 'JSON';

export interface SchemaRegistryConfig {
  url: string;
  auth?: {
    type: 'basic' | 'bearer';
    username?: string;
    password?: string;
    token?: string;
  };
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

export interface StoredSchema {
  id: string;
  subject: string;
  version: number;
  schema: string;
  type: SchemaType;
}

interface SchemaCacheEntry {
  schema: StoredSchema;
  timestamp: number;
}

/**
 * LRU Cache implementation for schemas
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Schema Registry Service
 */
export class SchemaRegistryService {
  private config: SchemaRegistryConfig;
  private cache: LRUCache<string, SchemaCacheEntry>;
  private requestCache: Map<string, Promise<unknown>>;
  private readonly CACHE_KEY = 'kafkit-schema-cache';
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: SchemaRegistryConfig) {
    this.config = {
      cacheEnabled: true,
      cacheTtl: this.DEFAULT_CACHE_TTL,
      ...config
    };
    this.cache = new LRUCache(100);
    this.requestCache = new Map();
    this.loadCacheFromStorage();
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.schemaregistry.v1+json',
      'Content-Type': 'application/vnd.schemaregistry.v1+json'
    };

    if (this.config.auth) {
      if (this.config.auth.type === 'basic' && this.config.auth.username) {
        const credentials = btoa(`${this.config.auth.username}:${this.config.auth.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (this.config.auth.type === 'bearer' && this.config.auth.token) {
        headers['Authorization'] = `Bearer ${this.config.auth.token}`;
      }
    }

    return headers;
  }

  /**
   * Make API request to Schema Registry
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.config.url.replace(/\/$/, '')}${endpoint}`;
    const cacheKey = `req:${url}`;

    // Deduplicate concurrent requests
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey) as Promise<T>;
    }

    const promise = fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    }).then(async response => {
      if (!response.ok) {
        throw new Error(`Schema Registry error: ${response.status} ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    }).finally(() => {
      this.requestCache.delete(cacheKey);
    });

    this.requestCache.set(cacheKey, promise);
    return promise;
  }

  /**
   * List all subjects
   */
  async listSubjects(): Promise<string[]> {
    return this.request<string[]>('/subjects');
  }

  /**
   * Get versions for a subject
   */
  async getVersions(subject: string): Promise<number[]> {
    return this.request<number[]>(`/subjects/${encodeURIComponent(subject)}/versions`);
  }

  /**
   * Get schema by subject and version
   */
  async getSchema(subject: string, version: number | 'latest' = 'latest'): Promise<StoredSchema> {
    const cacheKey = `${subject}:${version}`;
    
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.config.cacheTtl || this.DEFAULT_CACHE_TTL)) {
        return cached.schema;
      }
    }

    const response = await this.request<{
      subject: string;
      version: number;
      id: number;
      schema: string;
      schemaType?: string;
    }>(`/subjects/${encodeURIComponent(subject)}/versions/${version}`);

    const schema: StoredSchema = {
      id: String(response.id),
      subject: response.subject,
      version: response.version,
      schema: response.schema,
      type: (response.schemaType?.toUpperCase() as SchemaType) || 'AVRO'
    };

    // Update cache
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, { schema, timestamp: Date.now() });
      this.saveCacheToStorage();
    }

    return schema;
  }

  /**
   * Get schema by ID (used for message decoding)
   */
  async getSchemaById(schemaId: number): Promise<StoredSchema | null> {
    const cacheKey = `id:${schemaId}`;
    
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.config.cacheTtl || this.DEFAULT_CACHE_TTL)) {
        return cached.schema;
      }
    }

    try {
      const response = await this.request<{
        schema: string;
        schemaType?: string;
      }>(`/schemas/ids/${schemaId}`);

      // Get subject info
      const subjects = await this.listSubjects();
      let subject = 'unknown';
      let version = 1;

      // Try to find subject by checking versions
      for (const sub of subjects) {
        try {
          const versions = await this.getVersions(sub);
          for (const ver of versions) {
            const verSchema = await this.request<{ id: number }>(
              `/subjects/${encodeURIComponent(sub)}/versions/${ver}`
            );
            if (verSchema.id === schemaId) {
              subject = sub;
              version = ver;
              break;
            }
          }
        } catch {
          // Continue to next subject
        }
      }

      const schema: StoredSchema = {
        id: String(schemaId),
        subject,
        version,
        schema: response.schema,
        type: (response.schemaType?.toUpperCase() as SchemaType) || 'AVRO'
      };

      // Update cache
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, { schema, timestamp: Date.now() });
        this.saveCacheToStorage();
      }

      return schema;
    } catch (err) {
      console.error('Failed to fetch schema by ID:', err);
      return null;
    }
  }

  /**
   * List all schemas
   */
  async listSchemas(): Promise<StoredSchema[]> {
    const subjects = await this.listSubjects();
    const schemas: StoredSchema[] = [];

    for (const subject of subjects) {
      try {
        const schema = await this.getSchema(subject, 'latest');
        schemas.push(schema);
      } catch (err) {
        console.error(`Failed to get schema for ${subject}:`, err);
      }
    }

    return schemas;
  }

  /**
   * Register a new schema
   */
  async registerSchema(subject: string, schema: string, schemaType: SchemaType = 'AVRO'): Promise<number> {
    const url = `${this.config.url.replace(/\/$/, '')}/subjects/${encodeURIComponent(subject)}/versions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        schema,
        schemaType
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to register schema: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { id: number };
    return result.id;
  }

  /**
   * Delete a schema
   */
  async deleteSchema(subject: string, version?: 'all' | number): Promise<void> {
    let endpoint: string;
    
    if (version === 'all') {
      endpoint = `/subjects/${encodeURIComponent(subject)}`;
    } else if (typeof version === 'number') {
      endpoint = `/subjects/${encodeURIComponent(subject)}/versions/${version}`;
    } else {
      endpoint = `/subjects/${encodeURIComponent(subject)}`;
    }

    const url = `${this.config.url.replace(/\/$/, '')}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete schema: ${response.status} ${response.statusText}`);
    }

    // Clear cache for this subject
    if (this.config.cacheEnabled) {
      this.clearSubjectCache(subject);
    }
  }

  /**
   * Test connection to Schema Registry
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/subjects');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse Avro message using schema (placeholder for future implementation)
   */
  parseAvroMessage(message: Uint8Array, schema: StoredSchema): unknown {
    // TODO: Implement Avro binary decoding
    // For now, just return the raw message info
    return {
      schemaId: schema.id,
      schemaSubject: schema.subject,
      schemaVersion: schema.version,
      rawMessage: Array.from(message)
    };
  }

  /**
   * Parse Protobuf message using schema (placeholder for future implementation)
   */
  parseProtobufMessage(message: Uint8Array, schema: StoredSchema, messageType: string): unknown {
    // TODO: Implement Protobuf binary decoding
    // For now, just return the raw message info
    return {
      schemaId: schema.id,
      schemaSubject: schema.subject,
      schemaVersion: schema.version,
      messageType,
      rawMessage: Array.from(message)
    };
  }

  /**
   * Clear cache for a subject
   */
  private clearSubjectCache(_subject: string): void {
    // This is a simplified implementation
    // In a real implementation, we'd need to track which cache keys belong to which subject
    this.cache.clear();
    this.saveCacheToStorage();
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.CACHE_KEY);
      if (saved) {
        const entries = JSON.parse(saved) as Array<[string, SchemaCacheEntry]>;
        const now = Date.now();
        const ttl = this.config.cacheTtl || this.DEFAULT_CACHE_TTL;
        
        for (const [key, entry] of entries) {
          // Only load non-expired entries
          if (now - entry.timestamp < ttl) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load schema cache:', err);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const entries = Array.from(this.cache as unknown as Map<string, SchemaCacheEntry>);
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.error('Failed to save schema cache:', err);
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY);
    }
  }
}

export default SchemaRegistryService;
