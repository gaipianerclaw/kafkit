import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./i18n";
import "./styles/index.css";

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Kafkit Error]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
          <h1>出错了</h1>
          <p>应用发生错误：</p>
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// 全局错误捕获
window.addEventListener('error', (event) => {
  console.error('[Kafkit Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Kafkit Unhandled Rejection]', event.reason);
});

console.log('[Kafkit] Starting app...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById("root");
if (!root) {
  console.error('[Kafkit] Root element not found!');
} else {
  console.log('[Kafkit] Root element found, rendering...');
  
  ReactDOM.createRoot(root).render(
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
  
  console.log('[Kafkit] Render complete');
}
