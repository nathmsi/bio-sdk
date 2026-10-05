import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/collect':  'http://localhost:9000',
      '/sessions': 'http://localhost:9000',
      '/events':   'http://localhost:9000',
      '/health':   'http://localhost:9000',
    },
  },
});
