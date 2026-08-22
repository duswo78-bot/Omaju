/**
 * Cloudflare Worker — GitHub Pages(브라우저)에서 카카오 로컬 API CORS 우회
 *
 * 배포 예:
 *   npx wrangler deploy workers/kakao-proxy.js --name omaju-kakao-proxy
 *   wrangler secret put KAKAO_REST_KEY
 *
 * 앱 .env / Actions secret:
 *   VITE_KAKAO_API_BASE=https://omaju-kakao-proxy.<account>.workers.dev
 */
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const upstream = new URL('https://dapi.kakao.com' + url.pathname + url.search);

    if (!upstream.pathname.startsWith('/v2/local/')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders(request) });
    }

    const key = env.KAKAO_REST_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: 'KAKAO_REST_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(upstream.toString(), {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders(request),
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    Vary: 'Origin',
  };
}
