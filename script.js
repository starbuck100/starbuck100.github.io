import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const modes = {
  agents: {
    color: "#ff9d54",
    title: "Agent build loop",
    copy: "Plan, edit, test, review, remember, and hand off without losing the thread."
  },
  media: {
    color: "#55a8ff",
    title: "Media intelligence",
    copy: "Transcripts, OCR, frame samples, and audio stems stay linked to source evidence."
  },
  ops: {
    color: "#b7e077",
    title: "Local AI operations",
    copy: "Windows control surfaces, remote workers, GPU services, and clean recovery paths."
  },
  terminal: {
    color: "#f19bbd",
    title: "Terminal products",
    copy: "Status lines, TUI scenes, CLI affordances, and visual verification for real tools."
  }
};

const visualPalettes = {
  sunset: {
    active: "#ff9d54",
    paper: "#f3dcc7",
    paperHot: "#fff1cd",
    ink: "#171019",
    muted: "#88716f",
    line: "rgba(255, 232, 205, 0.24)",
    bg: "#0b0910",
    hot: "#ffe4bd",
    sparkle: "#ffd9b0"
  },
  blueprint: {
    active: "#55a8ff",
    paper: "#d8e8f7",
    paperHot: "#edf7ff",
    ink: "#07131d",
    muted: "#5d7182",
    line: "rgba(178, 221, 255, 0.28)",
    bg: "#06111d",
    hot: "#e6f5ff",
    sparkle: "#9ed2ff"
  },
  greenroom: {
    active: "#b7e077",
    paper: "#e4ecd0",
    paperHot: "#f9ffd8",
    ink: "#14180f",
    muted: "#6d765f",
    line: "rgba(214, 240, 171, 0.28)",
    bg: "#0c1209",
    hot: "#f4ffbf",
    sparkle: "#d8ff96"
  },
  rosecrt: {
    active: "#f19bbd",
    paper: "#f0d6dc",
    paperHot: "#fff0f0",
    ink: "#1b0d16",
    muted: "#8b6b78",
    line: "rgba(255, 202, 225, 0.3)",
    bg: "#120810",
    hot: "#ffe4ec",
    sparkle: "#ffbdd8"
  },
  amber: {
    active: "#ffc857",
    paper: "#ead8b6",
    paperHot: "#fff3c0",
    ink: "#191108",
    muted: "#846f53",
    line: "rgba(255, 222, 158, 0.28)",
    bg: "#100b06",
    hot: "#ffecaa",
    sparkle: "#ffd36a"
  }
};

const sceneProfiles = {
  orbital: { geometry: "ico", nodeLayout: "orbit", ring: 1, cameraZ: 8.4 },
  terminalGrid: { geometry: "box", nodeLayout: "grid", ring: 0.72, cameraZ: 7.6 },
  mediaScope: { geometry: "knot", nodeLayout: "helix", ring: 1.15, cameraZ: 8.9 },
  opsTower: { geometry: "dodeca", nodeLayout: "tower", ring: 0.92, cameraZ: 8.1 },
  constellation: { geometry: "sphere", nodeLayout: "constellation", ring: 1.28, cameraZ: 9.2 }
};

const energyLevels = {
  calm: 0.7,
  pulse: 1.08,
  rush: 1.48
};

const REWIRE_ENDPOINT = window.GITBUCK_REWIRE_ENDPOINT
  || localStorage.getItem("gitbuck:rewire-endpoint")
  || "https://gitbuck-rewire.starbuck1912.workers.dev/rewire";

const worldScenes = {
  window: {
    mode: "agents",
    title: "Move through the room. The system changes with you.",
    copy: "Start at the window, drop into the agent deck, pass the media bench, then land at the terminal surface."
  },
  agents: {
    mode: "agents",
    title: "The agent deck comes online.",
    copy: "The room stops being a backdrop and becomes an operating loop: plan, edit, test, review, remember."
  },
  media: {
    mode: "media",
    title: "The media bench keeps evidence attached.",
    copy: "Transcripts, OCR, frame samples, stems, and source media stay connected while the scroll moves deeper."
  },
  terminal: {
    mode: "terminal",
    title: "The terminal surface becomes the product.",
    copy: "The last station is the usable surface: status lines, TUIs, compact controls, and visual verification."
  }
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector("#stage3d");
const modeTitle = document.querySelector("#modeTitle");
const modeCopy = document.querySelector("#modeCopy");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const rewireForm = document.querySelector("#rewireForm");
const rewirePrompt = document.querySelector("#rewirePrompt");
const rewireStatus = document.querySelector("#rewireStatus");
const rewireResult = document.querySelector("#rewireResult");
const rewireResultTitle = document.querySelector("#rewireResultTitle");
const rewireResultCopy = document.querySelector("#rewireResultCopy");
const rewireAssetBrief = document.querySelector("#rewireAssetBrief");
const rewireAssetImage = document.querySelector("#rewireAssetImage");
const generationList = document.querySelector("#generationList");
const heroTitle = document.querySelector("#hero-title");
const heroLede = document.querySelector(".lede");
const playBand = document.querySelector("#play");
const playTitle = document.querySelector("#play-title");
const playCopy = document.querySelector("#play-copy");
const worldTitle = document.querySelector("#world-title");
const worldCopy = document.querySelector("#world-copy");
const workKicker = document.querySelector("#work .section-kicker");
const workTitle = document.querySelector("#work-title");
const workCards = [...document.querySelectorAll(".work-card")];
const systemsTitle = document.querySelector("#systems-title");
const systemsCopy = document.querySelector(".systems-copy > p:not(.section-kicker)");
const proofTitle = document.querySelector("#proof-title");
const proofCopy = document.querySelector(".proof-copy > p:not(.section-kicker)");
const manifestoCopy = document.querySelector(".manifesto p");
const pointer = { x: 0, y: 0, active: false };
const clock = new THREE.Clock();

let renderer;
let scene;
let camera;
let rig;
let core;
let ringOne;
let ringTwo;
let nodeGroup;
let sparkles;
let connectorLines;
let activeColor = new THREE.Color(modes.agents.color);
let visualState = { palette: "sunset", scene: "orbital", layout: "split", energy: "pulse" };
let worldProgress = 0;
let currentWorld = "";
let modeLockUntil = 0;
let savedGenerations = [];

initInterface();
initScene();
animate();

function initInterface() {
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  if (rewireForm) {
    rewireForm.addEventListener("submit", handleRewireSubmit);
  }
  generationList?.addEventListener("click", handleGenerationLibraryClick);
  loadGenerations();

  initWorldTour();

  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--ry", `${x * 7}deg`);
      card.style.setProperty("--rx", `${y * -7}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.16 });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / window.innerWidth - 0.5;
    pointer.y = event.clientY / window.innerHeight - 0.5;
    pointer.active = true;
  }, { passive: true });
}

async function handleRewireSubmit(event) {
  event.preventDefault();
  const prompt = (rewirePrompt?.value || "").trim();
  if (!prompt) {
    setRewireStatus("Give the room a direction first.");
    return;
  }
  setRewireStatus("Rewiring the room...");
  const request = {
    prompt,
    mode: document.body.dataset.mode || "agents",
    world: document.body.dataset.world || "window"
  };
  try {
    const result = await fetchRewire(request);
    const status = result.source === "serverFallback"
      ? "Worker model timeout; server fallback used the same validated schema."
      : "Model rewire applied. Output was schema-validated before touching the page.";
    applyRewire(result, status);
  } catch (error) {
    const fallback = localRewire(request);
    applyRewire(fallback, "Proxy unavailable, so a local safe fallback rewired the page. Deploy the Worker to use OpenRouter live.");
  }
}

async function fetchRewire(request) {
  if (!REWIRE_ENDPOINT) {
    throw new Error("rewire endpoint not configured");
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 52000);
  try {
    const response = await fetch(REWIRE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`rewire ${response.status}`);
    const payload = await response.json();
    if (Array.isArray(payload.library)) {
      renderGenerationLibrary(payload.library);
    }
    return validateRewire(payload.generation || payload);
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadGenerations() {
  if (!generationList || !REWIRE_ENDPOINT) return;
  const endpoint = generationsEndpoint();
  if (!endpoint) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) return;
    const payload = await response.json();
    renderGenerationLibrary(payload.generations || payload.library || []);
  } catch {
    renderGenerationLibrary(savedGenerations);
  } finally {
    window.clearTimeout(timeout);
  }
}

function generationsEndpoint() {
  try {
    const endpoint = new URL(REWIRE_ENDPOINT, window.location.href);
    endpoint.pathname = endpoint.pathname.replace(/\/rewire\/?$/, "/generations");
    return endpoint.toString();
  } catch {
    return "";
  }
}

function renderGenerationLibrary(list) {
  if (!generationList) return;
  savedGenerations = (Array.isArray(list) ? list : [])
    .map(validateRewire)
    .filter((item) => item.id)
    .slice(0, 7);
  generationList.replaceChildren();
  if (!savedGenerations.length) {
    const empty = document.createElement("p");
    empty.className = "library-empty";
    empty.textContent = "No saved room versions yet.";
    generationList.append(empty);
    return;
  }
  savedGenerations.forEach((generation, index) => {
    const button = document.createElement("button");
    button.className = "generation-card";
    button.type = "button";
    button.dataset.generationId = generation.id;
    button.setAttribute("aria-label", `Restore ${generation.versionTitle}`);

    const meta = document.createElement("span");
    meta.textContent = `${String(index + 1).padStart(2, "0")} / ${formatGenerationTime(generation.createdAt)} / ${generation.mode}`;

    const title = document.createElement("strong");
    title.textContent = generation.versionTitle;

    const prompt = document.createElement("p");
    prompt.textContent = generation.prompt || generation.artDirection;

    const chips = document.createElement("small");
    chips.textContent = `${generation.palette} / ${generation.scene} / ${generation.energy}`;

    button.append(meta, title, prompt, chips);
    generationList.append(button);
  });
}

function upsertSavedGeneration(generation) {
  const safe = validateRewire(generation);
  if (!safe.id) return;
  renderGenerationLibrary([
    safe,
    ...savedGenerations.filter((item) => item.id !== safe.id)
  ]);
}

function handleGenerationLibraryClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest(".generation-card");
  if (!button) return;
  const generation = savedGenerations.find((item) => item.id === button.dataset.generationId);
  if (!generation) return;
  applyRewire(generation, "Saved generation restored.");
}

function formatGenerationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "saved";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function applyRewire(payload, status) {
  const safe = validateRewire(payload);
  if (heroTitle) heroTitle.textContent = safe.headline;
  if (heroLede) heroLede.textContent = safe.lede;
  if (playTitle) playTitle.textContent = safe.playTitle;
  if (playCopy) playCopy.textContent = safe.playCopy;
  if (worldTitle) worldTitle.textContent = safe.worldTitle;
  if (worldCopy) worldCopy.textContent = safe.worldCopy;
  if (workKicker) workKicker.textContent = safe.workKicker;
  if (workTitle) workTitle.textContent = safe.workTitle;
  applyCards(safe.cards);
  if (systemsTitle) systemsTitle.textContent = safe.systemsTitle;
  if (systemsCopy) systemsCopy.textContent = safe.systemsCopy;
  if (proofTitle) proofTitle.textContent = safe.proofTitle;
  if (proofCopy) proofCopy.textContent = safe.proofCopy;
  if (manifestoCopy) manifestoCopy.textContent = safe.manifesto;
  playCopy?.parentElement?.classList.add("is-ai-patched");
  if (rewireResult) rewireResult.hidden = false;
  if (rewireResultTitle) rewireResultTitle.textContent = safe.hudTitle;
  if (rewireResultCopy) rewireResultCopy.textContent = safe.hudCopy;
  if (rewireAssetBrief) rewireAssetBrief.textContent = safe.assetPrompt;
  if (rewireAssetImage) {
    if (safe.assetUrl) {
      rewireAssetImage.src = safe.assetUrl;
      rewireAssetImage.hidden = false;
    } else {
      rewireAssetImage.removeAttribute("src");
      rewireAssetImage.hidden = true;
    }
  }
  if (safe.id) upsertSavedGeneration(safe);
  if (rewireForm) {
    rewireForm.classList.remove("is-rewired");
    void rewireForm.offsetWidth;
    rewireForm.classList.add("is-rewired");
  }
  modeLockUntil = Date.now() + 6000;
  setMode(safe.mode, false);
  applyVisualState(safe);
  modeTitle.textContent = safe.hudTitle;
  modeCopy.textContent = safe.hudCopy;
  setRewireStatus(`${status} Layout, palette, copy, cards, HUD, and Three.js scene are now patched for this tab.`);
  requestAnimationFrame(() => {
    const scrollTarget = window.innerWidth < 760 ? rewireResult : playBand;
    scrollTarget?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: window.innerWidth < 760 ? "center" : "start"
    });
  });
}

function validateRewire(payload) {
  const allowedModes = new Set(["agents", "media", "ops", "terminal"]);
  const allowedPalettes = new Set(Object.keys(visualPalettes));
  const allowedScenes = new Set(Object.keys(sceneProfiles));
  const allowedLayouts = new Set(["split", "poster", "console", "deck"]);
  const allowedEnergy = new Set(Object.keys(energyLevels));
  const safe = payload && typeof payload === "object" ? payload : {};
  const mode = allowedModes.has(safe.mode) ? safe.mode : "agents";
  const hudTitle = cleanText(safe.hudTitle, 44) || modes[mode].title;
  const lede = cleanText(safe.lede, 220) || "GitBuck is a static lo-fi control surface for agent workflows, local AI operations, media pipelines, and terminal-native tools.";
  const defaultPalette = mode === "media" ? "blueprint" : mode === "ops" ? "greenroom" : mode === "terminal" ? "rosecrt" : "sunset";
  const cardInput = Array.isArray(safe.cards) ? safe.cards.slice(0, 4) : [];
  while (cardInput.length < 4) cardInput.push({});
  const cards = cardInput.map((card, index) => ({
    tag: cleanText(card?.tag, 28) || `${String(index + 1).padStart(2, "0")} / Signal`,
    title: cleanText(card?.title, 58) || workCards[index]?.querySelector("h3")?.textContent || "Live system surface",
    copy: cleanText(card?.copy, 150) || workCards[index]?.querySelector("p")?.textContent || "A safe temporary rewrite changed this card in the open tab."
  }));
  return {
    mode,
    id: cleanText(safe.id, 64),
    prompt: cleanText(safe.prompt, 220),
    createdAt: cleanText(safe.createdAt, 40),
    source: cleanText(safe.source, 20) || "model",
    versionTitle: cleanText(safe.versionTitle, 42) || hudTitle,
    palette: allowedPalettes.has(safe.palette) ? safe.palette : defaultPalette,
    scene: allowedScenes.has(safe.scene) ? safe.scene : mode === "media" ? "mediaScope" : mode === "ops" ? "opsTower" : mode === "terminal" ? "terminalGrid" : "orbital",
    layout: allowedLayouts.has(safe.layout) ? safe.layout : "split",
    energy: allowedEnergy.has(safe.energy) ? safe.energy : "pulse",
    artDirection: cleanText(safe.artDirection, 130) || `${hudTitle} staged as a lo-fi room with tactile controls and visible machine state.`,
    assetPrompt: cleanText(safe.assetPrompt, 240) || `High-fidelity lo-fi anime control room for ${hudTitle}, dusk window light, detailed desk objects, cinematic composition, no text.`,
    assetUrl: safeAssetUrl(safe.assetUrl),
    headline: cleanText(safe.headline, 72) || "I build tools that make agents do real work.",
    lede,
    hudTitle,
    hudCopy: cleanText(safe.hudCopy, 150) || modes[mode].copy,
    playTitle: cleanText(safe.playTitle, 72) || `AI rewire: ${hudTitle}`,
    playCopy: cleanText(safe.playCopy, 190) || lede,
    worldTitle: cleanText(safe.worldTitle, 84) || "The room has been remapped for this prompt.",
    worldCopy: cleanText(safe.worldCopy, 210) || "Scroll again: the same static page now behaves like a different temporary room until the tab reloads.",
    workKicker: cleanText(safe.workKicker, 44) || "Prompt-shaped operating surface",
    workTitle: cleanText(safe.workTitle, 90) || "The visible work grid was rewritten around the prompt.",
    cards,
    systemsTitle: cleanText(safe.systemsTitle, 88) || "The stack rearranges around the new signal.",
    systemsCopy: cleanText(safe.systemsCopy, 210) || "This remains a static GitHub Pages site. The tab only applies whitelisted text fields, layout classes, color tokens, and Three.js presets.",
    proofTitle: cleanText(safe.proofTitle, 88) || "The page proves the model changed more than a label.",
    proofCopy: cleanText(safe.proofCopy, 210) || "Hero, play area, work grid, systems copy, proof copy, palette, layout, and the WebGL rig are all driven by the validated response.",
    manifesto: cleanText(safe.manifesto, 150) || "A static page can still feel alive when the browser owns the transformation."
  };
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/[<>`{}[\]\\]/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength).trim();
  return clipped.replace(/\s+\S*$/, "") || clipped;
}

function safeAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 500) return "";
  try {
    const url = new URL(raw, window.location.href);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function localRewire({ prompt }) {
  const lower = prompt.toLowerCase();
  const mode = lower.includes("video") || lower.includes("ocr") || lower.includes("media") || lower.includes("audio")
    ? "media"
    : lower.includes("terminal") || lower.includes("cli") || lower.includes("tui")
      ? "terminal"
      : lower.includes("server") || lower.includes("gpu") || lower.includes("ops")
        ? "ops"
        : "agents";
  const label = cleanText(prompt, 54) || "agent work";
  const palette = mode === "media" ? "blueprint" : mode === "ops" ? "greenroom" : mode === "terminal" ? "rosecrt" : "amber";
  const scene = mode === "media" ? "mediaScope" : mode === "ops" ? "opsTower" : mode === "terminal" ? "terminalGrid" : "constellation";
  return validateRewire({
    id: makeLocalGenerationId(),
    prompt: label,
    createdAt: new Date().toISOString(),
    source: "localFallback",
    mode,
    versionTitle: titleCase(label, 42),
    palette,
    scene,
    layout: lower.includes("terminal") || lower.includes("cli") ? "console" : lower.includes("poster") || lower.includes("hero") ? "poster" : "deck",
    energy: lower.includes("calm") || lower.includes("slow") ? "calm" : lower.includes("fast") || lower.includes("rush") ? "rush" : "pulse",
    artDirection: `${label} as a lo-fi operator room with prompt-specific props, tactile controls, and visible machine state.`,
    assetPrompt: `High-fidelity lo-fi anime control room for ${label}, window light, physical consoles, detailed desk objects, cinematic composition, no text.`,
    headline: `A new lo-fi room for ${label}.`,
    lede: "The safe fallback now changes text, layout, color tokens, and the Three.js rig with the same client-side guardrails as the model path.",
    hudTitle: modes[mode].title,
    hudCopy: "Whitelisted fields only: no generated HTML, scripts, links, or secrets are applied.",
    playTitle: `Tab rewire: ${modes[mode].title}`,
    playCopy: "Reload the page to reset. Until then, this prompt owns the visible arrangement, cards, palette, and WebGL scene.",
    worldTitle: `Scroll the ${label} room.`,
    worldCopy: "The tour copy and mode state were rewritten in-place while the static document stayed the same.",
    workKicker: "Local safe fallback",
    workTitle: `Four prompt-shaped surfaces for ${label}.`,
    cards: buildFallbackCards(mode, label),
    systemsTitle: "A static shell with a live browser brain.",
    systemsCopy: "OpenRouter can fill the same schema, but this local path proves the browser transformation is already wired end to end.",
    proofTitle: "Visible change, not just status text.",
    proofCopy: "The prompt changes the current tab across section copy, card copy, mode, palette, layout, and the Three.js node field.",
    manifesto: "Reload to reset. Prompt again to make the room mutate in a different direction."
  });
}

function buildFallbackCards(mode, label) {
  const promptTerms = topicTerms(label);
  const themes = promptTerms.length >= 4 ? promptTerms.slice(0, 4) : ({
    agents: ["Planner", "Editor", "Verifier", "Memory"],
    media: ["Transcript", "OCR", "Frames", "Audio"],
    ops: ["GPU", "Worker", "Recovery", "Runbook"],
    terminal: ["Prompt", "Status", "TUI", "Output"]
  }[mode] || ["Signal", "Loop", "Surface", "Proof"]);
  return themes.map((title, index) => ({
    tag: `${String(index + 1).padStart(2, "0")} / ${label.slice(0, 18)}`,
    title: `${titleCase(title, 30)} layer`,
    copy: `Prompt-owned ${label} surface ${index + 1}: the ${title} signal changes copy, layout, palette, and scene without injecting code.`
  }));
}

function makeLocalGenerationId() {
  return window.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function topicTerms(value) {
  const normalized = normalizeForTerms(value);
  const stopwords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "into", "make", "feel",
    "like", "room", "page", "site", "eine", "einen", "einem", "einer", "oder",
    "und", "mit", "fuer", "fur", "aus", "als", "das", "die", "der", "den",
    "dem", "ist", "soll", "sollte", "mach", "mache", "bitte", "mehr", "neue",
    "neuer", "neues", "richtig", "krass", "cool", "style", "seite"
  ]);
  const terms = normalized.match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
  return [...new Set(terms.filter((term) => !stopwords.has(term)))].slice(0, 12);
}

function normalizeForTerms(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value, maxLength) {
  const text = cleanText(value, maxLength)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
  return cleanText(text, maxLength);
}

function applyCards(cards) {
  if (!cards.length) return;
  workCards.forEach((card, index) => {
    const payload = cards[index];
    if (!payload) return;
    const tag = card.querySelector("span");
    const title = card.querySelector("h3");
    const copy = card.querySelector("p");
    if (tag) tag.textContent = payload.tag;
    if (title) title.textContent = payload.title;
    if (copy) copy.textContent = payload.copy;
    card.classList.remove("ai-card-flash");
    void card.offsetWidth;
    card.classList.add("ai-card-flash");
  });
}

function applyVisualState(safe) {
  visualState = {
    palette: safe.palette,
    scene: safe.scene,
    layout: safe.layout,
    energy: safe.energy
  };
  const palette = visualPalettes[safe.palette] || visualPalettes.sunset;
  document.body.classList.add("is-rewired");
  document.body.dataset.palette = safe.palette;
  document.body.dataset.scene = safe.scene;
  document.body.dataset.layout = safe.layout;
  document.body.dataset.energy = safe.energy;
  setCssVar("--active", palette.active);
  setCssVar("--paper", palette.paper);
  setCssVar("--paper-hot", palette.paperHot);
  setCssVar("--ink", palette.ink);
  setCssVar("--muted", palette.muted);
  setCssVar("--line", palette.line);
  setCssVar("--bg", palette.bg);
  activeColor = new THREE.Color(palette.active);
  if (sparkles?.material) {
    sparkles.material.color.set(palette.sparkle);
    sparkles.material.opacity = safe.energy === "rush" ? 0.82 : safe.energy === "calm" ? 0.38 : 0.58;
    sparkles.material.size = safe.energy === "rush" ? 0.035 : 0.025;
  }
  if (ringOne?.material) ringOne.material.color.set(palette.ink);
  if (ringTwo?.material) ringTwo.material.color.set(palette.active);
  if (connectorLines?.material) {
    connectorLines.material.color.set(palette.hot);
    connectorLines.material.opacity = safe.energy === "rush" ? 0.38 : 0.22;
  }
  if (core) {
    const nextGeometry = makeCoreGeometry(sceneProfiles[safe.scene]?.geometry || "ico");
    core.geometry.dispose();
    core.geometry = nextGeometry;
    core.material.emissiveIntensity = safe.energy === "rush" ? 0.62 : safe.energy === "calm" ? 0.22 : 0.42;
  }
  reflowNodeField(safe.scene);
}

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value);
  document.body.style.setProperty(name, value);
}

function setRewireStatus(message) {
  if (rewireStatus) rewireStatus.textContent = message;
}

function applyMode(modeName) {
  const mode = modes[modeName] || modes.agents;
  document.body.dataset.mode = modeName;
  document.documentElement.style.setProperty("--active", mode.color);
  modeTitle.textContent = mode.title;
  modeCopy.textContent = mode.copy;
  activeColor = new THREE.Color(mode.color);

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === modeName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setMode(modeName, useTransition = true) {
  if (document.body.dataset.mode === modeName) return;
  if (useTransition && document.startViewTransition) {
    document.startViewTransition(() => applyMode(modeName));
    return;
  }
  applyMode(modeName);
}

function initWorldTour() {
  const tour = document.querySelector(".world-tour");
  const title = document.querySelector("#world-title");
  const copy = document.querySelector("#world-copy");
  const dots = [...document.querySelectorAll("[data-dot]")];
  const sceneNames = ["window", "agents", "media", "terminal"];
  if (!tour || !title || !copy) return;

  function setWorld(sceneName) {
    const sceneData = worldScenes[sceneName] || worldScenes.window;
    if (currentWorld === sceneName) return;
    currentWorld = sceneName;
    const update = () => {
      document.body.dataset.world = sceneName;
      title.textContent = sceneData.title;
      copy.textContent = sceneData.copy;
      dots.forEach((dot) => {
        const active = dot.dataset.dot === sceneName;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-pressed", String(active));
      });
    };
    update();
    setMode(sceneData.mode, false);
  }

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const rect = tour.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const top = window.scrollY + rect.top;
      const target = top + travel * (index / sceneNames.length + 0.01);
      window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
      setWorld(dot.dataset.dot);
    });
  });

  function updateProgress() {
    if (Date.now() < modeLockUntil) {
      return;
    }
    const rect = tour.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return;
    }
    const travel = Math.max(1, rect.height - window.innerHeight);
    worldProgress = Math.min(1, Math.max(0, -rect.top / travel));
    const index = Math.min(sceneNames.length - 1, Math.floor(worldProgress * sceneNames.length));
    setWorld(sceneNames[index]);
  }
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
}

function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.6, 8.4);

  rig = new THREE.Group();
  scene.add(rig);

  const ambient = new THREE.AmbientLight(0xffead2, 2.8);
  const key = new THREE.PointLight(0xffd49a, 14, 22);
  key.position.set(3.4, 4.2, 5.4);
  const rim = new THREE.PointLight(0x55a8ff, 12, 18);
  rim.position.set(-5, -2, 4);
  scene.add(ambient, key, rim);

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1a101d,
    roughness: 0.42,
    metalness: 0.18,
    emissive: 0x241425,
    emissiveIntensity: 0.16
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: activeColor,
    roughness: 0.35,
    metalness: 0.35,
    emissive: activeColor,
    emissiveIntensity: 0.35
  });
  const hotMat = new THREE.MeshStandardMaterial({
    color: 0xffe4bd,
    roughness: 0.5,
    metalness: 0.08
  });

  core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.06, 1), accentMat);
  core.name = "core";
  rig.add(core);

  ringOne = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.035, 12, 160), darkMat);
  ringTwo = new THREE.Mesh(new THREE.TorusGeometry(2.28, 0.028, 12, 160), accentMat.clone());
  ringOne.rotation.x = Math.PI / 2.6;
  ringTwo.rotation.y = Math.PI / 2.7;
  rig.add(ringOne, ringTwo);

  nodeGroup = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(0.5, 0.28, 0.1);
  const capsuleGeo = new THREE.CapsuleGeometry(0.11, 0.44, 5, 12);
  for (let i = 0; i < 24; i += 1) {
    const geo = i % 3 === 0 ? capsuleGeo : boxGeo;
    const material = (i % 4 === 0 ? accentMat : i % 2 === 0 ? hotMat : darkMat).clone();
    const mesh = new THREE.Mesh(geo, material);
    const angle = (i / 24) * Math.PI * 2;
    const radius = 2.45 + Math.sin(i * 1.7) * 0.55;
    mesh.position.set(Math.cos(angle) * radius, Math.sin(i * 0.9) * 1.05, Math.sin(angle) * radius);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.userData = { angle, radius, speed: 0.22 + Math.random() * 0.4 };
    nodeGroup.add(mesh);
  }
  rig.add(nodeGroup);

  const linePositions = [];
  nodeGroup.children.forEach((mesh) => {
    linePositions.push(0, 0, 0, mesh.position.x, mesh.position.y, mesh.position.z);
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  connectorLines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: 0xffe4bd,
    transparent: true,
    opacity: 0.2
  }));
  rig.add(connectorLines);

  const points = [];
  for (let i = 0; i < 900; i += 1) {
    points.push((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
  }
  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  sparkles = new THREE.Points(sparkleGeo, new THREE.PointsMaterial({
    color: 0xffd9b0,
    size: 0.025,
    transparent: true,
    opacity: 0.5
  }));
  scene.add(sparkles);

  window.addEventListener("resize", resize, { passive: true });
  resize();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const scale = width < 760 ? 0.44 : 1;
  rig.scale.setScalar(scale);
  rig.position.x = width < 760 ? 2.35 : width < 900 ? 0.55 : 1.8;
  rig.position.y = width < 760 ? -1.35 : width < 900 ? -0.45 : 0;
  rig.userData.base = {
    x: rig.position.x,
    y: rig.position.y,
    scale
  };
}

function makeCoreGeometry(kind) {
  switch (kind) {
    case "box":
      return new THREE.BoxGeometry(1.7, 1.05, 0.42, 3, 3, 2);
    case "knot":
      return new THREE.TorusKnotGeometry(0.78, 0.22, 150, 14);
    case "dodeca":
      return new THREE.DodecahedronGeometry(1.06, 0);
    case "sphere":
      return new THREE.SphereGeometry(1.02, 32, 16);
    default:
      return new THREE.IcosahedronGeometry(1.06, 1);
  }
}

function reflowNodeField(sceneName) {
  if (!nodeGroup) return;
  const profile = sceneProfiles[sceneName] || sceneProfiles.orbital;
  const count = Math.max(1, nodeGroup.children.length);
  nodeGroup.children.forEach((mesh, index) => {
    const target = nodeTarget(profile.nodeLayout, index, count);
    mesh.userData.target = target;
    mesh.userData.angle = target.angle;
    mesh.userData.radius = target.radius;
  });
  if (ringOne && ringTwo) {
    ringOne.scale.setScalar(profile.ring);
    ringTwo.scale.setScalar(profile.ring * 1.08);
  }
  if (camera) {
    camera.userData.targetZ = profile.cameraZ;
  }
  updateConnectorLines();
}

function nodeTarget(layout, index, count) {
  const t = index / count;
  const angle = t * Math.PI * 2;
  if (layout === "grid") {
    const column = index % 6;
    const row = Math.floor(index / 6);
    return {
      x: (column - 2.5) * 0.72,
      y: (row - 1.5) * 0.54,
      z: Math.sin(index * 1.7) * 0.45,
      angle,
      radius: 1.8,
      speed: 0.28
    };
  }
  if (layout === "helix") {
    const helixAngle = t * Math.PI * 7;
    const radius = 1.35 + Math.sin(index * 0.9) * 0.28;
    return {
      x: Math.cos(helixAngle) * radius,
      y: (t - 0.5) * 4.1,
      z: Math.sin(helixAngle) * radius,
      angle: helixAngle,
      radius,
      speed: 0.46
    };
  }
  if (layout === "tower") {
    const ring = index % 4;
    const floor = Math.floor(index / 4);
    return {
      x: Math.cos(ring * Math.PI / 2 + floor * 0.22) * (0.75 + floor * 0.08),
      y: (floor - 2.5) * 0.48,
      z: Math.sin(ring * Math.PI / 2 + floor * 0.22) * (0.75 + floor * 0.08),
      angle,
      radius: 1.2 + floor * 0.08,
      speed: 0.34
    };
  }
  if (layout === "constellation") {
    const radius = 1.2 + (index % 5) * 0.42;
    const lift = Math.sin(index * 2.11) * 1.35;
    return {
      x: Math.cos(angle * 2.4) * radius,
      y: lift,
      z: Math.sin(angle * 1.7) * (radius + 0.6),
      angle,
      radius,
      speed: 0.52
    };
  }
  const radius = 2.45 + Math.sin(index * 1.7) * 0.55;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(index * 0.9) * 1.05,
    z: Math.sin(angle) * radius,
    angle,
    radius,
    speed: 0.32
  };
}

function updateConnectorLines() {
  if (!connectorLines || !nodeGroup) return;
  const positions = [];
  nodeGroup.children.forEach((mesh) => {
    const target = mesh.userData.target || mesh.position;
    positions.push(0, 0, 0, target.x, target.y, target.z);
  });
  connectorLines.geometry.dispose();
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  connectorLines.geometry = lineGeo;
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const energy = energyLevels[visualState.energy] || 1;
  const speed = (reducedMotion ? 0.18 : 1) * energy;
  const profile = sceneProfiles[visualState.scene] || sceneProfiles.orbital;
  core.material.color.lerp(activeColor, 0.08);
  core.material.emissive.lerp(activeColor, 0.08);
  ringTwo.material.color.lerp(activeColor, 0.08);
  ringTwo.material.emissive.lerp(activeColor, 0.08);

  const base = rig.userData.base || { x: 1.8, y: 0, scale: 1 };
  const scrollOrbit = Math.sin(worldProgress * Math.PI * 2) * 0.72;
  const scrollLift = Math.sin(worldProgress * Math.PI) * 0.45;
  const targetScale = base.scale * (1 + worldProgress * 0.2 + (energy - 1) * 0.12);
  rig.position.x += (base.x + scrollOrbit - rig.position.x) * 0.035;
  rig.position.y += (base.y + scrollLift - worldProgress * 0.28 - rig.position.y) * 0.035;
  rig.scale.x += (targetScale - rig.scale.x) * 0.035;
  rig.scale.y += (targetScale - rig.scale.y) * 0.035;
  rig.scale.z += (targetScale - rig.scale.z) * 0.035;
  rig.rotation.y += (0.003 + worldProgress * 0.0025) * speed;
  rig.rotation.x += (pointer.y * 0.38 - rig.rotation.x) * 0.045;
  rig.rotation.z += (pointer.x * -0.18 - rig.rotation.z) * 0.04;
  core.rotation.x = elapsed * (profile.nodeLayout === "grid" ? 0.18 : 0.44) * speed;
  core.rotation.y = elapsed * (profile.nodeLayout === "helix" ? 0.92 : 0.62) * speed;
  ringOne.rotation.z = elapsed * 0.28 * speed;
  ringTwo.rotation.x = elapsed * -0.22 * speed;
  sparkles.rotation.y = elapsed * 0.018 * speed;

  nodeGroup.children.forEach((mesh, index) => {
    const phase = elapsed * mesh.userData.speed * speed + mesh.userData.angle;
    const target = mesh.userData.target || mesh.position;
    const bob = Math.sin(phase + index) * 0.08 * energy;
    mesh.position.x += (target.x - mesh.position.x) * 0.055;
    mesh.position.y += (target.y + bob - mesh.position.y) * 0.055;
    mesh.position.z += (target.z - mesh.position.z) * 0.055;
    mesh.rotation.x += 0.006 * speed;
    mesh.rotation.y += 0.004 * speed;
  });

  camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.025;
  camera.position.y += (-pointer.y * 0.5 + 0.6 - camera.position.y) * 0.025;
  camera.position.z += ((camera.userData.targetZ || 8.4) - camera.position.z) * 0.025;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
