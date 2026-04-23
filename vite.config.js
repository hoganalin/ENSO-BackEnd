import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Base path rules:
//   - Vercel (production SPA at root):  base = '/'
//   - GitHub Pages (served under /ENSO-BackEnd/):  base = '/ENSO-BackEnd/'
//   - Local dev:  base = '/'
// We pick the right value using Vercel's built-in VERCEL env var.
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const isVercel = process.env.VERCEL === '1';
  const base = !isBuild || isVercel ? '/' : '/ENSO-BackEnd/';

  return {
    base,
    plugins: [react()],
  };
});
