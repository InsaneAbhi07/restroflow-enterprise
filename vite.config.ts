import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// GitHub Pages serves the app from /<repo>/ — set BASE_PATH when building for Pages
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 2000 },
})
