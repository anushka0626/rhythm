import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Entry point for the Main process
        entry: 'main.js',
      },
      {
        entry: 'preload.js',
        onready(options) {
          // Notify the Renderer process when the preload script is compiled
          options.reload();
        },
      },
    ]),
  ],
});