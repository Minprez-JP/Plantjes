import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { CONTENT_SECURITY_POLICY } from './src/lib/contentSecurityPolicy.ts'

export { CONTENT_SECURITY_POLICY } from './src/lib/contentSecurityPolicy.ts'

function securityMeta(): Plugin {
  return {
    name: 'plantjes-security-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig({
  plugins: [react(), securityMeta()],
  build: {
    sourcemap: false,
  },
})
