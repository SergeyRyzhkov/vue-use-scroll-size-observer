import { defineConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dts from 'vite-plugin-dts'

const rootDir = dirname(fileURLToPath(import.meta.url))
const srcDir = resolve(rootDir, './src')
const distDir = resolve(rootDir, './dist')

export default defineConfig({
  root: srcDir,
  build: {
    lib: {
      entry: {
        useScrollSizeObserver: resolve(srcDir, './useScrollSizeObserver.ts'),
      },
      formats: ['es'],
    },
    outDir: distDir,
    emptyOutDir: true,
  },
  plugins: [dts()],
})