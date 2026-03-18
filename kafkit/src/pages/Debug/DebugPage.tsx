import { useEffect, useState } from 'react';

export function DebugPage() {
  const [info, setInfo] = useState<string>('Loading...');

  useEffect(() => {
    const data = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hasTauri: typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined,
      hasTauriIPC: typeof window !== 'undefined' && (window as any).__TAURI_IPC__ !== undefined,
      documentReady: document.readyState,
      rootElement: document.getElementById('root')?.innerHTML?.substring(0, 100) || 'empty',
    };
    setInfo(JSON.stringify(data, null, 2));
    console.log('[Kafkit Debug]', data);
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>🔍 Kafkit Debug Page</h1>
      <pre style={{ background: '#f5f5f5', padding: 20, borderRadius: 8 }}>
        {info}
      </pre>
      <button 
        onClick={() => window.location.href = '/#/main'}
        style={{ padding: '10px 20px', marginTop: 20, fontSize: 16 }}
      >
        Go to Main App
      </button>
    </div>
  );
}
