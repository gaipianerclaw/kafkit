/**
 * Script Engine Service - QuickJS Integration
 * 
 * Provides secure JavaScript execution environment for message generation
 */

import { getQuickJS } from 'quickjs-emscripten';
import type { QuickJSRuntime, QuickJSContext } from 'quickjs-emscripten-core';
import type { ScriptContext, ScriptMessage } from '../../types/script';
import { v4 as uuidv4 } from 'uuid';

// Simple hash function
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
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
const companies = ['Acme Corp', 'Globex', 'Initech', 'Hooli', 'Umbrella Corp'];
const loremWords = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit'];

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
    const street = ['Main St', 'Oak Ave', 'Park Rd', 'Cedar Ln'][Math.floor(Math.random() * 4)];
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
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const module = await getQuickJS();
      this.runtime = module.newRuntime();
      this.runtime.setMemoryLimit(1024 * 1024);
      this.runtime.setMaxStackSize(1024 * 512);
      this.isInitialized = true;
      console.log('[ScriptEngine] Initialized');
    } catch (error) {
      console.error('[ScriptEngine] Init failed:', error);
      throw error;
    }
  }

  async executeScript(
    script: string,
    context: ScriptContext
  ): Promise<ScriptMessage | ScriptMessage[]> {
    if (!this.isInitialized || !this.runtime) {
      throw new Error('Script engine not initialized');
    }

    let ctx: QuickJSContext | null = null;
    
    try {
      ctx = this.runtime.newContext();
      this.setupContext(ctx, context);
      
      const wrappedScript = `
        ${script}
        ;
        if (typeof generate !== 'function') {
          throw new Error('generate function not found');
        }
        generate(ctx);
      `;
      
      const result = ctx.evalCode(wrappedScript);
      
      if (result.error) {
        const errorMsg = ctx.getString(result.error);
        result.error.dispose();
        throw new Error(errorMsg);
      }
      
      const jsResult = this.toJSObject(ctx, result.value);
      result.value.dispose();
      
      return jsResult as ScriptMessage | ScriptMessage[];
    } finally {
      if (ctx) {
        ctx.dispose();
      }
    }
  }

  private setupContext(ctx: QuickJSContext, context: ScriptContext): void {
    // Remove dangerous globals
    const dangerous = ['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 
      'sessionStorage', 'indexedDB', 'Worker', 'SharedArrayBuffer', 'importScripts'];
    for (const name of dangerous) {
      ctx.setProp(ctx.global, name, ctx.undefined);
    }

    // Create ctx handle
    const ctxHandle = ctx.newObject();

    // Properties
    ctx.setProp(ctxHandle, 'index', ctx.newNumber(context.index));
    ctx.setProp(ctxHandle, 'timestamp', ctx.newNumber(context.timestamp));

    // State object
    const stateHandle = ctx.newObject();
    for (const [key, value] of Object.entries(context.state)) {
      this.setValue(ctx, stateHandle, key, value);
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
      try { return ctx.newString(btoa(ctx.getString(strH))); } 
      catch { return ctx.newString(''); }
    }));

    // Faker API
    const fakerHandle = ctx.newObject();
    ctx.setProp(fakerHandle, 'name', ctx.newFunction('name', () => ctx.newString(fakerAPI.name())));
    ctx.setProp(fakerHandle, 'email', ctx.newFunction('email', () => ctx.newString(fakerAPI.email())));
    ctx.setProp(fakerHandle, 'phone', ctx.newFunction('phone', () => ctx.newString(fakerAPI.phone())));
    ctx.setProp(fakerHandle, 'address', ctx.newFunction('address', () => ctx.newString(fakerAPI.address())));
    ctx.setProp(fakerHandle, 'company', ctx.newFunction('company', () => ctx.newString(fakerAPI.company())));
    ctx.setProp(fakerHandle, 'lorem', ctx.newFunction('lorem', (countH) => {
      return ctx.newString(fakerAPI.lorem(ctx.getNumber(countH)));
    }));
    ctx.setProp(ctxHandle, 'faker', fakerHandle);

    ctx.setProp(ctx.global, 'ctx', ctxHandle);
  }

  private toJSObject(ctx: QuickJSContext, handle: any): any {
    const type = ctx.typeof(handle);

    switch (type) {
      case 'number': return ctx.getNumber(handle);
      case 'string': return ctx.getString(handle);
      case 'boolean': return handle.value === 1;
      case 'null': return null;
      case 'undefined': return undefined;
      case 'object': {
        const lengthHandle = ctx.getProp(handle, 'length');
        const hasLength = ctx.typeof(lengthHandle) === 'number';
        
        if (hasLength) {
          // Array
          const len = ctx.getNumber(lengthHandle);
          lengthHandle.dispose();
          const arr: any[] = [];
          for (let i = 0; i < len; i++) {
            const item = ctx.getProp(handle, i);
            arr.push(this.toJSObject(ctx, item));
            item.dispose();
          }
          return arr;
        } else {
          lengthHandle.dispose();
          // Object
          const obj: Record<string, any> = {};
          const props = ['key', 'value', 'headers', 'symbol', 'timestamp', 'price', 
            'change', 'changePercent', 'volume', 'dayHigh', 'dayLow', 'dayOpen', 
            'deviceId', 'readings', 'temperature', 'humidity', 'pressure', 'status', 
            'orderId', 'customer', 'items', 'amount', 'currency', 'level', 'service', 
            'message', 'traceId', 'event', 'userId', 'sessionId', 'properties', 'geo'];
          
          for (const prop of props) {
            try {
              const val = ctx.getProp(handle, prop);
              if (ctx.typeof(val) !== 'undefined') {
                obj[prop] = this.toJSObject(ctx, val);
              }
              val.dispose();
            } catch { /* ignore */ }
          }
          return obj;
        }
      }
      default: return null;
    }
  }

  private setValue(ctx: QuickJSContext, obj: any, key: string, value: any): void {
    if (value === null) ctx.setProp(obj, key, ctx.null);
    else if (value === undefined) ctx.setProp(obj, key, ctx.undefined);
    else if (typeof value === 'number') ctx.setProp(obj, key, ctx.newNumber(value));
    else if (typeof value === 'string') ctx.setProp(obj, key, ctx.newString(value));
    else if (typeof value === 'boolean') ctx.setProp(obj, key, value ? ctx.true : ctx.false);
    else if (Array.isArray(value)) {
      const arr = ctx.newArray();
      value.forEach((v, i) => this.setValue(ctx, arr, i.toString(), v));
      ctx.setProp(obj, key, arr);
    } else if (typeof value === 'object') {
      const nested = ctx.newObject();
      for (const [k, v] of Object.entries(value)) {
        this.setValue(ctx, nested, k, v);
      }
      ctx.setProp(obj, key, nested);
    }
  }

  // Do not dispose runtime - keep singleton alive
  dispose(): void {
    // Runtime is managed by getQuickJS singleton, don't dispose it
    this.isInitialized = false;
  }
}

// Singleton instance
let instance: ScriptEngine | null = null;

export async function getScriptEngine(): Promise<ScriptEngine> {
  if (!instance) {
    instance = new ScriptEngine();
    await instance.init();
  }
  return instance;
}

export function disposeScriptEngine(): void {
  // Don't actually dispose to avoid memory issues
  // Just clear the reference
  instance = null;
}
