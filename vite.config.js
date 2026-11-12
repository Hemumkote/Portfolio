import { defineConfig } from 'vite';

// Served from https://hemumkote.github.io/Portfolio/ on GitHub Pages
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Portfolio/' : '/',
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 900 }, // three.js is a single large chunk by design
}));
