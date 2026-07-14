module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = (req.query.url || '').trim();
  if (!url) {
    return res.status(400).json({ error: 'Ange en Maps-URL' });
  }

  try {
    // Följ redirects för att få full Maps URL
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReviewLink/1.0)' }
    });

    const fullUrl = response.url;
    let placeId = null;

    // Olika mönster att extrahera Place ID från Maps-URL
    if (!placeId) {
      const m = fullUrl.match(/!1s([A-Za-z0-9_\-:?]+)!/);
      if (m?.[1]) placeId = m[1];
    }
    if (!placeId) {
      const m = fullUrl.match(/[?&]placeid=([A-Za-z0-9_\-]+)/);
      if (m?.[1]) placeId = m[1];
    }
    if (!placeId) {
      const m = fullUrl.match(/1s([A-Za-z0-9_\-]+):0x/);
      if (m?.[1]) placeId = m[1];
    }

    if (placeId) {
      return res.json({
        success: true,
        placeId,
        reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
        resolvedUrl: fullUrl
      });
    }

    // Fallback: CID-format
    const cid = fullUrl.match(/[?&]cid=(\d+)/)?.[1];
    if (cid) {
      return res.json({
        success: true,
        reviewUrl: `https://search.google.com/local/writereview?placeid=${cid}`,
        resolvedUrl: fullUrl,
        cid
      });
    }

    return res.status(404).json({
      error: 'Kunde inte hitta Place ID',
      resolvedUrl: fullUrl
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Kunde inte följa URL:en',
      message: err.message
    });
  }
};
