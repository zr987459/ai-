
// Vercel Serverless Function to proxy requests to Google Gemini API
// This allows using Cookies for authentication by bypassing browser CORS restrictions.

const https = require('https');
const { URL } = require('url');

module.exports = async (req, res) => {
  // Set CORS headers for the client
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Construct the target Google API URL
    // The incoming request url might be /api/proxy/v1beta/models/...
    // We need to strip /api/proxy and append to google host
    const reqUrl = req.url.replace(/^\/api\/proxy/, '');
    const targetUrl = new URL(`https://generativelanguage.googleapis.com${reqUrl}`);

    // Prepare headers
    const headers = { ...req.headers };
    headers.host = targetUrl.host;
    // Remove headers that might cause issues or expose the proxy
    delete headers['host'];
    delete headers['origin'];
    delete headers['referer'];
    
    // Important: Ensure Content-Type is passed correctly
    if (!headers['content-type']) {
        headers['content-type'] = 'application/json';
    }

    const proxyRequest = https.request(targetUrl, {
      method: req.method,
      headers: headers,
      timeout: 60000 // 60s timeout
    }, (proxyRes) => {
      // Forward status and headers
      res.statusCode = proxyRes.statusCode;
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      // Pipe response body
      proxyRes.pipe(res);
    });

    proxyRequest.on('error', (e) => {
      console.error('Proxy Request Error:', e);
      res.status(502).json({ error: 'Proxy Error', details: e.message });
    });

    // If there is a request body, write it to the proxy request
    if (req.body) {
      const bodyData = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      proxyRequest.write(bodyData);
    }

    proxyRequest.end();

  } catch (error) {
    console.error('Proxy Setup Error:', error);
    res.status(500).json({ error: 'Internal Proxy Error', details: error.message });
  }
};
