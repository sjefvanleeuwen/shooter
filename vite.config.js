import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs-extra';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    copyPublicDir: true,  // Enable copying
    emptyOutDir: false,   // Don't empty the output directory
    rollupOptions: {
      input: {
        main: '/index.html'
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.includes('sprites/') || 
              assetInfo.name.includes('backgrounds/') ||
              assetInfo.name.includes('audio/')) {
            return assetInfo.name; // Keep original path
          }
          // Handle config files specially
          if (assetInfo.name.includes('/config/')) {
            return assetInfo.name.replace('config/', 'config/');
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    }
  },
  publicDir: 'public',
  plugins: [{
    name: 'copy-config',
    closeBundle: async () => {
      // Ensure config directory exists in dist
      await fs.ensureDir('dist/config');
      // Copy CRT config
      await fs.copy(
        'config/crt-effect.json',
        'dist/config/crt-effect.json'
      );
      console.log('CRT config copied to dist/config');
    }
  }]
});
