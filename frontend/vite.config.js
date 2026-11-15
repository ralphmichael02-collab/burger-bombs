// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5174',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          // SILENCE THE ECONNABORTED ERROR SPAM
          proxy.on('error', (err) => {
            if (err.code === 'ECONNABORTED') return; // Ignore
            if (err.code === 'ECONNREFUSED') return; // Ignore if backend is off
            console.log('[vite-proxy-error]', err);
          });
        },
      },
    },
  },
});