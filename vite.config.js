import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs-extra';

const selectedGame = process.env.VITE_GAME;
const inputs = {
  main: '/index.html',
  xenowar: '/xenowar.html',
  blackSignal: '/black-signal.html'
};

// If building a single game, only include launcher + that game.
if (selectedGame === 'xenowar') {
  delete inputs.blackSignal;
}
if (selectedGame === 'black-signal') {
  delete inputs.xenowar;
}

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
      input: inputs,
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.includes('sprites/') || 
              assetInfo.name.includes('backgrounds/') ||
              assetInfo.name.includes('videos/') ||
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
      // Copy default CRT config if it exists (for base engine)
      if (await fs.pathExists('config/crt-effect.json')) {
        await fs.copy(
          'config/crt-effect.json',
          'dist/config/crt-effect.json'
        );
      }
      // Also copy xenowar specific config for easy access
      await fs.ensureDir('dist/games/xenowar/config');
      if (await fs.pathExists('games/xenowar/config/crt-effect.json')) {
        await fs.copy(
          'games/xenowar/config/crt-effect.json',
          'dist/games/xenowar/config/crt-effect.json'
        );
      }

      // Copy Black Signal config
      await fs.ensureDir('dist/games/black-signal/config');
      if (await fs.pathExists('games/black-signal/config/crt-effect.json')) {
        await fs.copy(
          'games/black-signal/config/crt-effect.json',
          'dist/games/black-signal/config/crt-effect.json'
        );
      }

      console.log('Configs copied to dist');
    }
  }]
});
