import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { groqAiPlugin } from './vite-plugin-groq.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), groqAiPlugin()],
})
