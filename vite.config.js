import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE || './',
  test: { include: ['tests/**/*.test.js'] },
});
