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

## 근처 주점 찾기 (하이브리드)

안주 이름만 지도에 던지지 않고:

1. **검색 의도 변환** — 예: 곱창 → `곱창집`, 회 → `횟집`, 전 → `전집/막걸리`
2. **위치** — 현재 위치(GPS) 또는 상권 프리셋(강남/홍대/성수 등)
3. **목록** — 카카오 로컬 API로 반경 내 장소를 앱 안에 표시 후, 상세/길찾기로 연결

### 근처 가게 목록이 보이게 하려면

로컬(추천):

```bash
cp .env.example .env
# VITE_KAKAO_REST_KEY=카카오_REST_키
npm run dev
```

`npm run dev` 는 Vite 프록시로 CORS를 우회하므로 **목록이 바로** 뜹니다.

GitHub Pages(배포 사이트)는 브라우저 CORS 때문에 프록시가 필요합니다.

```bash
# Cloudflare Worker 한 번 배포
npx wrangler deploy workers/kakao-proxy.js --name omaju-kakao-proxy
npx wrangler secret put KAKAO_REST_KEY   # REST 키 입력

# GitHub Actions secret
# VITE_KAKAO_API_BASE=https://omaju-kakao-proxy.<your-subdomain>.workers.dev
# VITE_KAKAO_REST_KEY=...
```

## Stack

- React 19 + Vite 8
- react-router-dom
- Capacitor (네이티브 래핑 준비)
- `@xenova/transformers` (온디바이스 AI)
- Kakao Local API (주변 주점 목록, 선택)
