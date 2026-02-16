import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    envPrefix: ['VITE_', 'GOOGLE_Gemini_'],
    server: {
      port: 3000,
      host: '0.0.0.0',

    },
    plugins: [react()],
    define: {
      // No central Gemini key — users provide their own via Settings
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
