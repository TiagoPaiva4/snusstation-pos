import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/snusstation-pos/', // <--- ALTERA ISTO! Ex: '/snusstation-pos/'
})