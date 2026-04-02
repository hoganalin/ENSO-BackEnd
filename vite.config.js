import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages (project pages) is served under /<repo>/, so we must set base for production builds.
  // Using `command` is more reliable than `process.env.NODE_ENV` in Vite.
  base: command === 'build' ? '/ENSO-BackEnd/' : '/',
  plugins: [react()],
}));
