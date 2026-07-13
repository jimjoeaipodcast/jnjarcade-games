/* GET /api/brightside-config — public config for the submission pages.
   CF Pages env:
     GOOGLE_CLIENT_ID   — OAuth client ID (legacy sub-gate; /amazon no longer uses it)
     YT_CHANNEL_ID      — UC61SJtnVHwbSCJ7YbNo87fw
     YT_API_KEY         — (optional) YouTube Data API key → live subscriber count → live price
     REVIEW_PRICE_GBP   — (optional) manual override / fallback price if no API key
     KOFI_URL           — (optional) override Ko-fi checkout URL
*/

// Proportional review price (Osimo 2026-07-13) — LOW end of each subscriber tier
// (memory: sponsor-pricing). Everyone pays; price tracks the daily sub count.
const TIERS = [
  [0,        15],   // pre-launch / testing (10-sub tier floor)
  [100,      30],
  [500,      80],
  [1000,     150],
  [5000,     400],
  [10000,    700],
  [50000,    1800],
  [100000,   3500],
  [500000,   8000],
  [1000000,  15000],
];

function priceForSubs(subs) {
  let price = TIERS[0][1];
  for (const [threshold, p] of TIERS) {
    if (subs >= threshold) price = p; else break;
  }
  return price;
}

export async function onRequestGet({ env }) {
  const channelId = env.YT_CHANNEL_ID || 'UC61SJtnVHwbSCJ7YbNo87fw';
  let subCount = null;
  let reviewPrice = parseInt(env.REVIEW_PRICE_GBP || '', 10) || null;

  // Live subscriber count → live price (only if an API key is configured).
  if (env.YT_API_KEY) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${env.YT_API_KEY}`
      );
      const j = await r.json();
      const c = j?.items?.[0]?.statistics?.subscriberCount;
      if (c != null) {
        subCount = parseInt(c, 10);
        reviewPrice = priceForSubs(subCount);   // live price wins over manual override
      }
    } catch (_) { /* fall back to manual/default */ }
  }

  if (reviewPrice == null) reviewPrice = TIERS[0][1];   // launch floor

  return new Response(
    JSON.stringify({
      clientId:       env.GOOGLE_CLIENT_ID || '',
      channelId,
      subCount,
      reviewPriceGbp: reviewPrice,
      kofiUrl:        env.KOFI_URL || 'https://ko-fi.com/jimmynjoe',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        // short cache so a daily sub-count change reflects within the hour
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
