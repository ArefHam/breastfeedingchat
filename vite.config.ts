import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/breastfeedingchat/',
  plugins: [react()],
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: 'supabase',
              test: /node_modules[\\/]@supabase[\\/]/,
              includeDependenciesRecursively: false,
              priority: 3,
            },
            {
              name: 'markdown',
              test: /node_modules[\\/](?:react-markdown|remark-|unified|micromark|mdast|hast)/,
              includeDependenciesRecursively: false,
              priority: 2,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              includeDependenciesRecursively: false,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
