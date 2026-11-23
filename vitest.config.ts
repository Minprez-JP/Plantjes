import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'tools/security-lint/**/*.test.mjs',
      'tests/**/*.test.{ts,tsx,mjs}',
      'scripts/**/*.test.mjs',
    ],
  },
})
