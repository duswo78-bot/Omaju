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

// 로컬에서 NLG Worker를 띄운 경우 (wrangler dev --port 8788 등)
const nlgTarget = process.env.NLG_PROXY_TARGET || 'http://127.0.0.1:8788'
const nlgProxy = {
  '/api/nlg': {
    target: nlgTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api\/nlg/, '/nlg'),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isGithubPages ? '/Omaju/' : '/',
  server: {
    allowedHosts: true,
    proxy: { ...kakaoProxy, ...nlgProxy },
  },
  preview: {
    proxy: { ...kakaoProxy, ...nlgProxy },
  },
})
