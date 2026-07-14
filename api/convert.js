const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Enable CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = (req.query.url || req.body?.url || '').trim();
  if (!url) {
    return res.status(400).json({ error: 'Ange en Maps-URL', example: 'https://maps.app.goo.gl/XeXtHJQSL7RRwMpK9' });
  }

  try {
    // Step 1: Follow redirects to get the full Maps URL
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReviewLink/1.0)' }
    });

    const fullUrl = response.url;
    
    // Step 2: Try to extract Place ID from the URL
    let placeId = null;

    // Pattern 1: !1s{PLACE_ID}! (in data parameter)
    const matches1 = fullUrl.match(/!1s([A-Za-z0-9_\-]+)!/);
    if (matches1?.[1]) placeId = matches1[1];

    // Pattern 2: placeid={PLACE_ID} (URL parameter)
    if (!placeId) {
      const matches2 = fullUrl.match(/[?&]placeid=([A-Za-z0-9_\-]+)/);
      if (matches2?.[1]) placeId = matches2[1];
    }

    // Pattern 3: 1s{PLACE_ID} without trailing !
    if (!placeId) {
      const matches3 = fullUrl.match(/1s([A-Za-z0-9_\-]+):0x/);
      if (matches3?.[1]) placeId = matches3[1];
    }

    // Step 3: Build response
    if (placeId) {
      const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
      return res.json({
        success: true,
        placeId,
        reviewUrl,
        inputUrl: url,
        resolvedUrl: fullUrl
      });
    }

    // Step 4: Fallback — try CID format
    const cidMatch = fullUrl.match(/[?&]cid=(\d+)/);
    if (cidMatch?.[1]) {
      return res.json({
        success: true,
        note: 'CID detected — construct review URL using CID',
        reviewUrl: `https://search.google.com/local/writereview?placeid=${cidMatch[1]}`,
        inputUrl: url,
        resolvedUrl: fullUrl,
        cid: cidMatch[1]
      });
    }

    return res.status(404).json({
      error: 'Kunde inte hitta Place ID i URL:en',
      inputUrl: url,
      resolvedUrl: fullUrl,
      tip: 'Öppna Maps-länken i en webbläsare och kopiera hela URL:en från adressfältet'
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Kunde inte följa URL:en',
      message: err.message,
      inputUrl: url
    });
  }
};
