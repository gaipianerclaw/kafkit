/**
 * Script Engine Service - QuickJS Integration
 * 
 * Provides secure JavaScript execution environment for message generation
 * Uses local WASM files for offline support
 */

import { newQuickJSWASMModule, RELEASE_SYNC } from 'quickjs-emscripten';
import type { QuickJSWASMModule, QuickJSRuntime, QuickJSContext } from 'quickjs-emscripten-core';
import type { ScriptContext, ScriptMessage } from '../../types/script';
import { v4 as uuidv4 } from 'uuid';

export class ScriptEngine {
  private module: QuickJSWASMModule | null = null;
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private isInitialized = false;

  /**
   * Initialize the QuickJS engine with local WASM
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Use RELEASE_SYNC variant with local WASM (no CDN)
      this.module = await newQuickJSWASMModule(RELEASE_SYNC);
      this.runtime = this.module.newRuntime();
      
      // Set resource limits
      this.runtime.setMemoryLimit(1024 * 1024); // 1MB
      this.runtime.setMaxStackSize(1024 * 512);  // 512KB stack
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize QuickJS:', error);
      throw new Error('Script engine initialization failed');
    }
  }

  /**
   * Execute a message generation script
   */
  async executeScript(
    script: string,
    context: ScriptContext
  ): Promise<ScriptMessage | ScriptMessage[]> {
    if (!this.isInitialized || !this.runtime) {
      throw new Error('Script engine not initialized');
    }

    // Create a fresh context for each execution
    this.context = this.runtime.newContext();
    
    try {
      // Setup sandbox
      this.setupSandbox();
      
      // Inject ctx object
      this.injectContext(context);
      
      // Wrap and execute script
      const wrappedScript = `
        ${script}
        ;
        if (typeof generate !== 'function') {
          throw new Error('generate function not found');
        }
        generate(ctx);
      `;
      
      const result = this.context.evalCode(wrappedScript);
      
      if (result.error) {
        const errorMsg = this.context.getString(result.error);
        result.error.dispose();
        throw new Error(errorMsg);
      }
      
      // Convert result to JS object
      const jsResult = this.toJSObject(result.value);
      result.value.dispose();
      
      return jsResult as ScriptMessage | ScriptMessage[];
    } finally {
      this.context.dispose();
      this.context = null;
    }
  }

  /**
   * Setup security sandbox - remove dangerous globals
   */
  private setupSandbox(): void {
    if (!this.context) return;

    const ctx = this.context;
    const dangerousGlobals = [
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'localStorage', 'sessionStorage', 'indexedDB',
      'Worker', 'SharedArrayBuffer', 'importScripts'
    ];

    for (const name of dangerousGlobals) {
      ctx.setProp(ctx.global, name, ctx.undefined);
    }
  }

  /**
   * Inject ctx object with utility functions
   */
  private injectContext(context: ScriptContext): void {
    if (!this.context) return;

    const ctx = this.context;
    const ctxHandle = ctx.newObject();

    // Inject properties
    ctx.setProp(ctxHandle, 'index', ctx.newNumber(context.index));
    ctx.setProp(ctxHandle, 'timestamp', ctx.newNumber(context.timestamp));

    // Inject state object
    const stateHandle = ctx.newObject();
    for (const [key, value] of Object.entries(context.state)) {
      this.setJSValue(stateHandle, key, value);
    }
    ctx.setProp(ctxHandle, 'state', stateHandle);

    // Inject utility functions
    this.injectUtilityFunctions(ctxHandle);

    // Inject faker API
    this.injectFakerAPI(ctxHandle);

    ctx.setProp(ctx.global, 'ctx', ctxHandle);
  }

  /**
   * Inject utility functions into ctx
   */
  private injectUtilityFunctions(ctxHandle: any): void {
    if (!this.context) return;

    const ctx = this.context;

    // random(min, max)
    const randomFn = ctx.newFunction('random', (minHandle, maxHandle) => {
      const min = ctx.getNumber(minHandle);
      const max = ctx.getNumber(maxHandle);
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      return ctx.newNumber(result);
    });
    ctx.setProp(ctxHandle, 'random', randomFn);

    // randomFloat(min, max)
    const randomFloatFn = ctx.newFunction('randomFloat', (minHandle, maxHandle) => {
      const min = ctx.getNumber(minHandle);
      const max = ctx.getNumber(maxHandle);
      const result = Math.random() * (max - min) + min;
      return ctx.newNumber(result);
    });
    ctx.setProp(ctxHandle, 'randomFloat', randomFloatFn);

    // uuid()
    const uuidFn = ctx.newFunction('uuid', () => {
      return ctx.newString(uuidv4());
    });
    ctx.setProp(ctxHandle, 'uuid', uuidFn);

    // now() - ISO timestamp
    const nowFn = ctx.newFunction('now', () => {
      return ctx.newString(new Date().toISOString());
    });
    ctx.setProp(ctxHandle, 'now', nowFn);

    // hash(str)
    const hashFn = ctx.newFunction('hash', (strHandle) => {
      const str = ctx.getString(strHandle);
      // Simple hash - in production use proper hash library
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return ctx.newString(Math.abs(hash).toString(16));
    });
    ctx.setProp(ctxHandle, 'hash', hashFn);

    // base64(str)
    const base64Fn = ctx.newFunction('base64', (strHandle) => {
      const str = ctx.getString(strHandle);
      try {
        const encoded = btoa(str);
        return ctx.newString(encoded);
      } catch {
        return ctx.newString('');
      }
    });
    ctx.setProp(ctxHandle, 'base64', base64Fn);
  }

  /**
   * Inject faker API into ctx
   */
  private injectFakerAPI(ctxHandle: any): void {
    if (!this.context) return;

    const ctx = this.context;
    const fakerHandle = ctx.newObject();

    // Simple faker implementations
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    const companies = ['Acme Corp', 'Globex', 'Initech', 'Hooli', 'Umbrella Corp'];

    // name()
    ctx.setProp(fakerHandle, 'name', ctx.newFunction('name', () => {
      const first = firstNames[Math.floor(Math.random() * firstNames.length)];
      const last = lastNames[Math.floor(Math.random() * lastNames.length)];
      return ctx.newString(`${first} ${last}`);
    }));

    // email()
    ctx.setProp(fakerHandle, 'email', ctx.newFunction('email', () => {
      const first = firstNames[Math.floor(Math.random() * firstNames.length)].toLowerCase();
      const last = lastNames[Math.floor(Math.random() * lastNames.length)].toLowerCase();
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return ctx.newString(`${first}.${last}@${domain}`);
    }));

    // phone()
    ctx.setProp(fakerHandle, 'phone', ctx.newFunction('phone', () => {
      const phone = `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
      return ctx.newString(phone);
    }));

    // address()
    ctx.setProp(fakerHandle, 'address', ctx.newFunction('address', () => {
      const num = Math.floor(Math.random() * 9000) + 1000;
      const street = ['Main St', 'Oak Ave', 'Park Rd', 'Cedar Ln'][Math.floor(Math.random() * 4)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      return ctx.newString(`${num} ${street}, ${city}`);
    }));

    // company()
    ctx.setProp(fakerHandle, 'company', ctx.newFunction('company', () => {
      const company = companies[Math.floor(Math.random() * companies.length)];
      return ctx.newString(company);
    }));

    // lorem(words)
    ctx.setProp(fakerHandle, 'lorem', ctx.newFunction('lorem', (countHandle) => {
      const count = ctx.getNumber(countHandle);
      const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor'];
      const result = [];
      for (let i = 0; i < count; i++) {
        result.push(words[Math.floor(Math.random() * words.length)]);
      }
      return ctx.newString(result.join(' '));
    }));

    ctx.setProp(ctxHandle, 'faker', fakerHandle);
  }

  /**
   * Convert a QuickJS handle to a JavaScript object
   */
  private toJSObject(handle: any): any {
    if (!this.context) return null;

    const ctx = this.context;
    const type = ctx.typeof(handle);

    switch (type) {
      case 'number':
        return ctx.getNumber(handle);
      case 'string':
        return ctx.getString(handle);
      case 'boolean':
        return handle.value === 1;
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'object':
        // Check if array
        const lengthHandle = ctx.getProp(handle, 'length');
        if (ctx.typeof(lengthHandle) === 'number') {
          // Array
          lengthHandle.dispose();
          const result: any[] = [];
          const len = ctx.getNumber(ctx.getProp(handle, 'length'));
          for (let i = 0; i < len; i++) {
            const itemHandle = ctx.getProp(handle, i);
            result.push(this.toJSObject(itemHandle));
            itemHandle.dispose();
          }
          return result;
        } else {
          lengthHandle.dispose();
          // Object
          const result: Record<string, any> = {};
          // Try common property names
          const propNames = ['key', 'value', 'headers'];
          for (const key of propNames) {
            try {
              const propHandle = ctx.getProp(handle, key);
              if (ctx.typeof(propHandle) !== 'undefined') {
                result[key] = this.toJSObject(propHandle);
              }
              propHandle.dispose();
            } catch {
              // Property doesn't exist
            }
          }
          return result;
        }
      default:
        return null;
    }
  }

  /**
   * Set a JavaScript value on a QuickJS object
   */
  private setJSValue(objHandle: any, key: string, value: any): void {
    if (!this.context) return;

    const ctx = this.context;

    if (value === null) {
      ctx.setProp(objHandle, key, ctx.null);
    } else if (value === undefined) {
      ctx.setProp(objHandle, key, ctx.undefined);
    } else if (typeof value === 'number') {
      ctx.setProp(objHandle, key, ctx.newNumber(value));
    } else if (typeof value === 'string') {
      ctx.setProp(objHandle, key, ctx.newString(value));
    } else if (typeof value === 'boolean') {
      ctx.setProp(objHandle, key, value ? ctx.true : ctx.false);
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        const arrHandle = ctx.newArray();
        value.forEach((item, index) => {
          this.setJSValue(arrHandle, index.toString(), item);
        });
        ctx.setProp(objHandle, key, arrHandle);
      } else {
        const nestedObjHandle = ctx.newObject();
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          this.setJSValue(nestedObjHandle, nestedKey, nestedValue);
        }
        ctx.setProp(objHandle, key, nestedObjHandle);
      }
    }
  }

  /**
   * Dispose the engine and free resources
   */
  dispose(): void {
    if (this.context) {
      this.context.dispose();
      this.context = null;
    }
    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let scriptEngineInstance: ScriptEngine | null = null;

export async function getScriptEngine(): Promise<ScriptEngine> {
  if (!scriptEngineInstance) {
    scriptEngineInstance = new ScriptEngine();
    await scriptEngineInstance.init();
  }
  return scriptEngineInstance;
}

export function disposeScriptEngine(): void {
  if (scriptEngineInstance) {
    scriptEngineInstance.dispose();
    scriptEngineInstance = null;
  }
}
