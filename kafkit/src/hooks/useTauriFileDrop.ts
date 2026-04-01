/**
 * Hook for handling Tauri file drop events
 * Tauri uses special 'tauri://file-drop' events instead of standard HTML5 drag and drop
 */

import { useEffect, useRef } from 'react';

// Detect if running in Tauri environment
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

interface UseTauriFileDropOptions {
  onFileDrop: (paths: string[]) => void;
  enabled?: boolean;
}

export function useTauriFileDrop({ onFileDrop, enabled = true }: UseTauriFileDropOptions) {
  const callbackRef = useRef(onFileDrop);
  callbackRef.current = onFileDrop;

  useEffect(() => {
    if (!isTauri() || !enabled) {
      console.log('[useTauriFileDrop] Disabled or not in Tauri environment');
      return;
    }

    console.log('[useTauriFileDrop] Setting up Tauri file drop listener...');
    
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    // Dynamically import Tauri API to avoid errors in non-Tauri environments
    import('@tauri-apps/api/event').then(({ listen }) => {
      if (!isMounted) return;
      
      console.log('[useTauriFileDrop] Tauri event API loaded, registering listener...');
      
      listen('tauri://file-drop', (event: any) => {
        console.log('[useTauriFileDrop] File drop event received:', event);
        const paths: string[] = event.payload || [];
        if (paths.length > 0) {
          console.log('[useTauriFileDrop] Calling callback with paths:', paths);
          callbackRef.current(paths);
        } else {
          console.warn('[useTauriFileDrop] No paths in drop event');
        }
      }).then((fn) => {
        if (isMounted) {
          unlisten = fn;
          console.log('[useTauriFileDrop] Listener registered successfully');
        } else {
          fn();
        }
      }).catch((err) => {
        console.error('[useTauriFileDrop] Failed to register listener:', err);
      });
    }).catch((err) => {
      console.error('[useTauriFileDrop] Failed to import Tauri event API:', err);
    });

    return () => {
      console.log('[useTauriFileDrop] Cleanup, unmounting...');
      isMounted = false;
      if (unlisten) {
        console.log('[useTauriFileDrop] Unregistering listener');
        unlisten();
      }
    };
  }, [enabled]);
}

export { isTauri };
