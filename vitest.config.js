import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['tests/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
    // Integration tests live in tests/integration/ and are run via a separate
    // `npm run test:smoke` script (they hit a real Supabase project).
    exclude: ['tests/integration/**', 'node_modules/**'],
  },
});
