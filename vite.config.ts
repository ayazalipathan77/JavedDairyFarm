import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isOfflineBuild = process.env.BUILD_OFFLINE === 'true';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: isOfflineBuild ? 'iife' : 'iife',
          inlineDynamicImports: true,
          manualChunks: undefined,
        },
      },
    },
    plugins: [
      react(),
      ...(isOfflineBuild ? [] : [
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
          },
          includeAssets: ['**/*'],
          manifest: {
            name: 'Javed Dairy Farm',
            short_name: 'Javed Dairy',
            description: 'Dairy farm management system',
            theme_color: '#0ea5e9',
            icons: [
              {
                src: 'icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ])
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
