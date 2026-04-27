import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const source = await readFile(new URL("./src/worker.js", import.meta.url), "utf8");
const worker = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function kv(initial = []) {
  let value = initial;
  return {
    async get(_key, type) {
      return type === "json" ? value : JSON.stringify(value);
    },
    async put(_key, next) {
      value = JSON.parse(next);
    },
    dump() {
      return value;
    }
  };
}

function rewireRequest(prompt = "submarine OCR casino terminal sonar") {
  return new Request("https://gitbuck-rewire.test/rewire", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "origin": "https://starbuck100.github.io"
    },
    body: JSON.stringify({ prompt, mode: "media", world: "terminal" })
  });
}

async function testServaFirst() {
  let openRouterCalled = false;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("openrouter")) openRouterCalled = true;
    assert.equal(href, "https://serva.example/v1/serva/sites/gitbuck/rewire");
    return new Response(JSON.stringify({
      ok: true,
      generation: {
        id: "serva-id",
        createdAt: "2026-04-27T00:00:00Z",
        mode: "media",
        palette: "blueprint",
        scene: "mediaScope",
        layout: "deck",
        energy: "pulse",
        versionTitle: "Submarine OCR Sonar",
        assetPrompt: "submarine OCR sonar casino terminal control room, no text",
        headline: "Submarine OCR sonar terminal",
        lede: "Submarine OCR sonar casino terminal room.",
        hudTitle: "Submarine OCR",
        hudCopy: "Casino terminal sonar and OCR signals are visible.",
        cards: [
          { tag: "01 / OCR", title: "OCR sonar", copy: "Submarine casino terminal OCR." },
          { tag: "02 / Sonar", title: "Sonar terminal", copy: "Submarine OCR casino." },
          { tag: "03 / Casino", title: "Casino scope", copy: "Terminal sonar OCR." },
          { tag: "04 / Proof", title: "Prompt fit", copy: "Submarine OCR casino terminal sonar." }
        ],
        systemsTitle: "Submarine OCR stack",
        systemsCopy: "Sonar terminal casino pipeline.",
        proofTitle: "Prompt terms landed",
        proofCopy: "Submarine OCR casino terminal sonar.",
        manifesto: "The room dives under the terminal."
      },
      promptScore: { score: 1 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const store = kv([]);
  const response = await worker.default.fetch(rewireRequest(), {
    SITE_ORIGIN: "https://starbuck100.github.io",
    SERVA_BASE_URL: "https://serva.example",
    SERVA_SITE_TOKEN: "secret",
    GITBUCK_GENERATIONS: store
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider, "serva");
  assert.equal(body.generation.id, "serva-id");
  assert.equal(body.library.length, 1);
  assert.equal(openRouterCalled, false);
}

async function testFallbackKeepsLibraryAtSeven() {
  globalThis.fetch = async () => {
    throw new Error("network should not be called");
  };
  const existing = Array.from({ length: 7 }, (_, index) => ({
    id: `old-${index}`,
    createdAt: new Date(1770000000000 + index).toISOString(),
    mode: "agents",
    versionTitle: `Old ${index}`,
    hudTitle: `Old ${index}`
  }));
  const store = kv(existing);
  const response = await worker.default.fetch(rewireRequest("local fallback gpu ops dashboard"), {
    SITE_ORIGIN: "https://starbuck100.github.io",
    GITBUCK_GENERATIONS: store
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider, "fallback");
  assert.equal(body.library.length, 7);
  assert.equal(store.dump().length, 7);
}

await testServaFirst();
await testFallbackKeepsLibraryAtSeven();
console.log("worker tests ok");
