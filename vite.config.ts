import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // All /api calls go to the local Hono server so keys stay server-side and CORS never comes up.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  test: { include: ['shared/**/*.test.ts', 'server/**/*.test.ts'] },
});
