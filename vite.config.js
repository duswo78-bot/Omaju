import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://duswo78-bot.github.io/Omaju/
const isGithubPages = process.env.GITHUB_PAGES === 'true'

const kakaoProxy = {
  '/api/kakao': {
    target: 'https://dapi.kakao.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/api\/kakao/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isGithubPages ? '/Omaju/' : '/',
  server: {
    allowedHosts: true,
    proxy: kakaoProxy,
  },
  preview: {
    proxy: kakaoProxy,
  },
})
