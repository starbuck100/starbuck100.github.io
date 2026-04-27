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
let activeColor = new THREE.Color(modes.agents.color);
let worldProgress = 0;
let currentWorld = "";

initInterface();
initScene();
animate();

function initInterface() {
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

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
    const rect = tour.getBoundingClientRect();
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
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: 0xffe4bd,
    transparent: true,
    opacity: 0.2
  }));
  rig.add(lines);

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

function animate() {
  const elapsed = clock.getElapsedTime();
  const speed = reducedMotion ? 0.18 : 1;
  core.material.color.lerp(activeColor, 0.08);
  core.material.emissive.lerp(activeColor, 0.08);
  ringTwo.material.color.lerp(activeColor, 0.08);
  ringTwo.material.emissive.lerp(activeColor, 0.08);

  const base = rig.userData.base || { x: 1.8, y: 0, scale: 1 };
  const scrollOrbit = Math.sin(worldProgress * Math.PI * 2) * 0.72;
  const scrollLift = Math.sin(worldProgress * Math.PI) * 0.45;
  const targetScale = base.scale * (1 + worldProgress * 0.2);
  rig.position.x += (base.x + scrollOrbit - rig.position.x) * 0.035;
  rig.position.y += (base.y + scrollLift - worldProgress * 0.28 - rig.position.y) * 0.035;
  rig.scale.x += (targetScale - rig.scale.x) * 0.035;
  rig.scale.y += (targetScale - rig.scale.y) * 0.035;
  rig.scale.z += (targetScale - rig.scale.z) * 0.035;
  rig.rotation.y += (0.003 + worldProgress * 0.0025) * speed;
  rig.rotation.x += (pointer.y * 0.38 - rig.rotation.x) * 0.045;
  rig.rotation.z += (pointer.x * -0.18 - rig.rotation.z) * 0.04;
  core.rotation.x = elapsed * 0.44 * speed;
  core.rotation.y = elapsed * 0.62 * speed;
  ringOne.rotation.z = elapsed * 0.28 * speed;
  ringTwo.rotation.x = elapsed * -0.22 * speed;
  sparkles.rotation.y = elapsed * 0.018 * speed;

  nodeGroup.children.forEach((mesh, index) => {
    const phase = elapsed * mesh.userData.speed * speed + mesh.userData.angle;
    mesh.position.y += Math.sin(phase + index) * 0.0025 * speed;
    mesh.rotation.x += 0.006 * speed;
    mesh.rotation.y += 0.004 * speed;
  });

  camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.025;
  camera.position.y += (-pointer.y * 0.5 + 0.6 - camera.position.y) * 0.025;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
