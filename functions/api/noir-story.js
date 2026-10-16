/* /api/noir-story?series=<slug> — the story map for the JnJ Noir player.

   The full map (every node's video) lives in functions/_noir/<series>.json, which Pages never serves as a
   static file. Founders (valid noir_f cookie from /api/noir-unlock) get it whole. Everyone else gets the free
   nodes complete and the rest stripped to id / day / title / ending — enough to draw the map's shape, no video. */

import { json } from '../_lib/guard.js';
import { founderFromCookie } from './noir-unlock.js';
import tenGrand from '../_noir/ten-grand-a-night.json';

const STORIES = { 'ten-grand-a-night': tenGrand };

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('series') || 'ten-grand-a-night';
  const story = STORIES[slug];
  if (!story) return json({ error: 'no such story' }, 404);
  const founder = await founderFromCookie(request, env);
  const nodes = story.nodes.map((n) => {
    if (founder || n.free) return n;
    return { id: n.id, day: n.day, title: n.title, free: false, ending: !!n.ending, locked: true,
             choices: (n.choices || []).map((c) => ({ label: c.label, next: c.next })) };
  });
  const { _notes, ...pub } = story;
  return json({ ...pub, nodes, founder, series_list: Object.keys(STORIES) });
}
