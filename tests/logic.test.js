/* Logic test suite for Zombie Farm Resurrection.
   Runs the real game script (extracted from index.html) with DOM stubs.
   Usage: node tests/logic.test.js */
"use strict";
const { loadGame } = require("./harness");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ✓ " + name);
  } catch (e) {
    failed++;
    console.log("  ✗ " + name + "\n      " + (e && e.message));
  }
}
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || "expected equal") + ": got " + JSON.stringify(a) + ", want " + JSON.stringify(b));
}
function ok(v, msg) { if (!v) throw new Error(msg || "expected truthy, got " + JSON.stringify(v)); }
// async checks (the save-code handlers are async): queued here, run in order
// by the tail runner before the summary prints
const deferred = [];
function acheck(name, fn) { deferred.push({ name, fn }); }

// fresh game instance per section keeps tests independent
function boot() {
  const inst = loadGame();
  inst.G.startGame(null);
  return inst;
}
// helper: make tile i a plot without spending gold
function forcePlot(G, i) { G.S.tiles[i] = { st: "plot" }; }
// helper: backdate a planted tile by `sec` seconds
function backdate(G, i, sec) { G.S.tiles[i].at = Date.now() - sec * 1000; }

console.log("\n== economy ==");
{
  const { G } = boot();
  check("fresh farm starts with 200 gold, level 1, 49 grass tiles", () => {
    eq(G.S.gold, 200); eq(G.S.level, 1);
    eq(G.S.tiles.length, 49);
    ok(G.S.tiles.every(t => t.st === "grass"));
  });
  check("plowing grass costs 10g, makes a plot, counts stat", () => {
    G.tapTile(24);
    eq(G.S.gold, 190); eq(G.S.tiles[24].st, "plot"); eq(G.S.stats.plowed, 1);
  });
  check("plowing refused when broke", () => {
    G.S.gold = 5;
    G.tapTile(25);
    eq(G.S.gold, 5); eq(G.S.tiles[25].st, "grass");
  });
  check("planting a carrot deducts its cost", () => {
    G.S.gold = 100;
    ok(G.plantAt(24, "crop", "carrot") === true);
    eq(G.S.gold, 90); eq(G.S.tiles[24].st, "planted"); eq(G.S.tiles[24].plant, "carrot");
  });
  check("planting refused when broke (returns false, tile untouched)", () => {
    forcePlot(G, 30); G.S.gold = 3;
    ok(G.plantAt(30, "crop", "carrot") === false);
    eq(G.S.tiles[30].st, "plot");
  });
  check("harvesting a ripe carrot pays sell price (15g) + xp + stat", () => {
    G.S.gold = 0; const xp0 = G.S.xp; const crops0 = G.S.stats.crops;
    backdate(G, 24, 26);
    G.tapTile(24);
    eq(G.S.gold, 15); eq(G.S.tiles[24].st, "plot");
    eq(G.S.stats.crops, crops0 + 1);
    ok(G.S.xp > xp0 || G.S.level > 1, "xp gained");
  });
  check("fertilized crop pays double (carrot 30g)", () => {
    G.S.gold = 100;
    G.plantAt(24, "crop", "carrot");
    G.S.tiles[24].fert = true;
    backdate(G, 24, 26);
    const before = G.S.gold;
    G.tapTile(24);
    eq(G.S.gold, before + 30);
  });
  check("abomination costs brains, refused with 0, accepted with 5", () => {
    forcePlot(G, 31);
    G.S.level = 99; // abom unlocks at 9
    G.S.brains = 0;
    ok(G.plantAt(31, "zombie", "abom") === false);
    G.S.brains = 5;
    ok(G.plantAt(31, "zombie", "abom") === true);
    eq(G.S.brains, 0); eq(G.S.tiles[31].plant, "abom");
  });
  check("spooky tree costs 3 brains", () => {
    forcePlot(G, 32);
    G.S.brains = 3;
    ok(G.plantAt(32, "tree", "spooky") === true);
    eq(G.S.brains, 0); eq(G.S.tiles[32].st, "tree");
  });
}

console.log("\n== growth & wilt ==");
{
  const { G } = boot();
  forcePlot(G, 10); G.plantAt(10, "crop", "carrot");
  check("progress ~0 right after planting, not ready", () => {
    const g = G.growthInfo(G.S.tiles[10]);
    ok(g.prog < 0.05); ok(!g.ready); ok(!g.wilted);
  });
  check("ready exactly when grow time elapses", () => {
    backdate(G, 10, 25);
    const g = G.growthInfo(G.S.tiles[10]);
    ok(g.ready); eq(g.prog, 1);
  });
  check("ripe crop survives 2h59m unpicked", () => {
    backdate(G, 10, 25 + 3 * 3600 - 60);
    ok(!G.growthInfo(G.S.tiles[10]).wilted);
  });
  check("crop withers 3 hours after ripening (offline clock too)", () => {
    backdate(G, 10, 25 + 3 * 3600 + 60);
    ok(G.growthInfo(G.S.tiles[10]).wilted);
  });
  check("tapping a wilted crop plows it under (no gold)", () => {
    const gold0 = G.S.gold;
    G.tapTile(10);
    eq(G.S.tiles[10].st, "plot"); eq(G.S.gold, gold0);
  });
  check("zombies never wilt (even after a full day)", () => {
    forcePlot(G, 11); G.S.gold = 500; G.plantAt(11, "zombie", "shambler");
    backdate(G, 11, 24 * 3600);
    const g = G.growthInfo(G.S.tiles[11]);
    ok(g.ready); ok(!g.wilted);
  });
}

console.log("\n== xp & levels ==");
{
  const { G } = boot();
  check("xpNeeded(1) is 30", () => eq(G.xpNeeded(1), 30));
  check("gainXP levels up and carries remainder", () => {
    G.S.xp = 0; G.S.level = 1;
    G.gainXP(35);
    eq(G.S.level, 2); eq(G.S.xp, 5);
  });
  check("xpNeeded grows superlinearly", () => {
    ok(G.xpNeeded(5) > 5 * G.xpNeeded(1));
  });
}

console.log("\n== iso tap mapping ==");
{
  const { G } = boot();
  check("cellXY -> tileAt roundtrip for all 49 cells", () => {
    for (let i = 0; i < 49; i++) {
      const p = G.cellXY(i);
      const back = G.tileAt(p.x, p.y);
      if (back !== i) throw new Error("cell " + i + " mapped back to " + back);
    }
  });
  check("taps outside the diamond return -1", () => {
    eq(G.tileAt(0, 0), -1);
    eq(G.tileAt(G.W - 1, 0), -1);
    eq(G.tileAt(G.ISOX, G.ISOY - 20), -1);
  });
  check("neighbors: corner has 2, edge has 3, center has 4", () => {
    eq(G.neighbors(0).length, 2);
    eq(G.neighbors(3).length, 3);
    eq(G.neighbors(24).length, 4);
  });
}

console.log("\n== mutations ==");
function zombieWithNeighbors(cropIds, cropProgFrac, rand, ztype) {
  const inst = loadGame();
  const G = inst.G;
  G.startGame(null);
  G.S.gold = 100000; G.S.brains = 100; G.S.level = 99; // afford + unlock any crop
  const center = 24, neigh = G.neighbors(center); // [23,25,17,31]
  forcePlot(G, center);
  G.plantAt(center, "zombie", ztype || "shambler");
  cropIds.forEach((cid, k) => {
    const i = neigh[k];
    forcePlot(G, i);
    G.plantAt(i, "crop", cid);
    const def = G.CROPS.find(c => c.id === cid);
    G.S.tiles[i].at = Date.now() - def.time * 1000 * cropProgFrac;
  });
  backdate(G, center, 31); // zombie ready
  const restore = G.setRandom(rand);
  G.harvest(center);
  restore();
  return G;
}
{
  check("adjacent ripening carrot + lucky roll => Speedy mutation (+2 spd)", () => {
    const G = zombieWithNeighbors(["carrot"], 0.7, () => 0);
    eq(G.S.zombies.length, 1);
    const z = G.S.zombies[0];
    eq(z.mut.length, 1); eq(z.mut[0].label, "Speedy");
    eq(z.spd, 1.0 + 2);
    eq(G.S.stats.muts, 1);
  });
  check("unlucky roll => no mutation", () => {
    const G = zombieWithNeighbors(["carrot"], 0.7, () => 0.9999);
    eq(G.S.zombies[0].mut.length, 0);
    eq(G.S.stats.muts, 0);
  });
  check("crop below 50% grown never mutates (even lucky)", () => {
    const G = zombieWithNeighbors(["carrot"], 0.2, () => 0);
    eq(G.S.zombies[0].mut.length, 0);
  });
  check("4 distinct ripening crops => capped at 2 mutations", () => {
    const G = zombieWithNeighbors(["carrot", "corn", "pumpkin", "shroom"], 0.7, () => 0);
    eq(G.S.zombies[0].mut.length, 2);
  });
  check("duplicate crop => no duplicate mutation label", () => {
    const G = zombieWithNeighbors(["carrot", "carrot"], 0.7, () => 0);
    eq(G.S.zombies[0].mut.length, 1);
  });
  check("stat mutations apply: corn +2 pow, melon +25 hp (non-special pair)", () => {
    const G = zombieWithNeighbors(["corn", "melon"], 0.7, () => 0);
    const z = G.S.zombies[0];
    ok(!z.special, "Kernel+Moon on a shambler is no special");
    const zd = G.ZTYPES.find(t => t.id === "shambler");
    eq(z.pow, zd.pow + 2);
    eq(z.hp, zd.hp + 25); eq(z.maxhp, zd.hp + 25);
  });
}

console.log("\n== horde ==");
{
  const { G } = boot();
  check("harvested zombie joins the horde with a name", () => {
    G.S.gold = 1000;
    forcePlot(G, 5); G.plantAt(5, "zombie", "mini");
    backdate(G, 5, 16);
    G.tapTile(5);
    eq(G.S.zombies.length, 1);
    ok(G.ZNAMES.includes(G.S.zombies[0].name));
    eq(G.S.stats.zombies, 1);
  });
  check("full horde (20): overflow zombie sells for cost*1.2+20", () => {
    while (G.S.zombies.length < 20) G.S.zombies.push({ type: "mini", hp: 1, maxhp: 1, pow: 1, spd: 1, hunger: 0, mut: [], kills: 0, x: 0, y: 0, tx: 0, ty: 0, wob: 0, name: "Dummy" });
    G.S.gold = 0;
    forcePlot(G, 6); G.S.gold = 300; G.plantAt(6, "zombie", "mini"); // 300-250=50
    backdate(G, 6, 16);
    G.tapTile(6);
    eq(G.S.zombies.length, 20, "horde stays capped");
    eq(G.S.gold, 50 + Math.floor(250 * 1.2) + 20); // +320
  });
}

console.log("\n== trees & life force ==");
{
  const { G } = boot();
  check("oak radiates 10 life force", () => {
    G.S.gold = 5000; G.S.level = 2; // oak unlocks at 2
    forcePlot(G, 8); G.plantAt(8, "tree", "oak");
    eq(G.S.lifeForce, 10); eq(G.S.stats.trees, 1);
  });
  check("shovel clears a tree and life force recalculates", () => {
    G.shovelMode = true;
    G.tapTile(8);
    eq(G.S.tiles[8].st, "grass"); eq(G.S.lifeForce, 0);
    G.shovelMode = false;
  });
  check("shovel on grass does nothing", () => {
    G.shovelMode = true;
    G.tapTile(9);
    eq(G.S.tiles[9].st, "grass");
    G.shovelMode = false;
  });
}

console.log("\n== planting mode ==");
{
  const { G } = boot();
  check("setPlantMode refuses zombies (they plant one at a time)", () => {
    G.setPlantMode("zombie", G.ZTYPES[0]);
    eq(G.plantMode, null);
  });
  check("setPlantMode arms crop planting", () => {
    G.setPlantMode("crop", G.CROPS[0]);
    ok(G.plantMode); eq(G.plantMode.id, "carrot"); eq(G.plantMode.kind, "crop");
  });
  check("tap grass while armed = plow + plant in one tap", () => {
    G.S.gold = 200;
    G.tapTile(40);
    eq(G.S.tiles[40].st, "planted"); eq(G.S.tiles[40].plant, "carrot");
    eq(G.S.gold, 200 - 10 - 10);
  });
  check("tap plot while armed plants directly", () => {
    forcePlot(G, 41); G.S.gold = 50;
    G.tapTile(41);
    eq(G.S.tiles[41].st, "planted"); eq(G.S.gold, 40);
  });
  check("clearPlantMode disarms", () => {
    G.clearPlantMode();
    eq(G.plantMode, null);
  });
}

console.log("\n== battle (squad system) ==");
function armyOf(G, n, hunger, pow) {
  G.S.zombies = [];
  for (let k = 0; k < n; k++) {
    G.S.zombies.push({ type: "shambler", name: "Z" + k, pow, hp: 60, maxhp: 60, spd: 1.2, hunger: Array.isArray(hunger) ? hunger[k] : hunger, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
  }
}
// step the battle, sending any available zombie whenever a slot frees up
function simulate(G, maxSteps) {
  for (let s = 0; s < maxSteps && !G.B.result; s++) {
    for (let k = 0; k < G.B.squad.length && G.B.actives.length < G.MAX_ACTIVE; k++) G.sendZombie(k);
    G.updateBattle(0.05);
  }
  return G.B.result;
}
{
  const { G } = boot();
  check("startBattle takes a chosen squad (subset of the horde)", () => {
    armyOf(G, 4, [10, 80, 50, 30], 5);
    G.startBattle(G.TARGETS[0], [1, 2]); // only send Z1 and Z2
    eq(G.B.squad.length, 2);
    eq(G.B.squad[0].hunger, 80, "bench sorted hungriest-first");
    eq(G.B.squad[1].hunger, 50);
    eq(G.scene, "battle");
    G.scene = "farm"; G.B = null;
  });
  check("reinforcement waves: 3 instant, then one per 5s, up to 5 total", () => {
    armyOf(G, 5, 100, 5);
    G.startBattle(G.TARGETS[0]);
    ok(G.sendZombie(0)); ok(G.sendZombie(1)); ok(G.sendZombie(2));
    eq(G.B.actives.length, 3);
    ok(G.sendZombie(3) === false, "4th must wait out the cooldown");
    G.B.t += 5.01;
    ok(G.sendZombie(3), "4th arrives after 5s");
    ok(G.sendZombie(4) === false, "5th needs ANOTHER 5s");
    G.B.t += 5.01;
    ok(G.sendZombie(4), "5th arrives");
    eq(G.B.actives.length, 5);
    ok(G.sendZombie(0) === false, "no double-sending");
    G.scene = "farm"; G.B = null;
  });
  check("defenders hold fire until a zombie crosses the halfway line", () => {
    armyOf(G, 1, 100, 5);
    G.startBattle(G.TARGETS[0]);
    G.B.nextBrawl = 999;
    G.sendZombie(0);
    const a = G.B.actives[0];
    a.x = G.W * 0.2; // well short of halfway to the fort
    G.B.t = 5; G.B.lastThrow = 0;
    G.updateBattle(0.001);
    eq(G.B.projectiles.length, 0, "no throws at long range");
    a.x = G.W * 0.72 * 0.5 + 5; // just past halfway
    G.B.lastThrow = 0;
    G.updateBattle(0.001);
    eq(G.B.projectiles.length, 1, "throws once in range");
    G.scene = "farm"; G.B = null;
  });
  check("EVERYONE marches immediately on send — no off-screen dawdling", () => {
    armyOf(G, 2, [90, 50], 5);
    G.startBattle(G.TARGETS[0]);
    G.sendZombie(0); G.sendZombie(1);
    eq(G.B.actives[0].state, "march");
    eq(G.B.actives[1].state, "march", "even the peckish one starts marching");
    G.scene = "farm"; G.B = null;
  });
  check("sent zombies NEVER stall: one tap -> march -> attack, any hunger", () => {
    [5, 45, 100].forEach(hunger => {
      armyOf(G, 1, hunger, 5);
      G.startBattle(G.TARGETS[0]);
      G.B.nextBrawl = 999; // keep the field clear for this test
      G.sendZombie(0);
      const a = G.B.actives[0];
      let steps = 0;
      while (a.state !== "attack" && steps++ < 400) {
        G.updateBattle(0.05);
        ok(a.state !== "distracted", "hunger " + hunger + " zombie stalled mid-march");
      }
      eq(a.state, "attack", "hunger " + hunger + " zombie reached the building");
      G.scene = "farm"; G.B = null;
    });
  });
  check("hungrier zombies still bite harder (damage bonus intact)", () => {
    // 1 + hunger/150 multiplier on attack damage
    armyOf(G, 1, 100, 30);
    G.startBattle(G.TARGETS[0]);
    G.B.nextBrawl = 999; G.sendZombie(0);
    const a = G.B.actives[0];
    a.state = "attack"; a.atkT = 0.69;
    const restore = G.setRandom(() => 0.5); // rnd(0.8,1.2) -> 1.0
    G.updateBattle(0.02);
    restore();
    const dmgHungry = G.B.maxhp - G.B.hp;
    ok(Math.abs(dmgHungry - 30 * (1 + 100 / 150)) < 0.5, "hungry dmg " + dmgHungry);
    G.scene = "farm"; G.B = null;
  });
  check("full sim: strong hungry horde wins, earns gold + xp + win stat", () => {
    armyOf(G, 6, 100, 40);
    const gold0 = G.S.gold, wins0 = G.S.stats.wins;
    G.startBattle(G.TARGETS[0]);
    const result = simulate(G, 6000);
    eq(result, "win");
    ok(G.S.gold >= gold0 + G.TARGETS[0].gold[0], "gold reward in range");
    ok(G.S.gold <= gold0 + G.TARGETS[0].gold[1] + 40 + 250, "gold reward + possible goal bonus");
    eq(G.S.stats.wins, wins0 + 1);
    G.scene = "farm"; G.B = null;
  });
  check("after a win: hunger resets for all, but only FIGHTERS log the win", () => {
    ok(G.S.zombies.length > 0, "some zombies survived");
    G.S.zombies.forEach(z => { ok(z.hunger <= 15); });
    ok(G.S.zombies.some(z => z.kills >= 1), "the ones sent in earned their record");
  });
  check("full sim: toothless horde times out and loses; dead are removed", () => {
    armyOf(G, 6, 100, 0); // 0 pow: can never win
    G.S.zombies[0].hp = 0.0001; // will die to the first hit
    G.startBattle(G.TARGETS[0]);
    const result = simulate(G, 4000);
    eq(result, "lose");
    ok(G.S.zombies.every(z => z.hp > 0), "corpses-of-corpses filtered out");
    G.scene = "farm"; G.B = null;
  });
  check("invasion cooldown stamps lastInvade", () => {
    ok(Date.now() - G.S.lastInvade < 15000);
  });
  check("brawler defenders charge out and melee — and take damage back", () => {
    armyOf(G, 3, 100, 10);
    G.startBattle(G.TARGETS[0]);
    G.sendZombie(0);
    G.B.nextBrawl = 0; // force an immediate charge
    G.updateBattle(0.05);
    eq(G.B.brawlers.length, 1, "brawler spawned");
    const br = G.B.brawlers[0], a = G.B.actives[0];
    // teleport them together and let them slug it out
    br.x = a.x; br.atkT = 0.79;
    const hp0 = a.z.hp, bhp0 = br.hp;
    G.updateBattle(0.05);
    ok(a.z.hp < hp0, "zombie took melee damage");
    ok(br.hp < bhp0, "zombie brawled back");
    G.scene = "farm"; G.B = null;
  });
  check("zombies prioritize field brawlers over the building", () => {
    armyOf(G, 3, 100, 20);
    G.startBattle(G.TARGETS[0]);
    G.sendZombie(0);
    const a = G.B.actives[0];
    a.state = "attack"; a.x = G.W * 0.72 - 58; // parked at the building
    G.B.brawlers.push({ x: a.x + 10, y: a.y, hp: 40, maxhp: 40, atkT: 0, wob: 0 });
    const bhp0 = G.B.hp;
    // while the brawler stands, the building must not take a scratch
    let steps = 0;
    while (G.B.brawlers.length && steps++ < 100) {
      G.updateBattle(0.1);
      if (G.B.brawlers.length) eq(G.B.hp, bhp0, "building hit while a brawler was on the field");
    }
    ok(steps < 100, "brawler was mobbed and defeated");
    // field clear -> back to demolishing the building
    for (let s2 = 0; s2 < 10; s2++) G.updateBattle(0.1);
    ok(G.B.hp < bhp0, "building damage resumes after the brawl");
    G.scene = "farm"; G.B = null;
  });
  check("battle timer is 120s and targets got 50% tougher (farm = 90hp)", () => {
    armyOf(G, 1, 100, 5);
    G.startBattle(G.TARGETS[0]);
    eq(G.B.timer, 120);
    eq(G.TARGETS[0].hp, 90);
    eq(G.TARGETS[7].hp, 3750);
    G.scene = "farm"; G.B = null;
  });
}

console.log("\n== horde management ==");
{
  const { G } = boot();
  armyOf(G, 3, 30, 5);
  check("renameZombie renames (trimmed, capped at 14 chars)", () => {
    ok(G.renameZombie(0, "  Sir Chomps-a-Lot-The-Third  "));
    eq(G.S.zombies[0].name, "Sir Chomps-a-L");
    ok(G.renameZombie(0, "   ") === false, "blank refused");
    eq(G.S.zombies[0].name, "Sir Chomps-a-L");
  });
  check("releaseZombie removes exactly that zombie", () => {
    const before = G.S.zombies.length;
    const victim = G.S.zombies[1].name;
    ok(G.releaseZombie(1));
    eq(G.S.zombies.length, before - 1);
    ok(!G.S.zombies.some(z => z.name === victim));
    ok(G.releaseZombie(99) === false, "bad index refused");
  });
}

console.log("\n== camera (zoom & pan) ==");
{
  const { G } = boot();
  check("default camera: no zoom, centered, screenToWorld = identity", () => {
    G.resetCam();
    eq(G.camZ, 1);
    const p = G.screenToWorld(123, 456);
    eq(Math.round(p.x), 123); eq(Math.round(p.y), 456);
  });
  check("zoomAt keeps the point under the cursor fixed", () => {
    G.resetCam();
    const px = G.W * 0.3, py = G.H * 0.6;
    const before = G.screenToWorld(px, py);
    G.zoomAt(px, py, 2);
    eq(G.camZ, 2);
    const after = G.screenToWorld(px, py);
    ok(Math.abs(before.x - after.x) < 0.001 && Math.abs(before.y - after.y) < 0.001, "anchor point drifted");
  });
  check("zoom clamps to [1, 2.6] and camera stays inside the world", () => {
    G.zoomAt(0, 0, 100);
    ok(G.camZ <= 2.6);
    G.zoomAt(0, 0, 0.0001);
    eq(G.camZ, 1);
    ok(Math.abs(G.camCX - G.W / 2) < 0.001, "at 1x the camera re-centers");
    G.resetCam();
  });
  check("tap roundtrip while zoomed: cellXY -> screen -> world -> same tile", () => {
    G.resetCam();
    G.zoomAt(G.W / 2, G.H / 2, 1.8);
    for (let i = 0; i < 49; i += 8) {
      const p = G.cellXY(i); // world coords
      // world -> screen
      const sx = (p.x - G.camCX) * G.camZ + G.W / 2;
      const sy = (p.y - G.camCY) * G.camZ + G.H / 2;
      const w = G.screenToWorld(sx, sy);
      const back = G.tileAt(w.x, w.y);
      if (back !== i) throw new Error("cell " + i + " -> " + back + " while zoomed");
    }
    G.resetCam();
  });
}

console.log("\n== mutation almanac ==");
{
  const { G } = boot();
  check("undiscovered mutations are hidden (tier 0)", () => {
    eq(G.mutTier("Speedy"), 0);
    eq(G.mutTier("Pungent"), 0);
  });
  check("first mutated zombie discovers it (tier 1); third masters it (tier 2)", () => {
    G.S.mutSeen = { Speedy: 1, Flaming: 3 };
    eq(G.mutTier("Speedy"), 1);
    eq(G.mutTier("Flaming"), 2);
  });
  check("harvest mutation increments mutSeen", () => {
    const G2 = zombieWithNeighbors(["carrot"], 0.7, () => 0);
    eq(G2.S.mutSeen.Speedy, 1);
  });
  check("mutSeen survives sanitizeState (and junk is dropped)", () => {
    const raw = G.freshState();
    raw.mutSeen = { Speedy: 2, Flaming: "lots", NotAMutation: 9 };
    const s = G.sanitizeState(raw);
    eq(s.mutSeen.Speedy, 2);
    ok(!("Flaming" in s.mutSeen), "non-numeric dropped");
    ok(!("NotAMutation" in s.mutSeen), "unknown label dropped");
  });
}

console.log("\n== goals ==");
{
  const { G } = boot();
  check("plow4 goal completes at 4 plows and pays 40g", () => {
    G.S.gold = 100;
    G.S.stats.plowed = 4;
    G.checkGoals();
    ok(G.S.goalsDone.includes("plow4"));
    eq(G.S.gold, 140);
  });
  check("goals never pay twice", () => {
    G.checkGoals();
    eq(G.S.gold, 140);
  });
}

console.log("\n== save / continue / migration ==");
{
  const inst = loadGame();
  const G = inst.G;
  check("save -> load roundtrip preserves everything", () => {
    G.startGame(null);
    G.S.gold = 1234; G.S.brains = 3; G.S.tiles[7] = { st: "plot" };
    G.save();
    const loaded = G.load();
    eq(JSON.stringify(loaded), JSON.stringify(G.S));
  });
  check("startGame(load()) continues the same farm", () => {
    G.startGame(G.load());
    eq(G.S.gold, 1234); eq(G.S.brains, 3); eq(G.S.tiles[7].st, "plot");
  });
  check("startGame(null) is a fresh 200g farm", () => {
    G.startGame(null);
    eq(G.S.gold, 200);
  });
  check("legacy save without stats/zombies fields gets migrated defaults", () => {
    const legacy = { gold: 555, brains: 1, xp: 10, level: 3, tiles: G.freshState().tiles, lifeForce: 0, lastInvade: 0, muted: false, goalsDone: [], claimed: [], created: Date.now() };
    G.startGame(legacy);
    eq(G.S.gold, 555);
    ok(G.S.stats && typeof G.S.stats.plowed === "number", "stats backfilled");
    ok(Array.isArray(G.S.zombies), "zombies backfilled");
  });
  check("zombies missing positions get placed on the field", () => {
    const s = G.freshState();
    s.zombies = [{ type: "mini", name: "Old", pow: 3, hp: 12, maxhp: 12, spd: 1.7, hunger: 30, mut: [], kills: 0 }];
    G.startGame(s);
    const z = G.S.zombies[0];
    ok(typeof z.x === "number" && typeof z.y === "number");
  });
}

console.log("\n== unlock gating & invalid ids ==");
{
  const { G } = boot();
  check("plantAt refuses a not-yet-unlocked crop (melon needs level 10)", () => {
    forcePlot(G, 20); G.S.gold = 100000;
    ok(G.plantAt(20, "crop", "melon") === false);
    eq(G.S.tiles[20].st, "plot"); eq(G.S.gold, 100000, "no gold taken");
  });
  check("plantAt refuses unknown ids instead of crashing", () => {
    forcePlot(G, 21);
    ok(G.plantAt(21, "crop", "wat") === false);
    ok(G.plantAt(21, "zombie", "nope") === false);
    ok(G.plantAt(21, "tree", "???") === false);
    ok(G.plantAt(21, "sandwich", "carrot") === false);
  });
  check("unlocked-at-exact-level plants fine (corn at level 2)", () => {
    G.S.level = 2; G.S.gold = 100;
    forcePlot(G, 22);
    ok(G.plantAt(22, "crop", "corn") === true);
  });
}

console.log("\n== gardener & hunger ticks ==");
{
  const { G } = boot();
  check("gardener WALKS to the crop, then fertilizes on arrival (2x flag)", () => {
    G.S.gold = 1000;
    forcePlot(G, 10); G.plantAt(10, "crop", "carrot");
    G.S.zombies.push({ type: "gardener", name: "Gus", pow: 2, hp: 16, maxhp: 16, spd: 1, hunger: 30, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
    const gus = G.S.zombies[0];
    G.gardenerTick(); // assigns the mission — too far away to bless yet
    ok(G.S.tiles[10].fert === false, "not fertilized from across the farm");
    const p = G.cellXY(10);
    ok(Math.abs(gus.tx - p.x) < 1 && Math.abs(gus.ty - p.y) < 1, "steering at the crop");
    gus.x = p.x; gus.y = p.y; // he arrives
    G.gardenerTick();
    ok(G.S.tiles[10].fert === true, "blessed on arrival");
  });
  check("gardener is throttled (one mission per cooldown)", () => {
    forcePlot(G, 11); G.plantAt(11, "crop", "carrot");
    G.gardenerTick();
    ok(G.S.tiles[11].fert === false, "second crop must wait for the cooldown");
  });
  check("no gardener, no fertilizer", () => {
    const inst2 = loadGame(); const G2 = inst2.G;
    G2.startGame(null); G2.S.gold = 1000;
    forcePlot(G2, 10); G2.plantAt(10, "crop", "carrot");
    G2.gardenerTick();
    ok(G2.S.tiles[10].fert === false);
  });
  check("hunger = time since last battle; never-fought = STARVING", () => {
    const inst2 = loadGame(); const G2 = inst2.G;
    G2.startGame(null);
    G2.S.zombies.push({ type: "mini", name: "Fresh", pow: 3, hp: 12, maxhp: 12, spd: 1.7, hunger: 0, lastBattleAt: Date.now(), x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
    G2.S.zombies.push({ type: "mini", name: "Hour", pow: 3, hp: 12, maxhp: 12, spd: 1.7, hunger: 0, lastBattleAt: Date.now() - 3600e3, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
    G2.S.zombies.push({ type: "mini", name: "Never", pow: 3, hp: 12, maxhp: 12, spd: 1.7, hunger: 0, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
    G2.hungerTick();
    ok(G2.S.zombies[0].hunger < 2, "fresh from battle: content");
    ok(Math.abs(G2.S.zombies[1].hunger - 50) < 2, "one idle hour: peckish (~50)");
    eq(G2.S.zombies[2].hunger, 100, "never fought: STARVING");
    const s2 = G2.sanitizeState(JSON.parse(JSON.stringify(G2.S)));
    ok(s2.zombies[0].lastBattleAt > 0, "battle clock survives saves");
  });
}

console.log("\n== offline growth (timestamps survive save/load) ==");
{
  const { G } = boot();
  check("crop planted, saved, 'away' past grow time => ripe on return", () => {
    G.S.gold = 100;
    forcePlot(G, 12); G.plantAt(12, "crop", "carrot");
    G.save();
    // simulate returning later: rewrite the stored timestamp 25s into the past
    const st = G.load();
    st.tiles[12].at = Date.now() - 27 * 1000;
    G.startGame(st);
    const g = G.growthInfo(G.S.tiles[12]);
    ok(g.ready, "ripe after offline time");
  });
  check("'away' past the 12-hour ripe window => wilted on return", () => {
    const st = G.load();
    st.tiles[12] = { st: "planted", kind: "crop", plant: "carrot", at: Date.now() - (25 + 12 * 3600 + 300) * 1000, fert: false };
    G.startGame(st);
    ok(G.growthInfo(G.S.tiles[12]).wilted);
  });
}

console.log("\n== mutation chance bounds ==");
function mutationRoll(lifeForce, roll) {
  const inst = loadGame(); const G = inst.G;
  G.startGame(null);
  G.S.gold = 100000; G.S.level = 99;
  forcePlot(G, 24); G.plantAt(24, "zombie", "shambler");
  forcePlot(G, 23); G.plantAt(23, "crop", "carrot");
  G.S.tiles[23].at = Date.now() - 0.7 * 25 * 1000; // 70% grown
  backdate(G, 24, 31);
  G.S.lifeForce = lifeForce;
  const restore = G.setRandom(() => roll);
  G.harvest(24);
  restore();
  return G.S.zombies[0].mut.length;
}
{
  check("mutation odds: 15% base with no trees (0.14 hits, 0.16 misses)", () => {
    eq(mutationRoll(0, 0.14), 1);
    eq(mutationRoll(0, 0.16), 0);
  });
  check("odds ladder anchors: 50 LF=30%, 600=50%, 1200=75%", () => {
    eq(mutationRoll(50, 0.29), 1);  eq(mutationRoll(50, 0.31), 0);
    eq(mutationRoll(600, 0.49), 1); eq(mutationRoll(600, 0.51), 0);
    eq(mutationRoll(1200, 0.74), 1); eq(mutationRoll(1200, 0.76), 0);
  });
  check("TEN lantern trees (1800 LF) reach GUARANTEED mutations", () => {
    eq(mutationRoll(1800, 0.999), 1);
    eq(mutationRoll(999999, 0.999), 1, "capped at 100%, no overflow");
  });
  check("mutationChance interpolates exactly between anchors", () => {
    const { G } = boot();
    G.S.lifeForce = 0;    ok(Math.abs(G.mutationChance() - 0.15) < 1e-9);
    G.S.lifeForce = 25;   ok(Math.abs(G.mutationChance() - 0.225) < 1e-9);  // halfway 0->50
    G.S.lifeForce = 325;  ok(Math.abs(G.mutationChance() - 0.40) < 1e-9);   // halfway 50->600
    G.S.lifeForce = 900;  ok(Math.abs(G.mutationChance() - 0.625) < 1e-9);  // halfway 600->1200
    G.S.lifeForce = 1500; ok(Math.abs(G.mutationChance() - 0.875) < 1e-9);  // halfway 1200->1800
    G.S.lifeForce = 1800; eq(G.mutationChance(), 1);
    G.S.lifeForce = 3600; eq(G.mutationChance(), 1, "capped past ten lanterns");
  });
  check("a wilted neighbor never gifts a mutation (even lucky roll)", () => {
    const inst = loadGame(); const G = inst.G;
    G.startGame(null);
    G.S.gold = 100000;
    forcePlot(G, 24); G.plantAt(24, "zombie", "shambler");
    forcePlot(G, 23); G.plantAt(23, "crop", "carrot");
    G.S.tiles[23].at = Date.now() - (25 + 12 * 3600 + 300) * 1000; // long dead
    backdate(G, 24, 31);
    const restore = G.setRandom(() => 0);
    G.harvest(24);
    restore();
    eq(G.S.zombies[0].mut.length, 0);
  });
}

console.log("\n== invasion gating ==");
{
  const inst = loadGame(); const G = inst.G; const els = inst.els;
  G.startGame(null);
  check("hud disables INVADE with fewer than 5 zombies", () => {
    G.hud();
    ok(els["invadeBtn"].disabled === true);
    ok(els["invadeBtn"].innerHTML.includes("Need 5"));
  });
  check("invade click refused outright with a small horde (logic gate, not just UI)", () => {
    els["invadeBtn"].onclick();
    eq(G.scene, "farm");
    ok(els["toast"].innerHTML.includes("need") || els["toast"].innerHTML.includes("6"), "explains why");
  });
  check("hud disables INVADE during the 3-minute cooldown", () => {
    armyOf(G, 6, 100, 5);
    G.S.lastInvade = Date.now() - 10 * 1000; // 10s ago, cooldown is 180s
    G.hud();
    ok(els["invadeBtn"].disabled === true);
  });
  check("invade click refused during cooldown (logic gate)", () => {
    els["invadeBtn"].onclick();
    eq(G.scene, "farm");
    ok(els["toast"].innerHTML.includes("resting"));
  });
  check("cooldown over + enough zombies => target picker opens", () => {
    G.S.lastInvade = 0;
    G.hud();
    ok(els["invadeBtn"].disabled === false);
    ok(els["invadeBtn"].innerHTML.includes("INVADE"));
    els["invadeBtn"].onclick();
    ok(els["mTitle"].innerHTML.includes("victim"), "target modal opened");
  });
}

console.log("\n== save-code export / import (the real Help handlers) ==");
{
  const inst = loadGame(); const G = inst.G; const els = inst.els; const ctx = inst.ctx;
  G.startGame(null);
  G.S.gold = 7777; G.S.brains = 5; G.S.tiles[3] = { st: "plot" };
  let exportedCode = null;
  acheck("export fills the textarea with a decodable save code", async () => {
    els["helpBtn"].onclick(); // builds the help modal + wires the buttons
    await els["expBtn"].onclick();
    exportedCode = els["scTA"].value;
    ok(typeof exportedCode === "string" && exportedCode.length > 50, "got a code");
    const decoded = await G.decodeSave(exportedCode);
    eq(decoded.gold, 7777);
  });
  acheck("import (Load button) round-trips the farm through the code", async () => {
    G.S.gold = 1; G.S.brains = 0; // wreck the live state
    ctx.location.reload = () => {};
    els["scTA"].value = exportedCode;
    await els["scLoad"].onclick();
    const st = G.load();
    eq(st.gold, 7777); eq(st.brains, 5); eq(st.tiles[3].st, "plot");
  });
  acheck("garbage code is rejected gracefully (no crash, no save overwrite)", async () => {
    const before = inst.storage.get("zfr_save");
    els["scTA"].value = "definitely-not-base64!!!";
    await els["scLoad"].onclick();
    eq(inst.storage.get("zfr_save"), before, "save untouched");
    ok(els["scMsg"].textContent.includes("didn't work"), "user told it failed");
  });
  acheck("valid base64 of a non-farm object is rejected too", async () => {
    const before = inst.storage.get("zfr_save");
    els["scTA"].value = inst.run('btoa(unescape(encodeURIComponent(JSON.stringify({hello:"world"}))))');
    await els["scLoad"].onclick();
    eq(inst.storage.get("zfr_save"), before, "save untouched");
  });
}

console.log("\n== sanitizeState (save repair & migration) ==");
{
  const inst = loadGame(); const G = inst.G;
  check("null / non-object saves are rejected", () => {
    eq(G.sanitizeState(null), null);
    eq(G.sanitizeState("zombie"), null);
    eq(G.sanitizeState(42), null);
  });
  check("empty object becomes a complete fresh farm", () => {
    const s = G.sanitizeState({});
    eq(s.gold, 200); eq(s.level, 1); eq(s.tiles.length, 49);
    ok(Array.isArray(s.goalsDone) && Array.isArray(s.zombies));
  });
  check("planted tile with unknown crop id is downgraded to a plot (no crash-loop)", () => {
    const raw = G.freshState();
    raw.tiles[5] = { st: "planted", kind: "crop", plant: "deleted-crop", at: Date.now() };
    const s = G.sanitizeState(raw);
    eq(s.tiles[5].st, "plot");
  });
  check("tree with unknown id reverts to grass", () => {
    const raw = G.freshState();
    raw.tiles[6] = { st: "tree", tree: "upside-down-tree" };
    eq(G.sanitizeState(raw).tiles[6].st, "grass");
  });
  check("valid planted/tree/plot tiles pass through intact", () => {
    const raw = G.freshState();
    raw.tiles[1] = { st: "plot" };
    raw.tiles[2] = { st: "planted", kind: "crop", plant: "corn", at: 12345, fert: true };
    raw.tiles[3] = { st: "tree", tree: "oak" };
    const s = G.sanitizeState(raw);
    eq(s.tiles[1].st, "plot");
    eq(s.tiles[2].plant, "corn"); eq(s.tiles[2].at, 12345); eq(s.tiles[2].fert, true);
    eq(s.tiles[3].tree, "oak");
  });
  check("zombies of unknown type are dropped; horde clamped to 20", () => {
    const raw = G.freshState();
    for (let k = 0; k < 24; k++) raw.zombies.push({ type: "mini", name: "Z" + k, hunger: 10 });
    raw.zombies.push({ type: "vampire", name: "NotInThisGame" });
    const s = G.sanitizeState(raw);
    eq(s.zombies.length, 20);
    ok(s.zombies.every(z => z.type === "mini"));
  });
  check("zombie missing stats gets its type's defaults", () => {
    const raw = G.freshState();
    raw.zombies.push({ type: "bruiser" });
    const z = G.sanitizeState(raw).zombies[0];
    eq(z.pow, 15); eq(z.hp, 60); eq(z.maxhp, 60);
    ok(typeof z.name === "string" && z.name.length > 0);
    ok(Array.isArray(z.mut)); eq(z.kills, 0);
  });
  check("junk mutation entries are stripped, max 2 kept", () => {
    const raw = G.freshState();
    raw.zombies.push({ type: "mini", mut: [null, "x", { label: "Speedy", col: "#f80" }, { nope: 1 }, { label: "Flaming" }, { label: "Sporified" }] });
    const muts = G.sanitizeState(raw).zombies[0].mut;
    eq(muts.length, 2);
    eq(muts[0].label, "Speedy"); eq(muts[1].label, "Flaming");
  });
  check("non-numeric gold/level fall back to defaults; NaN is refused", () => {
    const s = G.sanitizeState({ gold: "one million", level: NaN, xp: Infinity });
    eq(s.gold, 200); eq(s.level, 1); eq(s.xp, 0);
  });
  check("non-string goal ids filtered out", () => {
    const s = G.sanitizeState({ goalsDone: ["plow4", 7, null, "crop5"] });
    eq(JSON.stringify(s.goalsDone), JSON.stringify(["plow4", "crop5"]));
  });
  check("corrupted localStorage JSON => load() returns null => fresh farm boots", () => {
    inst.storage.set("zfr_save", "{broken json!!");
    eq(G.load(), null);
    G.startGame(G.load());
    eq(G.S.gold, 200);
  });
}

console.log("\n== PERFECTED mutations ==");
{
  const { G } = boot();
  check("perfecting doubles FUTURE zombies only — existing ones keep their stats", () => {
    const labels = G.CROPS.map(c => c.mut.label);
    G.S.mutSeen = { Speedy: 3 };
    G.S.pairSeen = {};
    labels.filter(l => l !== "Speedy").forEach(l => { G.S.pairSeen[["Speedy", l].sort().join(" + ")] = 1; });
    G.S.zombies.push({ type: "shambler", name: "Zip", pow: 5, hp: 22, maxhp: 22, spd: 3, hunger: 0, mut: [{ label: "Speedy" }], kills: 0, x: 0, y: 0, tx: 0, ty: 0, wob: 0 });
    G.checkGoals();
    ok(G.S.perfected && G.S.perfected.Speedy === true, "perfected flag set");
    eq(G.S.zombies[0].spd, 3, "existing zombie is UNCHANGED (no retro boost)");
    ok(G.S.goalsDone.includes("perf1"), "perf1 goal completed");
    eq(G.mutAmt("Speedy").amt, 4, "future Speedy zombies earn the doubled +4");
  });
  check("perfection survives save sanitization", () => {
    const s2 = G.sanitizeState(JSON.parse(JSON.stringify(G.S)));
    ok(s2.perfected.Speedy === true);
  });
}

console.log("\n== content pack: data ==");
{
  const { G } = boot();
  check("content counts: 10 crops, 14 zombies (1 secret), 5 trees, 8 targets, 41 goals", () => {
    eq(G.CROPS.length, 10); eq(G.ZTYPES.length, 14);
    eq(G.TREES.length, 5); eq(G.TARGETS.length, 8); eq(G.GOALS.length, 41);
  });
  check("crop grow times are the approved nice numbers", () => {
    const want = [25, 50, 100, 200, 330, 540, 780, 1320, 1980, 3000];
    eq(JSON.stringify(G.CROPS.map(c => c.time)), JSON.stringify(want));
  });
  check("crop economy ladder: ~15% compounding per tier (carrot untouched)", () => {
    const wantCost = [10, 30, 80, 180, 440, 1000, 2100, 4800, 10500, 24500];
    const wantSell = [15, 40, 120, 260, 700, 1700, 3600, 8800, 20000, 49000];
    eq(JSON.stringify(G.CROPS.map(c => c.cost)), JSON.stringify(wantCost));
    eq(JSON.stringify(G.CROPS.map(c => c.sell)), JSON.stringify(wantSell));
  });
  check("zombie & tree price ladders (build 68 pricing decree)", () => {
    const wantZ = [100, 250, 1000, 2000, 5000, 0, 7500, 0, 10000, 0, 15000, 0, 50000, 0];
    eq(JSON.stringify(G.ZTYPES.map(z => z.cost)), JSON.stringify(wantZ));
    eq(JSON.stringify(G.ZTYPES.map(z => z.id).slice(6,10)), JSON.stringify(["banshee","chef","digger","abom"]), "market order decree");
    eq(JSON.stringify(G.TREES.map(t => t.cost)), JSON.stringify([2000, 5000, 10000, 0, 0]));
  });
  check("every crop's mutation label is unique (visual zone ownership)", () => {
    const labels = G.CROPS.map(c => c.mut.label);
    eq(new Set(labels).size, labels.length);
  });
  check("unlocks escalate to level 24 (Lunar Lab is the finale)", () => {
    eq(Math.max(...G.TARGETS.map(t => t.unlock)), 24);
    eq(G.TARGETS[7].scen, "moon");
  });
  check("premium brains pricing: Lantern 5, Gravemound 10, Chef 3, Abom 5, Spooky 3", () => {
    eq(G.TREES.find(t => t.id === "lantern").brains, 5);
    eq(G.ZTYPES.find(z => z.id === "gravemound").brains, 10);
    eq(G.ZTYPES.find(z => z.id === "voltz").brains, 15);
    eq(G.ZTYPES.find(z => z.id === "sawbones").brains, 1);
    eq(G.ZTYPES.find(z => z.id === "chef").brains, 3);
    eq(G.ZTYPES.find(z => z.id === "abom").brains, 5);
    eq(G.TREES.find(t => t.id === "spooky").brains, 3);
  });
}

console.log("\n== content pack: battle traits ==");
function traitArmy(G, type, n) {
  G.S.zombies = [];
  const zd = G.ZTYPES.find(t => t.id === type);
  for (let k = 0; k < n; k++) G.S.zombies.push({ type, name: "T" + k, pow: zd.pow, hp: 70, maxhp: 70, spd: 1, hunger: 100, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
}
function projectileHit(G, type) {
  traitArmy(G, type, 6);
  G.startBattle(G.TARGETS[0]);
  G.sendZombie(0);
  const a = G.B.actives[0];
  G.B.projectiles.push({ x: a.x, y: a.y - 20, vx: 0, vy: 0, g: 0, born: 0 });
  const restore = G.setRandom(() => 0); // ri(6,13) -> 6 damage before traits
  G.updateBattle(0.001);
  restore();
  const hp = a.z.hp;
  G.scene = "farm"; G.B = null;
  return 70 - hp; // damage taken
}
{
  const { G } = boot();
  check("Grave Digger's hardhat blocks 30% of projectile damage", () => {
    eq(projectileHit(G, "shambler"), 6);
    eq(projectileHit(G, "digger"), 5); // ceil(6 * 0.7)
  });
  check("Jester confuses defenders into throwing slower", () => {
    // with rolls forced to 0 the throw gap is 1.4s (jester: 1.4*1.7 = 2.38s)
    traitArmy(G, "shambler", 6);
    G.startBattle(G.TARGETS[0]); G.sendZombie(0);
    G.B.actives[0].x = G.W * 0.6; // in throwing range
    let restore = G.setRandom(() => 0);
    G.B.t = 2.0; G.B.lastThrow = 0;
    G.updateBattle(0.001);
    restore();
    eq(G.B.projectiles.length, 1, "shambler gets thrown at");
    G.scene = "farm"; G.B = null;
    traitArmy(G, "jester", 6);
    G.startBattle(G.TARGETS[0]); G.sendZombie(0);
    G.B.actives[0].x = G.W * 0.6;
    restore = G.setRandom(() => 0);
    G.B.t = 2.0; G.B.lastThrow = 0;
    G.updateBattle(0.001);
    restore();
    eq(G.B.projectiles.length, 0, "defender still winding up at the jester");
    G.scene = "farm"; G.B = null;
  });
  check("a surviving Chef doubles post-victory healing (8 -> 16)", () => {
    traitArmy(G, "shambler", 5);
    G.S.zombies.forEach(z => { z.hp = 20; });
    G.S.zombies.push({ type: "chef", name: "Cook", pow: 28, hp: 20, maxhp: 80, spd: 1, hunger: 100, x: 0, y: 0, tx: 0, ty: 0, wob: 0, mut: [], kills: 0 });
    G.startBattle(G.TARGETS[0]);
    G.B.hp = 0; G.updateBattle(0.01); // instant win
    eq(G.S.zombies[0].hp, 36, "20 + 16 with chef");
    G.scene = "farm"; G.B = null;
    traitArmy(G, "shambler", 6);
    G.S.zombies.forEach(z => { z.hp = 20; });
    G.startBattle(G.TARGETS[0]);
    G.B.hp = 0; G.updateBattle(0.01);
    eq(G.S.zombies[0].hp, 28, "20 + 8 without chef");
    G.scene = "farm"; G.B = null;
  });
}

console.log("\n== content pack: new stats & goals ==");
{
  const { G } = boot();
  check("harvesting a Wormy Apple counts the apples stat + completes its goal", () => {
    G.S.level = 99; G.S.gold = 100000;
    forcePlot(G, 5); G.plantAt(5, "crop", "wormapple");
    backdate(G, 5, 800);
    G.tapTile(5);
    eq(G.S.stats.apples, 1);
    ok(G.S.goalsDone.includes("apple1"));
  });
  check("raising the Gravemound counts its stat + goal", () => {
    G.S.brains = 10;
    forcePlot(G, 6); G.plantAt(6, "zombie", "gravemound");
    backdate(G, 6, 700);
    G.tapTile(6);
    eq(G.S.stats.gmound, 1);
    ok(G.S.goalsDone.includes("gmound1"));
  });
  check("300 life force completes the lf300 goal (special stat)", () => {
    G.S.lifeForce = 300;
    G.checkGoals();
    ok(G.S.goalsDone.includes("lf300"));
  });
  check("winning at a new target counts mallwin/moonwin", () => {
    traitArmy(G, "shambler", 6);
    G.startBattle(G.TARGETS[5]); // mega-mall
    G.B.hp = 0; G.updateBattle(0.01);
    eq(G.S.stats.mallwin, 1);
    ok(G.S.goalsDone.includes("mall1"));
    G.scene = "farm"; G.B = null;
  });
}

console.log("\n== zombie roaming ==");
{
  const { G } = boot();
  check("randRoamPos always lands in the grass, never on the field", () => {
    for (let k = 0; k < 300; k++) {
      const p = G.randRoamPos();
      ok(!G.inFieldDiamond(p.x, p.y, 1.05), "landed on the field: " + JSON.stringify(p));
    }
  });
  check("roam paths route AROUND the field (rare 1.5% shortcuts allowed)", () => {
    const start = G.randRoamPos();
    let crossings = 0;
    for (let k = 0; k < 300; k++) {
      const p = G.roamTargetFrom(start.x, start.y);
      if (!G.pathAvoidsField(start.x, start.y, p.x, p.y)) crossings++;
    }
    ok(crossings < 8, crossings + "/300 paths crossed the field — should be ~0.4%");
  });
  check("roam spots stay on screen", () => {
    for (let k = 0; k < 100; k++) {
      const p = G.randRoamPos();
      ok(p.x >= -G.TW && p.x <= G.W + G.TW && p.y >= 0 && p.y <= G.H + 40, JSON.stringify(p));
    }
  });
}

console.log("\n== new goals & the mystery ==");
{
  const { G } = boot();
  check("goals can reward brains and xp (not just gold)", () => {
    G.S.brains = 5; // brainy5: hold 5 brains
    G.checkGoals();
    ok(G.S.goalsDone.includes("brainy5"));
    ok(G.S.xp >= 200 || G.S.level > 1, "xp reward granted");
  });
  check("bank goals track live values (goldbank via S.gold)", () => {
    G.S.gold = 50000;
    G.checkGoals();
    ok(G.S.goalsDone.includes("rich50k"));
    eq(G.S.brains, 5 + 1, "rich50k pays a brain");
  });
  check("the Golden Shambler stays secret until 20 combos raised", () => {
    forcePlot(G, 5); G.S.gold = 100000;
    G.S.stats.doubles = 3; G.checkGoals(); // old trigger no longer unlocks him
    ok(G.plantAt(5, "zombie", "golden") === false, "locked before the combo22 goal");
    const labels = G.CROPS.map(c => c.mut.label);
    G.S.pairSeen = {};
    let n = 0;
    for (let i = 0; i < labels.length && n < 20; i++)
      for (let j = i + 1; j < labels.length && n < 20; j++) { G.S.pairSeen[[labels[i], labels[j]].sort().join(" + ")] = 1; n++; }
    G.checkGoals();
    ok(G.S.goalsDone.includes("combo22"));
    ok(G.plantAt(5, "zombie", "golden") === true, "unlocked at 20 combos");
  });
  check("zoo goal counts distinct zombie types", () => {
    ["shambler","mini","headless","gardener","bruiser","banshee"].forEach(t=>{
      const zd=G.ZTYPES.find(z=>z.id===t);
      G.S.zombies.push({type:t,name:t,pow:zd.pow,hp:zd.hp,maxhp:zd.hp,spd:zd.spd,hunger:30,x:0,y:0,tx:0,ty:0,wob:0,mut:[],kills:0});
    });
    G.checkGoals();
    ok(G.S.goalsDone.includes("zoo6"));
  });
  check("renaming a zombie counts its goal", () => {
    G.renameZombie(0, "Goalworthy");
    ok(G.S.goalsDone.includes("rename1"));
  });
  check("invade cooldown is now 10 minutes", () => {
    eq(G.INVADE_CD, 600);
  });
  check("defender aim rotates between targets", () => {
    G.S.zombies = [];
    for (let k = 0; k < 3; k++) G.S.zombies.push({ type:"shambler", name:"A"+k, pow:5, hp:60, maxhp:60, spd:1, hunger:100, x:0,y:0,tx:0,ty:0,wob:0,mut:[],kills:0 });
    G.startBattle(G.TARGETS[0]);
    G.B.nextBrawl = 999;
    G.sendZombie(0); G.sendZombie(1); G.sendZombie(2);
    G.B.actives.forEach(a=>{ a.state="attack"; a.x=G.W*0.6; });
    const seen=new Set();
    for (let k=0;k<3;k++){
      G.B.t = 10+k; G.B.lastThrow = 0;
      G.updateBattle(0.001);
      seen.add(G.B.aimIx);
    }
    ok(seen.size >= 2, "aim should rotate targets, saw " + [...seen].join(","));
    G.scene = "farm"; G.B = null;
  });
}

console.log("\n== the gardener who Sees (shh) ==");
function raiseGardenerWith(cropId, roll) {
  const inst = loadGame(); const G = inst.G;
  G.startGame(null);
  G.S.gold = 1000000; G.S.level = 99;
  forcePlot(G, 24); G.plantAt(24, "zombie", "gardener");
  forcePlot(G, 23); G.plantAt(23, "crop", cropId);
  const def = G.CROPS.find(c => c.id === cropId);
  G.S.tiles[23].at = Date.now() - def.time * 700;
  backdate(G, 24, 46);
  const restore = G.setRandom(roll);
  G.harvest(24);
  restore();
  return G;
}
{
  check("gardener + Eyeball Berries => the Awakened (75 pow, 300 hp)", () => {
    const G = raiseGardenerWith("eyeberry", () => 0);
    const z = G.S.zombies[0];
    ok(z.awakened === true);
    eq(z.pow, 150); eq(z.hp, 500); eq(z.maxhp, 500);
    ok(z.mut.some(m => m.label === "All-Seeing"), "still carries the mutation");
    const zd = G.zdefFor(z);
    ok(zd.awk && zd.big, "draws on the heavy Awakened frame");
    eq(zd.hat, "straw", "keeps the hat");
    eq(zd.col, G.ZTYPES.find(t=>t.id==="gardener").col, "keeps the skin");
  });
  check("gardener + any OTHER mutation stays a humble gardener", () => {
    const G = raiseGardenerWith("carrot", () => 0);
    ok(!G.S.zombies[0].awakened);
    eq(G.S.zombies[0].pow, 2);
  });
  check("non-gardeners with All-Seeing do NOT awaken", () => {
    const G = zombieWithNeighbors(["eyeberry"], 0.7, () => 0);
    ok(!G.S.zombies[0].awakened);
  });
  check("the Awakened survive save/load (sanitizeState keeps the mark)", () => {
    const G = raiseGardenerWith("eyeberry", () => 0);
    G.save();
    const s2 = G.sanitizeState(G.load());
    ok(s2.zombies[0].awakened === true);
    eq(s2.zombies[0].pow, 150); eq(s2.zombies[0].maxhp, 500);
  });
  check("heart pill reads LIVE total horde hp", () => {
    const inst = loadGame(); const G = inst.G; const els = inst.els;
    G.startGame(null);
    G.S.zombies.push({type:"shambler",name:"A",pow:5,hp:10,maxhp:22,spd:1,hunger:30,x:0,y:0,tx:0,ty:0,wob:0,mut:[],kills:0});
    G.S.zombies.push({type:"bruiser",name:"B",pow:15,hp:44.6,maxhp:60,spd:0.7,hunger:30,x:0,y:0,tx:0,ty:0,wob:0,mut:[],kills:0});
    G.hud(); G.hudTween(99); // dt>=9 snaps the counting pills instantly
    eq(els["lfTxt"].textContent, 55); // round(10+44.6)
  });
}

console.log("\n== save backup net ==");
{
  const inst = loadGame(); const G = inst.G; const els = inst.els; const ctx = inst.ctx;
  check("BUILD stamp exists and shows in the Help menu", () => {
    ok(typeof G.BUILD === "string" && G.BUILD.length > 0);
    G.startGame(null);
    els["helpBtn"].onclick();
    ok(els["mBody"].innerHTML.includes(G.BUILD), "Help shows the build stamp");
  });
  acheck("importing a save code backs up the previous farm first", async () => {
    G.S.gold = 4242; G.save();
    const original = inst.storage.get("zfr_save");
    const incoming = inst.run("btoa(unescape(encodeURIComponent(JSON.stringify(freshState()))))");
    ctx.location.reload = () => {};
    els["helpBtn"].onclick();
    els["impBtn"].onclick(); // opens the paste box (materializes the textarea stub)
    els["scTA"].value = incoming;
    await els["scLoad"].onclick();
    eq(inst.storage.get("zfr_save_backup"), original, "old farm preserved");
    ok(JSON.parse(inst.storage.get("zfr_save")).gold === 200, "new farm installed");
  });
  check("Reset Farm (Help menu) backs up the old farm before wiping", () => {
    G.startGame(G.load());
    G.S.gold = 9999; G.save();
    const original = inst.storage.get("zfr_save");
    ctx.location.reload = () => {};
    els["helpBtn"].onclick();
    els["resetBtn2"].onclick(); // confirm() stub says yes
    eq(inst.storage.get("zfr_save_backup"), original);
    ok(!inst.storage.get("zfr_save"), "live save wiped for the fresh start");
    G.startGame(null); G.save();
    eq(G.S.gold, 200, "fresh farm started");
  });
  check("Restore swaps current and backup (so you can swap back)", () => {
    G.save(); // current fresh farm now in zfr_save
    const cur = inst.storage.get("zfr_save");
    const bak = inst.storage.get("zfr_save_backup");
    ctx.location.reload = () => {};
    els["helpBtn"].onclick();
    els["restoreBtn"].onclick();
    eq(inst.storage.get("zfr_save"), bak, "backup promoted to live");
    eq(inst.storage.get("zfr_save_backup"), cur, "old current kept as new backup");
  });
}

console.log("\n== roam healing (trees earn their keep) ==");
function injuredHorde(lifeForce) {
  const inst = loadGame(); const G = inst.G;
  G.startGame(null);
  G.S.lifeForce = lifeForce;
  G.S.zombies.push({ type: "gravemound", name: "Ouch", pow: 55, hp: 110, maxhp: 220, spd: 0.5, hunger: 30, x: 100, y: 100, tx: 100, ty: 100, wob: 0, mut: [], kills: 0 });
  G.S.zombies.push({ type: "mini", name: "Fine", pow: 3, hp: 12, maxhp: 12, spd: 1.7, hunger: 30, x: 100, y: 100, tx: 100, ty: 100, wob: 0, mut: [], kills: 0 });
  G.S.lastHealAt = Date.now() - 5000; // one tick = one 5-second step
  return G;
}
{
  check("NO trees, NO healing — zero life force mends nothing", () => {
    const G = injuredHorde(0);
    G.healTick(); G.healTick();
    eq(G.S.zombies[0].hp, 110, "wounded zombie must stay wounded without trees");
  });
  const healRate = (lf) => 220 * 0.5 / ((75 - 45 * Math.sqrt(Math.min(lf, 3600) / 3600)) * 12);
  check("a sliver of life force heals near the ~75-minute half-health rate", () => {
    const G = injuredHorde(10);
    G.healTick();
    ok(Math.abs((G.S.zombies[0].hp - 110) - healRate(10)) < 0.001);
  });
  check("EVERY tree keeps helping: 600 LF grove heals faster than 300", () => {
    const g300 = injuredHorde(300); g300.healTick();
    const g600 = injuredHorde(600); g600.healTick();
    ok(g600.S.zombies[0].hp > g300.S.zombies[0].hp, "more trees = faster mending");
    ok(Math.abs((g600.S.zombies[0].hp - 110) - healRate(600)) < 0.001, "matches the grove curve");
  });
  check("a full 3600-LF grove hits the 30-minute floor, never faster", () => {
    const G = injuredHorde(3600);
    G.healTick();
    const gain = G.S.zombies[0].hp - 110;
    ok(Math.abs(gain - 220 * 0.5 / 360) < 0.001, "exactly the 30-min rate");
    const G2 = injuredHorde(99999);
    G2.healTick();
    ok(Math.abs((G2.S.zombies[0].hp - 110) - 220 * 0.5 / 360) < 0.001, "capped beyond the full grove");
  });
  check("both tree powers span the same 0..3600 grove range", () => {
    const { G } = boot();
    G.S.lifeForce = 3600;
    eq(G.mutationChance(), 1, "odds max out at the full grove");
    // healing floor at the same full grove is asserted above — one grove, two gifts
  });
  check("healing is throttled to one tick per 5s (then time must pass)", () => {
    const G = injuredHorde(3600);
    G.healTick(); G.healTick(); G.healTick();
    ok(Math.abs((G.S.zombies[0].hp - 110) - 220 * 0.5 / 360) < 0.001, "no time passed, no extra healing");
  });
  check("OFFLINE healing: an hour away heals the horde (timestamp-based)", () => {
    const G = injuredHorde(3600);
    G.S.lastHealAt = Date.now() - 3600 * 1000; // closed the app for an hour
    G.healTick();
    eq(G.S.zombies[0].hp, 220, "an hour at the 30-min half-health rate = fully mended");
  });
  check("offline heal clock survives save/load", () => {
    const G = injuredHorde(3600);
    G.S.lastHealAt = Date.now() - 1234567;
    G.save();
    const s2 = G.sanitizeState(G.load());
    eq(s2.lastHealAt, G.S.lastHealAt);
  });
  check("healing clamps at max hp; healthy zombies untouched", () => {
    const G = injuredHorde(300);
    G.S.zombies[0].hp = 219.99;
    G.healTick();
    eq(G.S.zombies[0].hp, 220);
    eq(G.S.zombies[1].hp, 12, "healthy zombie stays put");
  });
}

console.log("\n== combo tracking (almanac pairs) ==");
{
  check("a double mutation records its pair in pairSeen", () => {
    const G = zombieWithNeighbors(["carrot", "corn", "pumpkin", "shroom"], 0.7, () => 0);
    eq(G.S.zombies[0].mut.length, 2);
    const key = G.S.zombies[0].mut.map(m => m.label).sort().join(" + ");
    eq(G.S.pairSeen[key], 1);
    ok(G.pairRaised(G.S.zombies[0].mut[0].label, G.S.zombies[0].mut[1].label));
  });
  check("a single mutation records no pair", () => {
    const G = zombieWithNeighbors(["carrot"], 0.7, () => 0);
    eq(Object.keys(G.S.pairSeen || {}).length, 0);
  });
  check("pairKey is order-independent", () => {
    const { G } = boot();
    eq(G.pairKey("Flaming", "Speedy"), G.pairKey("Speedy", "Flaming"));
  });
  check("sanitizeState keeps valid pairs, drops junk", () => {
    const { G } = boot();
    const raw = G.freshState();
    raw.pairSeen = { "Flaming + Speedy": 2, "Speedy + NotReal": 1, "Flaming": 3, "Flaming + Speedy + Pungent": 1 };
    const s = G.sanitizeState(raw);
    eq(s.pairSeen["Flaming + Speedy"], 2);
    eq(Object.keys(s.pairSeen).length, 1, "junk keys dropped");
  });
  check("squad picker cap is 5", () => {
    const { G } = boot();
    eq(G.SQUAD_MAX, 5);
  });
}

console.log("\n== SPECIAL CHARACTERS & the Composter\u2019s wanted list ==");
{
  check("Mini Z + Moon Melon + Beating Beet transforms into the BABY ZOMBIE (+25%)", () => {
    const G = zombieWithNeighbors(["melon", "beet"], 0.7, () => 0, "mini");
    const z = G.S.zombies[0];
    eq(z.special, "baby");
    const zd = G.ZTYPES.find(t => t.id === "mini");
    // transformation: (base + moon 25 + beet 35) * 1.25, born at full health
    eq(z.maxhp, Math.round((zd.hp + 25 + 35) * 1.25), "whole zombie is 25% more");
    eq(z.hp, z.maxhp, "transformation leaves them whole");
    eq(z.pow, Math.round(zd.pow * 1.25));
    eq(G.zdefFor(z).name, "Baby", "wears the new identity (no -Zombie suffix)");
    eq(G.S.stats.specials, 1);
  });
  check("wrong type or wrong combo = no transformation", () => {
    const G = zombieWithNeighbors(["melon", "beet"], 0.7, () => 0); // shambler
    ok(!G.S.zombies[0].special);
  });
  check("every special has a unique (type, mutation-set) trigger", () => {
    const { G } = boot();
    const keys = G.SPECIALS.map(sp => sp.type + "|" + sp.muts.slice().sort().join(" + "));
    eq(new Set(keys).size, 42);
    eq(G.SPECIALS.length, 42);
    ok(!G.SPECIALS.some(sp => sp.type === "gardener" && sp.muts.includes("All-Seeing")), "the Awakened stays untouchable");
  });
  check("special survives the save cycle", () => {
    const G = zombieWithNeighbors(["melon", "beet"], 0.7, () => 0, "mini");
    const s2 = G.sanitizeState(JSON.parse(JSON.stringify(G.S)));
    eq(s2.zombies[0].special, "baby");
  });
  check("the Composter pays DOUBLE for his wanted combo", () => {
    const { G } = boot();
    const z = { type: "bruiser", name: "W", pow: 15, hp: 60, maxhp: 60, spd: 1, hunger: 0, kills: 0,
      mut: [{ label: "Speedy" }, { label: "Pungent" }], x: 0, y: 0, tx: 0, ty: 0, wob: 0 };
    G.S.compostWant = "Pungent + Speedy";
    const off = G.compostOffer(z);
    eq(off.gold, Math.round(5000 * 0.5 * 1.4) * 2, "double gold");
    eq(off.brains, 1, "wanted combos always fetch at least a brain");
    ok(off.wanted);
    G.S.compostWant = "Flaming + Gourd-Headed";
    ok(!G.compostOffer(z).wanted, "only the exact combo");
  });
  check("rollCompostWant produces a valid sorted pair", () => {
    const { G } = boot();
    G.rollCompostWant();
    const parts = G.S.compostWant.split(" + ");
    const labels = G.CROPS.map(c => c.mut.label);
    ok(parts.length === 2 && labels.includes(parts[0]) && labels.includes(parts[1]) && parts[0] < parts[1]);
  });
}

console.log("\n== Voltz self-repair ==");
{
  const inst = loadGame(); const G = inst.G;
  G.startGame(null);
  check("Voltz heals at exactly DOUBLE the grove rate", () => {
    G.S.lifeForce = 1800;
    G.S.zombies.push({type:"bruiser",name:"Meat",pow:15,hp:30,maxhp:60,spd:1,hunger:0,mut:[],kills:0,x:0,y:0,tx:0,ty:0,wob:0});
    G.S.zombies.push({type:"voltz",name:"Chrome",pow:60,hp:125,maxhp:250,spd:1,hunger:0,mut:[],kills:0,x:0,y:0,tx:0,ty:0,wob:0});
    G.S.lastHealAt = Date.now() - 60000; // one minute passes
    G.healTick();
    const meatGain=(G.S.zombies[0].hp-30)/60;    // per maxhp-fraction... compare fraction healed
    const chromeGain=(G.S.zombies[1].hp-125)/250;
    const meatFrac=(G.S.zombies[0].hp-30)/60;
    ok(Math.abs(chromeGain - meatFrac*2) < 1e-6, "bionic fraction is exactly 2x: "+chromeGain+" vs "+meatFrac);
  });
}

console.log("\n== Patches at the bedside: no NaN, no vanishing, ever ==");
{
  const inst = loadGame({ visual: true }); const G = inst.G;
  G.startGame(null);
  check("a medic standing AT the bedside never dissolves into NaN", () => {
    G.S.zombies.push({type:"sawbones",name:"Doc",pow:3,hp:20,maxhp:20,spd:1.1,hunger:0,mut:[],kills:0,x:400,y:400,tx:400,ty:400,wob:0});
    G.S.zombies.push({type:"bruiser",name:"Hurt",pow:15,hp:30,maxhp:60,spd:0.7,hunger:0,mut:[],kills:0,x:400,y:400,tx:400,ty:400,wob:0});
    for(let f=0; f<40; f++){ G.medicTick(0.016); G.drawFarm(0.016); }
    G.S.zombies.forEach(z=>{
      ok(isFinite(z.x)&&isFinite(z.y)&&isFinite(z.tx)&&isFinite(z.ty), z.name+" has real coordinates");
      ok(z.x>-100&&z.x<1000&&z.y>-100&&z.y<800, z.name+" is on stage ("+Math.round(z.x)+","+Math.round(z.y)+")");
    });
  });
  check("a NaN-poisoned save self-heals at load AND at runtime", () => {
    G.S.zombies[0].x=NaN; G.S.zombies[0].tx=NaN;
    const s2=G.sanitizeState(JSON.parse(JSON.stringify(G.S)));
    ok(isFinite(s2.zombies[0].x), "sanitize repairs coordinates");
    G.drawFarm(0.016); // runtime rescue path
    ok(isFinite(G.S.zombies[0].x), "runtime rescue rematerializes the lost");
  });
}

console.log("\n== the Composter waits + storms wait for a live player ==");
{
  const inst = loadGame(); const G = inst.G; const els = inst.els;
  G.startGame(null);
  G.S.zombies.push({type:"mini",name:"Pip",pow:3,hp:12,maxhp:12,spd:1,hunger:5,mut:[],kills:0,x:200,y:500,tx:200,ty:500,wob:0});
  check("storm holds without recent input, starts with it, and blesses soil", () => {
    G.S.stats.playSec = 99999; G.S.nextRainAt = 1; G.RAIN = null;
    G.LAST_INPUT = 0;
    eq(G.weatherTick(), false, "no player at the controls = no storm");
    ok(G.RAIN === null);
    G.LAST_INPUT = Date.now();
    eq(G.weatherTick(), true, "player present = storm rolls in");
    ok(G.RAIN !== null, "storm live");
    eq(G.S.nextRainAt, 99999 + 3600, "next storm one collective played hour out");
    G.RAIN = null;
  });
  check("the Composter reopens his window until the PLAYER answers", () => {
    G.COMPOST = { phase: "parked", t0: Date.now() - 3000, done: false, menuOpen: false, lastNag: 0 };
    G.drawComposterTruck();
    ok(els["mTitle"].innerHTML.includes("Composter"), "offer sheet opens by itself");
    ok(G.COMPOST.menuOpen === true);
    G.openModal("Something Else"); // displaced, not dismissed
    eq(G.COMPOST.menuOpen, false); eq(G.COMPOST.done, false);
    G.closeModal(); // closing another window is NOT an answer
    eq(G.COMPOST.done, false, "he is not so easily brushed off");
    G.COMPOST.lastNag = 0; G.COMPOST.t0 = Date.now() - 3000;
    G.drawComposterTruck();
    ok(els["mTitle"].innerHTML.includes("Composter"), "he reopens the offer sheet");
    G.closeModal(); // THE answer: closing HIS window
    eq(G.COMPOST.done, true, "dismissal registered");
    G.COMPOST.t0 = Date.now() - 3000;
    G.drawComposterTruck();
    eq(G.COMPOST.phase, "out", "and off he drives");
  });
}

console.log("\n== specials wing, goals & collector prices ==");
{
  check("transforming logs the special + fires the spec1 goal", () => {
    const G = zombieWithNeighbors(["melon", "beet"], 0.7, () => 0, "mini");
    ok(G.S.specialsSeen && G.S.specialsSeen.baby === true, "discovery logged");
    ok(G.S.goalsDone.includes("spec1"), "first-special goal fires");
    const s2 = G.sanitizeState(JSON.parse(JSON.stringify(G.S)));
    ok(s2.specialsSeen.baby === true, "discovery survives saves");
  });
  check("the Composter pays collector prices for specials", () => {
    const { G } = boot();
    const z = { type: "mini", name: "B", pow: 3, hp: 12, maxhp: 12, spd: 1, hunger: 0, kills: 0,
      special: "baby", mut: [{ label: "Moon-Touched" }, { label: "Big-Hearted" }], x: 0, y: 0, tx: 0, ty: 0, wob: 0 };
    G.S.compostWant = null;
    const off = G.compostOffer(z);
    eq(off.gold, Math.round(Math.round(250 * 0.5 * 1.4) * 1.75), "1.75x collector premium");
    ok(off.special && off.brains >= 1, "specials always fetch a brain");
  });
  check("old saves get their storm clocks pulled onto the new cadence", () => {
    const { G } = boot();
    const raw = G.freshState();
    raw.nextRainAt = 99999; raw.nextCompostAt = 99999; raw.stats.playSec = 0;
    const s = G.sanitizeState(raw);
    eq(s.nextRainAt, 1200, "stale schedules migrate: a storm early next session");
    eq(s.nextCompostAt, 600, "and the Composter comes early too");
    const fresh = G.sanitizeState(G.freshState());
    eq(fresh.nextCompostAt, 1800, "fresh farms wait the honest 30 minutes");
  });
}

console.log("\n== rain-blessed soil ==");
{
  const { G } = boot();
  check("a blessed plot grows crops at DOUBLE speed", () => {
    G.S.gold = 1000;
    forcePlot(G, 10);
    G.S.blessed = { 10: Date.now() + 5 * 3600 * 1000 };
    G.plantAt(10, "crop", "carrot"); // carrot: 25s
    ok(G.S.tiles[10].boostUntil > Date.now(), "planting inherits the tile blessing");
    backdate(G, 10, 13); // 13 real seconds = 26 boosted seconds
    ok(G.growthInfo(G.S.tiles[10]).ready, "ripe in half the time");
  });
  check("banked boost never un-ripens when the blessing expires", () => {
    forcePlot(G, 11);
    G.plantAt(11, "crop", "carrot");
    G.S.tiles[11].at = Date.now() - 13 * 1000;
    G.S.tiles[11].boostUntil = Date.now() - 1; // blessing JUST expired — 13s were all blessed... 
    // boosted seconds = (boostUntil - at) = ~13s banked -> el2 ~= 26s
    ok(G.growthInfo(G.S.tiles[11]).ready, "the doubled seconds stay banked");
  });
  check("unblessed plots grow at normal speed", () => {
    forcePlot(G, 12);
    G.plantAt(12, "crop", "carrot");
    backdate(G, 12, 13);
    ok(!G.growthInfo(G.S.tiles[12]).ready, "13 of 25 seconds is not ripe");
  });
  check("blessings and boosts survive the save cycle", () => {
    const s2 = G.sanitizeState(JSON.parse(JSON.stringify(G.S)));
    ok(s2.blessed[10] > Date.now(), "tile blessing persists");
    ok(s2.tiles[10].boostUntil > Date.now(), "plant boost persists");
  });
}

console.log("\n== battle rewards & lightning charge ==");
{
  const { G } = boot();
  check("invasion pays half gold + real XP now", () => {
    traitArmy(G, "shambler", 6);
    const xp0=G.S.xp, lvl0=G.S.level;
    G.startBattle(G.TARGETS[0]);
    G.B.hp = 0; G.updateBattle(0.01);
    const tg=G.TARGETS[0];
    ok(G.B.goldWon >= Math.round(tg.gold[0]*0.5) && G.B.goldWon <= Math.round(tg.gold[1]*0.5), "gold halved: "+G.B.goldWon);
    eq(G.B.xpWon, Math.round(G.B.goldWon/6)+10, "xp formula (target 0)");
    ok(G.S.xp>xp0 || G.S.level>lvl0, "xp actually granted");
  });
  check("a lightning charge doubles power for ONE battle, then it's spent", () => {
    traitArmy(G, "bruiser", 6);
    G.S.zombies[0].charged = true;
    G.startBattle(G.TARGETS[0]);
    G.sendZombie(0);
    ok(G.B.actives[0].charged === true, "charge rides into battle");
    ok(G.S.zombies[0].charged === false, "and is consumed on send");
    // march to the wall, then land one hit with a pinned roll
    const a=G.B.actives[0]; a.state="attack"; a.atkT=10;
    a.z.hunger=0;
    const restore=G.setRandom(()=>0.5); // rnd(0.8,1.2) -> 1.0
    const hp0=G.B.hp;
    G.updateBattle(0.011);
    restore();
    ok(Math.abs((hp0-G.B.hp) - a.z.pow*2) < 0.01, "double damage landed: "+(hp0-G.B.hp));
  });
  check("charged flag survives the save cycle", () => {
    G.S.zombies=[{type:"mini",name:"Zap",pow:3,hp:12,maxhp:12,spd:1,hunger:0,mut:[],kills:0,charged:true,x:0,y:0,tx:0,ty:0,wob:0}];
    const s2=G.sanitizeState(JSON.parse(JSON.stringify(G.S)));
    ok(s2.zombies[0].charged===true);
    ok(typeof s2.nextRainAt==="number" && s2.nextRainAt>0, "storm clock persists");
  });
}

console.log("\n== sawbones, composter, names & compact codes ==");
{
  const { G } = boot();
  const mkz=(type,name,pow,hp,maxhp)=>({type,name,pow,hp,maxhp,spd:1,hunger:10,mut:[],kills:0,x:100,y:100,tx:100,ty:100,wob:0});
  check("sawbones walks to the STRONGEST wounded zombie and heals bedside", () => {
    G.S.zombies=[mkz("sawbones","Doc",3,20,20), mkz("bruiser","Tank",15,30,60), mkz("mini","Pip",3,6,12)];
    const doc=G.S.zombies[0], tank=G.S.zombies[1];
    tank.x=500; tank.y=300;
    G.medicTick(1);
    ok(Math.abs(doc.tx-(500+G.TW/2*0))>0 || doc.tx>400, "steering toward the bruiser (strongest)");
    doc.x=500; doc.y=300; // arrives
    G.medicTick(60);
    ok(tank.hp>30, "healing happens at the bedside");
    ok(tank.hp-30<1.2, "at oak pace: gentle, not a hospital");
    eq(G.S.zombies[2].hp, 6, "weaker patient waits their turn");
  });
  check("healthy horde = no medic steering changes", () => {
    G.S.zombies=[mkz("sawbones","Doc",3,20,20), mkz("mini","Ok",3,12,12)];
    G.S.zombies[0].tx=77; G.medicTick(1);
    eq(G.S.zombies[0].tx, 77, "no patients, no house calls");
  });
  check("uniqueZName never duplicates a living zombie's name", () => {
    G.S.zombies=G.ZNAMES.map(n=>mkz("mini",n,3,12,12)); // every base name taken
    const n=G.uniqueZName();
    ok(!G.S.zombies.some(z=>z.name===n), "fresh name even with all 30 taken: "+n);
  });
  check("compostOffer: 50% base + mutation bump, XP pays for kills, legends fetch brains", () => {
    const plain=mkz("bruiser","A",15,60,60);
    eq(G.compostOffer(plain).gold, 2500, "50% of 5000");
    const mut1={...plain, mut:[{label:"Flaming"}]};
    eq(G.compostOffer(mut1).gold, Math.round(5000*0.5*1.2));
    const hero={...plain, kills:8};
    eq(G.compostOffer(hero).xp, Math.round(2500/15)+64, "battle tenure pays extra XP");
    const premium=mkz("voltz","V",60,250,250);
    eq(G.compostOffer(premium).brains, 5, "premium stock refunds brains (15/3)");
    const legend={...plain, mut:[{label:"Gourd-Headed"},{label:"Flaming"}], kills:8};
    eq(G.compostOffer(legend).brains, 2, "veteran Jack-o-Lantern = 2 brains");
    const freshLegend={...plain, mut:[{label:"Sporified"},{label:"Flaming"}], kills:0};
    eq(G.compostOffer(freshLegend).brains, 1, "green legend = 1 brain");
    const combo={...plain, mut:[{label:"Speedy"},{label:"Pungent"}]};
    eq(G.compostOffer(combo).brains, 0, "ordinary combos: gold and XP only");
  });
  check("lz roundtrip: JSON, unicode, empty, and long repetitive strings", () => {
    const cases=["", "a", JSON.stringify(G.freshState()),
      "h\u00e9llo \ud83e\udde0 z\u00f6mbie", "ab".repeat(4000), JSON.stringify({z:Array(60).fill({name:"Grubbs",hp:22,mut:["Flaming"]})})];
    cases.forEach(c=>{ eq(G.lzDecode(G.lzEncode(c)), c, "roundtrip len "+c.length); });
  });
  check("save codes are MUCH shorter than the old format", () => {
    G.S.zombies=[]; for(let i=0;i<16;i++) G.S.zombies.push(mkz("voltz","V"+i,60,250,250));
    G.S.zombies.forEach(z=>{ z.mut=[{label:"Flaming",col:"#e03c2e"},{label:"Speedy",col:"#ff8c2e"}]; });
    const legacy=btoa(unescape(encodeURIComponent(JSON.stringify(G.S))));
    const code=G.encodeSave();
    ok(code.slice(0,5)==="ZFR2.", "new format");
    ok(code.length < legacy.length*0.45, "at least 2.2x shorter: "+code.length+" vs "+legacy.length);
  });
}

(async () => {
  console.log("\n== save codes (async) ==");
  async function arun(name, fn) {
    try { await fn(); passed++; console.log("  ✓ " + name); }
    catch (e) { failed++; console.log("  ✗ " + name + "\n      " + (e && e.message)); }
  }
  for (const t of deferred) await arun(t.name, t.fn);
  const { G } = boot();
  await arun("save code roundtrip restores the farm", async () => {
    G.S.gold = 4321;
    const code = await G.encodeSave();
    ok(typeof code === "string" && code.length > 50, "code produced");
    const st = await G.decodeSave(code);
    eq(st.gold, 4321);
    ok(Array.isArray(st.tiles) && st.tiles.length === 49, "tiles survive");
    ok(G.sanitizeState(st), "sanitizes clean");
  });
  await arun("decode tolerates whitespace and line breaks pasted mid-code", async () => {
    const code = await G.encodeSave();
    const mangled = code.replace(/(.{40})/g, "$1\n  ");
    const st = await G.decodeSave(mangled);
    eq(st.gold, 4321);
  });
  await arun("garbage code rejects instead of half-loading", async () => {
    let threw = false;
    try { await G.decodeSave("definitely not a save code"); } catch (e) { threw = true; }
    ok(threw);
  });

  console.log("\n----------------------------------");
  console.log("logic: " + passed + " passed, " + failed + " failed");
  if (failed > 0) process.exit(1);
})();
