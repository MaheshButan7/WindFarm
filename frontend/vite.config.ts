import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The POC dependencies can resolve from both the frontend and repository root.
  // Keep React Leaflet and the app on one React instance to avoid invalid hook calls.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
