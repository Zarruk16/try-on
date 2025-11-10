import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
<<<<<<< HEAD
    setupFiles: ['tests/setup.ts'],
=======
>>>>>>> ad9be224ee8fe669b77456be5589c4d313a69191
  },
  resolve: {
    alias: {
      '@': resolve(root, '.'),
    },
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> ad9be224ee8fe669b77456be5589c4d313a69191
