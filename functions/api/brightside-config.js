/* GET /api/brightside-config — returns public config for the submission page.
   Secrets set in CF Pages dashboard:
     GOOGLE_CLIENT_ID  — OAuth 2.0 client ID (youtube.readonly scope)
   Public vars (can be in wrangler.toml [vars] or dashboard):
     YT_CHANNEL_ID     — UC61SJtnVHwbSCJ7YbNo87fw
*/
export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      clientId:  env.GOOGLE_CLIENT_ID  || '',
      channelId: env.YT_CHANNEL_ID     || 'UC61SJtnVHwbSCJ7YbNo87fw',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
