import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const frontendPort = Number(env.FRONTEND_PORT || env.VITE_PORT || 5175);
  const backendTarget = env.VITE_API_TARGET || env.API_URL || 'http://localhost:5001';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: frontendPort,
      strictPort: false,
      proxy: {
        // Proxy all /api requests to the Express backend during development
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        // Proxy Socket.io WebSocket connections
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: true,
      port: Number(env.PREVIEW_PORT || 4174),
      strictPort: false,
    },
    define: {
      // Required by simple-peer (uses global)
      global: 'globalThis',
    },
  };
});
