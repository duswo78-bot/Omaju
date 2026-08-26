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

## AI 챗 (FULL / LITE)

대화는 **NLU Frame → 추천 Brain → NLG** 순으로 처리합니다.

| 모드 | 조건 | Front | Back(문장) |
|------|------|-------|------------|
| FULL | Android/iOS 시스템 온디바이스 LLM 가용 | 시스템 LLM → intent JSON | 시스템 LLM |
| LITE | 웹·미지원 기기·플러그인 없음 | 규칙 NLU | SpaceXAI NLG 프록시 → 실패 시 템플릿 |

클라우드 NLG (LITE Back):

```bash
npx wrangler deploy workers/omaju-nlg-proxy.js --name omaju-nlg-proxy
npx wrangler secret put XAI_API_KEY
```

`.env`:

```bash
VITE_NLG_API_BASE=https://omaju-nlg-proxy.<your-subdomain>.workers.dev
```

로컬은 Vite 프록시 `/api/nlg` 를 쓰려면:

```bash
npx wrangler dev workers/omaju-nlg-proxy.js --port 8788
# .env
VITE_NLG_API_BASE=/api
```

`VITE_NLG_API_BASE`가 없으면 템플릿 응답만 사용합니다(불필요한 `/api` 호출 없음).

### Android APK (GitHub Actions)

로컬 SDK 없이 **Actions**에서 debug APK를 만듭니다.

- 워크플로: `.github/workflows/android-build.yml`
- 트리거: `main` 푸시 또는 Actions → **Android Build** → Run workflow
- JDK **21** (Temurin; Capacitor 8 compileOptions) + Android SDK platform 36
- 산출물: Artifacts → `omaju-android-debug` (`app-debug.apk`)

선택 secrets: `VITE_NLG_API_BASE`, `VITE_KAKAO_*` (없으면 Pages 배포와 동일 기본 키)

`OmajuSystemLlm` Capacitor 플러그인은 APK에 **stub**으로 포함됩니다(항상 LITE).  
AICore/ML Kit GenAI 연동은 CI APK 안정화 후 `app/build.gradle` 의존성을 다시 켜고 플러그인 구현을 복원합니다.

## Stack

- React 19 + Vite 8
- react-router-dom
- Capacitor (네이티브 래핑 준비)
- `@xenova/transformers` (온디바이스 임베딩)
- Kakao Local API (주변 주점 목록, 선택)
- SpaceXAI / xAI (LITE NLG, 서버 프록시)
