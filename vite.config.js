import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: {
      host: "0.0.0.0",
      protocol: "ws",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000", // ✅ ИСПРАВЛЕНО: было 3001 → стало 3000
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
