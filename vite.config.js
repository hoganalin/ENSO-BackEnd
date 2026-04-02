import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base:
    process.env.NODE_ENV === 'production'
      ? '/vite-reacthomework-finalweek-backEnd/'
      : '/',
  plugins: [react()],
});
