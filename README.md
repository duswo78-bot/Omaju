# Omaju (오마주)

술·안주 페어링과 술게임을 위한 React 앱입니다. AI 추천은 브라우저 Web Worker + 온디바이스 임베딩으로 동작합니다.

## Live

- **GitHub Pages:** https://duswo78-bot.github.io/Omaju/
- `main` 브랜치에 푸시하면 Actions가 자동 빌드·배포합니다.

## Local

```bash
npm install
npm run dev
```

프로덕션 빌드:

```bash
npm run build
npm run preview
```

GitHub Pages와 동일한 base(`/Omaju/`)로 로컬 빌드하려면:

```powershell
$env:GITHUB_PAGES="true"; npm run build
```

## Stack

- React 19 + Vite 8
- react-router-dom
- Capacitor (네이티브 래핑 준비)
- `@xenova/transformers` (온디바이스 AI)
