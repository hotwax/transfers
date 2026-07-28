import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBuild = env.VITE_APP_BUILD
  return {
    // A version build (VITE_APP_BUILD=vX.Y.Z) is self-contained under /vX.Y.Z/; an unset build is the root bootstrap.
    base: appBuild ? `/${appBuild}/` : '/',
    plugins: [
      vue(),
      legacy()
    ],
    define: {
      'import.meta.env.VITE_APP_VERSION_INFO': JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
    },
    resolve: {
      dedupe: ['vue', 'pinia', 'vue-router'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@common': path.resolve(__dirname, '../../common'),
        'vue': path.resolve(__dirname, 'node_modules/vue')
      },
    },
    build: {
      outDir: appBuild ? `dist/${appBuild}` : 'dist',
      target: 'es2015',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    server: {
      port: 8100
    },
    test: {
      globals: true,
      environment: 'jsdom'
    }
  }
})
