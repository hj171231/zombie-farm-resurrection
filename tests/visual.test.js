/* Visual smoke tests for Zombie Farm Resurrection.
   Renders real PNG frames with @napi-rs/canvas through the game's own
   draw functions. Catches layout bugs, blank screens, and art regressions.
   Frames are written to tests/out/ for eyeballing.
   Usage: node tests/visual.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const { loadGame } = require("./harness");
const { createCanvas } = require("@napi-rs/canvas");

const OUT_DIR = path.join(__dirname, "out");
fs.mkdirSync(OUT_DIR, { recursive: true });

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { failed++; console.log("  ✗ " + name + "\n      " + (e && e.message)); }
}
function ok(v, msg) { if (!v) throw new Error(msg || "assertion failed"); }

function savePNG(canvas, name) {
  fs.writeFileSync(path.join(OUT_DIR, name), canvas.toBuffer("image/png"));
}
// crude "is something actually drawn here" metric
function uniqueColors(canvas, step = 7) {
  const ctx = canvas.getContext("2d");
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4 * step) {
    seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  }
  return seen.size;
}
function pixelAt(canvas, x, y) {
  const d = canvas.getContext("2d").getImageData(x, y, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] };
}

console.log("\n== visual smoke tests (rendering real frames) ==");

const inst = loadGame({ visual: true });
const G = inst.G;

check("splash scene renders (moon, fence, zombie parade)", () => {
  G.drawSplash();
  const c = inst.els["splashArt"];
  savePNG(c, "splash.png");
  ok(uniqueColors(c) > 25, "splash too flat: " + uniqueColors(c) + " colors");
});

check("farm frame renders with crops, tree, gravestone, roaming zombie", () => {
  // pin the in-game clock to mid-day: dayPhase() is wall-clock based, and a
  // frame rendered at in-game night is (correctly!) tinted dark — flaky test.
  inst.run(`(function(){
    var base = Date.now();
    var phase = (base/1000 % 240) / 240;
    var frozen = base + Math.round((0.30 - phase) * 240 * 1000);
    Date.now = function(){ return frozen; };
  })()`);
  G.startGame(null);
  G.S.gold = 100000; G.S.level = 99; // afford + unlock everything
  // dress the farm: various growth stages across the field
  const plant = (i, kind, id, backSec) => {
    G.S.tiles[i] = { st: "plot" };
    G.plantAt(i, kind, id);
    if (backSec) G.S.tiles[i].at = Date.now() - backSec * 1000;
  };
  plant(8, "crop", "carrot", 21);      // ripe
  plant(10, "crop", "corn", 20);       // mid-growth
  plant(16, "crop", "pumpkin", 5);     // sprout
  plant(22, "crop", "melon", 200);     // mid
  plant(24, "zombie", "shambler", 10); // gravestone, hand emerging
  plant(30, "tree", "oak");
  G.S.tiles[38] = { st: "plot" };      // empty plot
  G.S.zombies.push({ type: "gardener", name: "Gus", pow: 2, hp: 16, maxhp: 16, spd: 1, hunger: 50, x: G.W * 0.4, y: G.H * 0.55, tx: G.W * 0.4, ty: G.H * 0.55, wob: 2, mut: [{ label: "Speedy", col: "#ff8c2e" }], kills: 0 });
  G.drawFarm(0.016);
  const c = G.cv;
  savePNG(c, "farm.png");
  ok(uniqueColors(c) > 60, "farm too flat: " + uniqueColors(c) + " colors");
  // center of the field must be dirt, not void
  const mid = pixelAt(c, Math.round(G.ISOX), Math.round(G.ISOY + 3.5 * G.TH));
  ok(mid.r > mid.b, "field center should be brownish, got " + JSON.stringify(mid));
});

check("battle frame renders (building, defender, marching zombie)", () => {
  G.S.zombies = [];
  for (let k = 0; k < 6; k++) G.S.zombies.push({ type: "shambler", name: "Z" + k, pow: 5, hp: 22, maxhp: 22, spd: 1, hunger: 100, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
  G.startBattle(G.TARGETS[2]); // pirate cove
  for (let s = 0; s < 40; s++) G.updateBattle(0.05); // let a zombie march in
  G.drawBattle(0.016);
  savePNG(G.cv, "battle-pirate.png");
  ok(uniqueColors(G.cv) > 40, "battle too flat");
  G.scene = "farm"; G.B = null;
});

check("every battle target scene renders without throwing", () => {
  G.TARGETS.forEach(t => {
    G.S.zombies = [{ type: "shambler", name: "Solo", pow: 5, hp: 22, maxhp: 22, spd: 1, hunger: 100, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 }];
    G.startBattle(t);
    G.updateBattle(0.05);
    G.drawBattle(0.016);
    G.scene = "farm"; G.B = null;
  });
});

check("all 6 single mutations + all 15 pairs render uniquely (21 combos)", () => {
  const MUTS = [
    { label: "Speedy", col: "#ff8c2e" },
    { label: "Kernel-Powered", col: "#ffd94d" },
    { label: "Gourd-Headed", col: "#ff7f1e" },
    { label: "Sporified", col: "#c98ee0" },
    { label: "Flaming", col: "#e03c2e" },
    { label: "Moon-Touched", col: "#8ee0b0" },
  ];
  const combos = [];
  for (let a = 0; a < 6; a++) {
    combos.push([MUTS[a]]);
    for (let b = a + 1; b < 6; b++) combos.push([MUTS[a], MUTS[b]]);
  }
  ok(combos.length === 21, "expected 21 combos");
  const zd = G.ZTYPES.find(t => t.id === "shambler");
  const sheet = createCanvas(7 * 90, 3 * 110);
  const sg = sheet.getContext("2d");
  sg.fillStyle = "#3a5522"; sg.fillRect(0, 0, sheet.width, sheet.height);
  const imgs = combos.map((muts, k) => {
    const cell = createCanvas(90, 110);
    const g = cell.getContext("2d");
    G.drawZombie(g, 45, 100, 0.9, zd, muts, 1, 0.5, true);
    sg.drawImage(cell, (k % 7) * 90, Math.floor(k / 7) * 110);
    return { name: muts.map(m => m.label).join("+"), d: g.getImageData(0, 0, 90, 110).data };
  });
  savePNG(sheet, "mutations-21.png");
  // every pair must differ by >=50 strongly-different pixels (delta>40 in a channel)
  // — guards against a mutation's visual zone being hidden or two combos converging
  const MIN_DIFF = 50;
  for (let i = 0; i < imgs.length; i++) {
    for (let j = i + 1; j < imgs.length; j++) {
      const a = imgs[i].d, b = imgs[j].d;
      let n = 0;
      for (let p = 0; p < a.length; p += 4) {
        if (Math.abs(a[p] - b[p]) > 40 || Math.abs(a[p + 1] - b[p + 1]) > 40 || Math.abs(a[p + 2] - b[p + 2]) > 40) n++;
      }
      ok(n >= MIN_DIFF, imgs[i].name + " vs " + imgs[j].name + " differ by only " + n + "px (need " + MIN_DIFF + ")");
    }
  }
});

check("all 7 zombie types render (incl. headless carrying head, gardener hat)", () => {
  const sheet = createCanvas(7 * 100, 120);
  const g = sheet.getContext("2d");
  g.fillStyle = "#3a5522"; g.fillRect(0, 0, sheet.width, sheet.height);
  G.ZTYPES.forEach((zd, k) => {
    G.drawZombie(g, 50 + k * 100, 110, 0.9, zd, [], 1, k * 0.3, k % 2 === 0);
  });
  savePNG(sheet, "zombie-types.png");
  ok(uniqueColors(sheet) > 20);
});

check("all 6 produce + 3 trees + 3 gravestone shapes render", () => {
  const sheet = createCanvas(12 * 70, 100);
  const g = sheet.getContext("2d");
  g.fillStyle = "#6a5228"; g.fillRect(0, 0, sheet.width, sheet.height);
  G.CROPS.forEach((c, k) => G.drawProduce(g, c.id, 35 + k * 70, 55, 26));
  G.TREES.forEach((t, k) => G.drawTree(g, t, 35 + (6 + k) * 70, 88, 22));
  for (let k = 0; k < 3; k++) G.drawGravestone(g, 35 + (9 + k) * 70, 80, 40, 1, 0, k);
  savePNG(sheet, "produce-trees-graves.png");
  ok(uniqueColors(sheet) > 15);
});

check("market icons (cursor data URLs) generate for every plantable", () => {
  const all = [
    ...G.CROPS.map(c => ["crop", c.id]),
    ...G.TREES.map(t => ["tree", t.id]),
    ...G.ZTYPES.map(z => ["zombie", z.id]),
    ["shovel", null],
  ];
  all.forEach(([kind, id]) => {
    const url = G.iconDataURL(kind, id, 40);
    ok(url && url.startsWith("data:image/png"), kind + "/" + id + " icon failed");
  });
});

console.log("\n----------------------------------");
console.log("visual: " + passed + " passed, " + failed + " failed");
console.log("frames written to tests/out/");
if (failed > 0) process.exit(1);
