import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: true, // Expose to all network interfaces
    port: 5173,
    proxy: {
      '/api': 'https://nexthire-backend-ereo.onrender.com', // Proxy API requests to backend
    },
  }
});