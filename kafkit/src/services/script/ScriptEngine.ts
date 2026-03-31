/**
 * Script Engine Service - QuickJS Integration
 * 
 * Provides secure JavaScript execution environment for message generation
 */

import { getQuickJS } from 'quickjs-emscripten';
import type { QuickJSRuntime, QuickJSContext } from 'quickjs-emscripten-core';
import type { ScriptContext, ScriptMessage } from '../../types/script';
import { v4 as uuidv4 } from 'uuid';

// Simple hash function for ctx.hash()
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Faker data generators
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'company.com'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const companies = ['Acme Corp', 'Globex', 'Initech', 'Hooli', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises'];
const loremWords = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore'];

const fakerAPI = {
  name: () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
  email: () => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)].toLowerCase();
    const last = lastNames[Math.floor(Math.random() * lastNames.length)].toLowerCase();
    return `${first}.${last}@${domains[Math.floor(Math.random() * domains.length)]}`;
  },
  phone: () => `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
  address: () => {
    const num = Math.floor(Math.random() * 9000) + 1000;
    const street = ['Main St', 'Oak Ave', 'Park Rd', 'Cedar Ln', 'Elm St'][Math.floor(Math.random() * 5)];
    return `${num} ${street}, ${cities[Math.floor(Math.random() * cities.length)]}`;
  },
  company: () => companies[Math.floor(Math.random() * companies.length)],
  lorem: (count: number) => {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
    }
    return result.join(' ');
  }
};

export class ScriptEngine {
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private isInitialized = false;

  /**
   * Initialize the QuickJS engine
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const module = await getQuickJS();
      this.runtime = module.newRuntime();
      
      // Set resource limits
      this.runtime.setMemoryLimit(1024 * 1024); // 1MB
      this.runtime.setMaxStackSize(1024 * 512);  // 512KB stack
      
      this.isInitialized = true;
      console.log('[ScriptEngine] Initialized successfully');
    } catch (error) {
      console.error('[ScriptEngine] Failed to initialize:', error);
      throw error;
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
      // Setup sandbox and inject ctx
      this.setupContext(context);
      
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
   * Setup context with sandbox and ctx object
   */
  private setupContext(context: ScriptContext): void {
    if (!this.context) return;

    const ctx = this.context;

    // Remove dangerous globals
    const dangerousGlobals = [
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'localStorage', 'sessionStorage', 'indexedDB',
      'Worker', 'SharedArrayBuffer', 'importScripts'
    ];
    for (const name of dangerousGlobals) {
      ctx.setProp(ctx.global, name, ctx.undefined);
    }

    // Create ctx object
    const ctxHandle = ctx.newObject();

    // Properties
    ctx.setProp(ctxHandle, 'index', ctx.newNumber(context.index));
    ctx.setProp(ctxHandle, 'timestamp', ctx.newNumber(context.timestamp));

    // State object
    const stateHandle = ctx.newObject();
    for (const [key, value] of Object.entries(context.state)) {
      this.setValue(stateHandle, key, value);
    }
    ctx.setProp(ctxHandle, 'state', stateHandle);

    // Utility functions
    ctx.setProp(ctxHandle, 'random', ctx.newFunction('random', (minH, maxH) => {
      const min = ctx.getNumber(minH);
      const max = ctx.getNumber(maxH);
      return ctx.newNumber(Math.floor(Math.random() * (max - min + 1)) + min);
    }));

    ctx.setProp(ctxHandle, 'randomFloat', ctx.newFunction('randomFloat', (minH, maxH) => {
      const min = ctx.getNumber(minH);
      const max = ctx.getNumber(maxH);
      return ctx.newNumber(Math.random() * (max - min) + min);
    }));

    ctx.setProp(ctxHandle, 'uuid', ctx.newFunction('uuid', () => ctx.newString(uuidv4())));
    ctx.setProp(ctxHandle, 'now', ctx.newFunction('now', () => ctx.newString(new Date().toISOString())));
    ctx.setProp(ctxHandle, 'hash', ctx.newFunction('hash', (strH) => ctx.newString(simpleHash(ctx.getString(strH)))));
    ctx.setProp(ctxHandle, 'base64', ctx.newFunction('base64', (strH) => {
      try {
        return ctx.newString(btoa(ctx.getString(strH)));
      } catch {
        return ctx.newString('');
      }
    }));

    // Faker API
    const fakerHandle = ctx.newObject();
    ctx.setProp(fakerHandle, 'name', ctx.newFunction('name', () => ctx.newString(fakerAPI.name())));
    ctx.setProp(fakerHandle, 'email', ctx.newFunction('email', () => ctx.newString(fakerAPI.email())));
    ctx.setProp(fakerHandle, 'phone', ctx.newFunction('phone', () => ctx.newString(fakerAPI.phone())));
    ctx.setProp(fakerHandle, 'address', ctx.newFunction('address', () => ctx.newString(fakerAPI.address())));
    ctx.setProp(fakerHandle, 'company', ctx.newFunction('company', () => ctx.newString(fakerAPI.company())));
    ctx.setProp(fakerHandle, 'lorem', ctx.newFunction('lorem', (countH) => {
      const count = ctx.getNumber(countH);
      return ctx.newString(fakerAPI.lorem(count));
    }));
    ctx.setProp(ctxHandle, 'faker', fakerHandle);

    // Set ctx global
    ctx.setProp(ctx.global, 'ctx', ctxHandle);
  }

  /**
   * Convert QuickJS handle to JS object
   */
  private toJSObject(handle: any): any {
    if (!this.context) return null;
    const ctx = this.context;
    const type = ctx.typeof(handle);

    switch (type) {
      case 'number': return ctx.getNumber(handle);
      case 'string': return ctx.getString(handle);
      case 'boolean': return handle.value === 1;
      case 'null': return null;
      case 'undefined': return undefined;
      case 'object': {
        const lengthHandle = ctx.getProp(handle, 'length');
        if (ctx.typeof(lengthHandle) === 'number') {
          // Array
          const len = ctx.getNumber(lengthHandle);
          lengthHandle.dispose();
          const arr: any[] = [];
          for (let i = 0; i < len; i++) {
            const item = ctx.getProp(handle, i);
            arr.push(this.toJSObject(item));
            item.dispose();
          }
          return arr;
        } else {
          lengthHandle.dispose();
          // Object - try to get all properties
          const obj: Record<string, any> = {};
          // Common property names for our use case
          const props = ['key', 'value', 'headers', 'symbol', 'timestamp', 'price', 'change', 
            'changePercent', 'volume', 'dayHigh', 'dayLow', 'dayOpen', 'deviceId', 'readings', 
            'temperature', 'humidity', 'pressure', 'status', 'orderId', 'customer', 'items',
            'amount', 'currency', 'level', 'service', 'message', 'traceId', 'event', 'userId'];
          for (const prop of props) {
            try {
              const val = ctx.getProp(handle, prop);
              if (ctx.typeof(val) !== 'undefined') {
                obj[prop] = this.toJSObject(val);
              }
              val.dispose();
            } catch {
              // Ignore
            }
          }
          return obj;
        }
      }
      default: return null;
    }
  }

  /**
   * Set JS value on QuickJS object
   */
  private setValue(obj: any, key: string, value: any): void {
    if (!this.context) return;
    const ctx = this.context;

    if (value === null) ctx.setProp(obj, key, ctx.null);
    else if (value === undefined) ctx.setProp(obj, key, ctx.undefined);
    else if (typeof value === 'number') ctx.setProp(obj, key, ctx.newNumber(value));
    else if (typeof value === 'string') ctx.setProp(obj, key, ctx.newString(value));
    else if (typeof value === 'boolean') ctx.setProp(obj, key, value ? ctx.true : ctx.false);
    else if (Array.isArray(value)) {
      const arr = ctx.newArray();
      value.forEach((v, i) => this.setValue(arr, i.toString(), v));
      ctx.setProp(obj, key, arr);
    } else if (typeof value === 'object') {
      const nested = ctx.newObject();
      for (const [k, v] of Object.entries(value)) {
        this.setValue(nested, k, v);
      }
      ctx.setProp(obj, key, nested);
    }
  }

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

// Singleton
let instance: ScriptEngine | null = null;

export async function getScriptEngine(): Promise<ScriptEngine> {
  if (!instance) {
    instance = new ScriptEngine();
    await instance.init();
  }
  return instance;
}

export function disposeScriptEngine(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
