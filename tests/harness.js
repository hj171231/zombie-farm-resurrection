/* Test harness for Zombie Farm Resurrection.
   Extracts the game's <script> from index.html and runs it in a Node VM
   with DOM stubs — no code duplication, tests always exercise the real game.

   loadGame({visual:false}) -> { G, ctx, els, run }
     G:   the game's internals (state, data tables, logic fns, get/set for lets)
     els: registry of stubbed DOM elements (inspect innerHTML, style, ...)
     run: eval extra code inside the game's VM context

   visual:true swaps canvas stubs for real @napi-rs/canvas canvases so
   render functions produce actual pixels. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HTML_PATH = path.join(__dirname, "..", "index.html");

// The snippet appended to the game script: exports lexical (const/let)
// bindings that don't land on the VM's global object.
const EXPORT_SNIPPET = `
globalThis.__game = {
  // data tables & constants
  CROPS, ZTYPES, TREES, TARGETS, GOALS, ZNAMES,
  GRID, MAX_Z, INVADE_MIN, INVADE_CD, PLOW_COST, DAY_LEN,
  // state (let bindings need accessors)
  get S(){ return S; }, set S(v){ S = v; },
  get scene(){ return scene; }, set scene(v){ scene = v; },
  get B(){ return B; }, set B(v){ B = v; },
  get plantMode(){ return plantMode; },
  get shovelMode(){ return shovelMode; }, set shovelMode(v){ shovelMode = v; },
  get W(){ return W; }, get H(){ return H; },
  get TW(){ return TW; }, get TH(){ return TH; },
  get ISOX(){ return ISOX; }, get ISOY(){ return ISOY; },
  cv, cx,
  // logic
  freshState, save, load, sanitizeState, backupSave, startGame, BUILD,
  encodeSave, decodeSave,
  xpNeeded, gainXP, calcLF, neighbors, growthInfo, fmtTime,
  cellXY, tileAt, layout, resize, randRoamPos, inFieldDiamond, roamTargetFrom, pathAvoidsField,
  tapTile, plantAt, harvest, setPlantMode, clearPlantMode, checkGoals, hud,
  startBattle, sendZombie, updateBattle, endBattle, battleTap, openSquadPicker, MAX_ACTIVE,
  renameZombie, releaseZombie, mutTier, openAlmanac, pairKey, pairRaised, SQUAD_MAX, mutationChance, zdefFor,
  screenToWorld, zoomAt, resetCam, clampCam,
  get camZ(){ return camZ; }, set camZ(v){ camZ = v; },
  get camCX(){ return camCX; }, get camCY(){ return camCY; },
  gardenerTick, hungerTick, healTick, SPRITES, preloadSprites,
  // art (for visual smoke tests)
  drawSplash, drawFarm, drawBattle, drawZombie, drawZHead, drawProduce, drawCropPlot,
  drawTree, drawGravestone, iconDataURL,
  // test helpers
  setRandom(fn){ const orig = Math.random; Math.random = fn; return () => { Math.random = orig; }; }
};
`;

function extractScript() {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("could not find <script> in index.html");
  return m[1];
}

function makeStubEl(id) {
  return {
    id,
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    innerHTML: "",
    textContent: "",
    disabled: false,
    appendChild() {},
    addEventListener() {},
    focus() {},
    select() {},
    setSelectionRange() {},
    onclick: null,
  };
}

function makeStubCtx() {
  const grad = { addColorStop() {} };
  const target = {};
  return new Proxy(target, {
    get(t, k) {
      if (k === "canvas") return { width: 0, height: 0 };
      if (k === "measureText") return () => ({ width: 10 });
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => grad;
      if (k === "createPattern") return () => null;
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (k in t) return t[k];
      return () => {}; // every canvas method is a no-op
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function makeStubCanvas(id) {
  const el = makeStubEl(id);
  el.width = 300; el.height = 150;
  const ctx = makeStubCtx();
  el.getContext = () => ctx;
  el.toDataURL = () => "data:image/png;base64,stub";
  return el;
}

function loadGame(opts = {}) {
  const visual = !!opts.visual;
  let createCanvas = null;
  if (visual) ({ createCanvas } = require("@napi-rs/canvas"));

  const els = {}; // id -> element registry

  function makeRealCanvas(id, w, h) {
    const c = createCanvas(w, h);
    // the game treats canvases as DOM elements; graft on what it touches
    c.style = {};
    c.addEventListener = () => {};
    c.id = id;
    return c;
  }

  function elementFor(id) {
    if (els[id]) return els[id];
    let el;
    if (id === "cv") el = visual ? makeRealCanvas("cv", 900, 700) : makeStubCanvas("cv");
    else if (id === "splashArt") el = visual ? makeRealCanvas("splashArt", 680, 240) : makeStubCanvas("splashArt");
    else el = makeStubEl(id);
    els[id] = el;
    return el;
  }

  const storage = new Map();
  const sandbox = {
    document: {
      getElementById: (id) => elementFor(id),
      createElement: (tag) => (tag === "canvas"
        ? (visual ? makeRealCanvas("anon", 64, 64) : makeStubCanvas("anon"))
        : makeStubEl(tag)),
      addEventListener() {},
      fonts: undefined,
    },
    window: {
      addEventListener() {},
      innerWidth: 900,
      innerHeight: 700,
      devicePixelRatio: 1,
      AudioContext: undefined,
      webkitAudioContext: undefined,
    },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    navigator: { clipboard: { writeText: async () => {} } },
    location: { protocol: "http:", reload() {} },
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => 0,
    setInterval: () => 0,
    setTimeout: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    confirm: () => true,
    prompt: () => null,
    alert: () => {},
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    console,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  const script = extractScript() + "\n" + EXPORT_SNIPPET;
  vm.runInContext(script, sandbox, { filename: "index.html#script" });

  return {
    G: sandbox.__game,
    ctx: sandbox,
    els,
    storage,
    run: (code) => vm.runInContext(code, sandbox),
  };
}

module.exports = { loadGame, extractScript };
