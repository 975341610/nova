import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
const viteConfig = defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
      },
      {
        entry: 'electron/preload.ts',
        onstart(options: any) {
          // Notify the Renderer-Process to reload the page when the Preload-Script build is complete, 
          // instead of restarting the entire Electron App.
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'react': resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    // 根据环境变量动态配置 HMR，避免写死导致本地和云端环境冲突
    hmr: process.env.HMR_CLIENT_PORT 
      ? {
          clientPort: Number(process.env.HMR_CLIENT_PORT),
          protocol: process.env.HMR_PROTOCOL || 'wss',
        }
      : {
          protocol: 'wss',
          clientPort: 443
        },
  },
})

export default mergeConfig(
  viteConfig,
  defineVitestConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  })
)
