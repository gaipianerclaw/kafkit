// Type definitions for Tauri global objects

export {};

declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
    __TAURI_IPC__?: (message: unknown) => void;
  }
}
