import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    fileParallelism: false,
    coverage: { provider: 'v8', include: ['src/lib/**', 'src/features/**'] },
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
