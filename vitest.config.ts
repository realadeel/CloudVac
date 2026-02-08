import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'server/src/**/*.test.ts',
      'client/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'server/src/pricing/**',
        'server/src/deletion/dependency-graph.ts',
        'client/src/lib/format.ts',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
    },
  },
});
