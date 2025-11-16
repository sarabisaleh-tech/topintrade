// Cloudflare Worker - Simple Firebase Proxy
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'Firebase Proxy is running',
        usage: 'Add /proxy/ before Firebase URLs'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Proxy Firebase requests
    if (url.pathname.startsWith('/proxy/')) {
      try {
        // Extract target URL
        const targetPath = url.pathname.replace('/proxy/', '');
        const targetUrl = `https://${targetPath}${url.search}`;

        // Forward request
        const newRequest = new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
        });

        const response = await fetch(newRequest);
        const newResponse = new Response(response.body, response);

        // Add CORS headers
        Object.keys(corsHeaders).forEach(key => {
          newResponse.headers.set(key, corsHeaders[key]);
        });

        return newResponse;
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
}
