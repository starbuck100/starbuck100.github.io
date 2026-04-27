# starbuck100.github.io

Public profile site for GitBuck / starbuck100.

The previous portfolio copy was replaced. The current page is a static GitHub Pages site with:

- a full-screen Three.js hero scene
- interactive mode switching
- animated reveal states and pointer-reactive cards
- current positioning around agent workflows, local AI operations, media pipelines, and terminal-native tools

## Run locally

Open `index.html` directly for the static fallback, or serve the folder so the ES module import works:

```bash
python -m http.server 4173
```

GitHub Pages serves from `main:/`.

## Optional AI rewire proxy

The page calls a Cloudflare Worker in `worker/`. The Worker validates origin,
stores the last seven generations in KV, and can use Serva first before falling
back to OpenRouter or a local schema-safe fallback. Do not put provider keys or
Serva tokens into browser JavaScript.

```bash
cd worker
npx wrangler login
npx wrangler secret put SERVA_SITE_TOKEN
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

Useful Worker variables:

```text
SERVA_BASE_URL       Private Serva tunnel/access URL, for example https://serva.example/v1
SERVA_SITE_TOKEN     Secret shared with Serva site routes
SERVA_TIMEOUT_MS     Optional upstream timeout
SERVA_GENERATE_ASSETS=true  Optional image asset generation through Serva
```

OpenRouter remains optional fallback. If neither Serva nor OpenRouter is
available, the Worker returns a deterministic local rewrite that still passes
the same schema.

After deployment, point the page at the Worker endpoint:

```js
localStorage.setItem("gitbuck:rewire-endpoint", "https://YOUR-WORKER.workers.dev/rewire")
```

The client only applies schema-validated text fields and fixed modes.
If the Worker returns a trusted `assetUrl`, the page previews it in the rewire
result; model-generated URLs are not accepted directly.
