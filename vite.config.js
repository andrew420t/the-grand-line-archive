import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { isPreviewBuildEnvironment } from './src/lib/buildEnvironment.js'

// Workers Builds exposes branch metadata. Restrict preview bundles to explicitly
// preview-prefixed variables so production VITE_* settings cannot be embedded.
const previewBuild = isPreviewBuildEnvironment(process.env)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: previewBuild ? 'VITE_PREVIEW_' : 'VITE_',
  define: {
    'import.meta.env.VITE_PREVIEW_BUILD': JSON.stringify(previewBuild),
  },
})
