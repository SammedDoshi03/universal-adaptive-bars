import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'SmartBarChart',
      fileName: 'smart-bar-chart',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-native', 'react-native-svg'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-native': 'ReactNative',
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
} as any)

