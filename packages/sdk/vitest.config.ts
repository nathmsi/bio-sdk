import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 85, branches: 75, functions: 80 },
      exclude: ['scripts/**', 'dist/**', 'src/analytics.ts'],
    },
  },
});
