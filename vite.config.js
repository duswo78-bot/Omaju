import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://duswo78-bot.github.io/Omaju/
const isGithubPages = process.env.GITHUB_PAGES === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isGithubPages ? '/Omaju/' : '/',
  server: {
    allowedHosts: true, // Allow external tunnels like Cloudflare and localtunnel
  }
})
