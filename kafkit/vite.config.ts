import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig(async () => ({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    {
      name: "html-transform",
      transformIndexHtml(html) {
        return html
          .replace(/ crossorigin/g, "")
          .replace(/ crossorigin="[^"]*"/g, "");
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    assetsDir: "assets",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  base: "./",
  optimizeDeps: {
    exclude: ["quickjs-emscripten", "@jitl/quickjs-wasmfile-release-sync"],
  },
}));
