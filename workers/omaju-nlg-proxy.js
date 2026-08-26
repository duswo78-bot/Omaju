/**
 * Cloudflare Worker — SpaceXAI(xAI) NLG 프록시
 *
 * 배포 예:
 *   npx wrangler deploy workers/omaju-nlg-proxy.js --name omaju-nlg-proxy
 *   npx wrangler secret put XAI_API_KEY
 *
 * 앱 .env / Actions secret:
 *   VITE_NLG_API_BASE=https://omaju-nlg-proxy.<account>.workers.dev
 */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/nlg') {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    }

    const key = env.XAI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: 'XAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_json' }), {
        status: 400,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    }

    const prompt = body?.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt_required' }), {
        status: 400,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    }

    const model = env.XAI_MODEL || 'grok-4-1-fast-non-reasoning';

    try {
      const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 220,
          messages: [
            {
              role: 'system',
              content:
                'You are Omaju AI. Reply in Korean only. Do not invent drinks or snacks not listed in the user facts.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: 'upstream_error', detail: data }), {
          status: 502,
          headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
        });
      }

      const answer = data?.choices?.[0]?.message?.content?.trim() || '';
      return new Response(JSON.stringify({ answer }), {
        status: 200,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'proxy_failed', message: String(err) }), {
        status: 502,
        headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
      });
    }
  },
};
