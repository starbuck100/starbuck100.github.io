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

The page can call OpenRouter through a Cloudflare Worker in `worker/`.
Do not put the OpenRouter key into browser JavaScript.

```bash
cd worker
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

After deployment, point the page at the Worker endpoint:

```js
localStorage.setItem("gitbuck:rewire-endpoint", "https://YOUR-WORKER.workers.dev/rewire")
```

The client only applies schema-validated text fields and fixed modes.
