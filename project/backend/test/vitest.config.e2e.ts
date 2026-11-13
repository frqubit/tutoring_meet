import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    environment: 'node',
    sequence: {
      shuffle: false,
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        transform: {
          useDefineForClassFields: false, // Required for NestJS CLI compliance
        },
      },
    }),
    tsconfigPaths(),
  ],
});
