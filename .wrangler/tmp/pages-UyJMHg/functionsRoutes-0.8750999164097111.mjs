import { onRequestPost as __api_faces_moderate_js_onRequestPost } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/faces/moderate.js"
import { onRequestGet as __api_brightside_config_js_onRequestGet } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/brightside-config.js"
import { onRequestGet as __api_brightside_submissions_js_onRequestGet } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/brightside-submissions.js"
import { onRequestOptions as __api_brightside_submit_js_onRequestOptions } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/brightside-submit.js"
import { onRequestPost as __api_brightside_submit_js_onRequestPost } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/brightside-submit.js"
import { onRequestGet as __api_plays_js_onRequestGet } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/plays.js"
import { onRequestPost as __api_plays_js_onRequestPost } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/plays.js"
import { onRequestGet as __api_scores_js_onRequestGet } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/scores.js"
import { onRequestPost as __api_scores_js_onRequestPost } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/scores.js"
import { onRequest as __api_faces_js_onRequest } from "/Users/jimmyjoe/jim-joe-ai/jnjarcade-games/functions/api/faces.js"

export const routes = [
    {
      routePath: "/api/faces/moderate",
      mountPath: "/api/faces",
      method: "POST",
      middlewares: [],
      modules: [__api_faces_moderate_js_onRequestPost],
    },
  {
      routePath: "/api/brightside-config",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_brightside_config_js_onRequestGet],
    },
  {
      routePath: "/api/brightside-submissions",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_brightside_submissions_js_onRequestGet],
    },
  {
      routePath: "/api/brightside-submit",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_brightside_submit_js_onRequestOptions],
    },
  {
      routePath: "/api/brightside-submit",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_brightside_submit_js_onRequestPost],
    },
  {
      routePath: "/api/plays",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_plays_js_onRequestGet],
    },
  {
      routePath: "/api/plays",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_plays_js_onRequestPost],
    },
  {
      routePath: "/api/scores",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_scores_js_onRequestGet],
    },
  {
      routePath: "/api/scores",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_scores_js_onRequestPost],
    },
  {
      routePath: "/api/faces",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_faces_js_onRequest],
    },
  ]