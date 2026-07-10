# ZOMBIE FARM RESURRECTION — ART BIBLE & COMPLETE ASSET INVENTORY
### A design brief for a full visual remake. Copy this entire document into Claude Design.

---

## 1. THE PROJECT

Zombie Farm Resurrection is a finished, working, fan-made tribute to the classic 2010 mobile farming genre: you plow an isometric field, grow crops AND zombies, mutate zombies by planting them next to ripening crops, and send squads to invade themed enemy locations. It runs as a single-file HTML5 canvas game on iPhone Safari and desktop Chrome.

**Your job:** design a complete replacement graphic kit for EVERY visual in the game — characters, crops, terrain, UI, battle worlds, effects, icons. Everything listed in Section 4 needs new art.

**Target look:** the warm, chunky, cute-spooky quality of late-2000s mobile farm games — glossy, rounded, thick-outlined, instantly readable at small sizes — but **100% original**. I will attach reference screenshots of the vibe I love; capture the *quality and warmth*, never copy a character, layout, asset, or logo. No real people, no existing IP.

**Current style (keep the soul, raise the quality):** bobblehead proportions, oversized googly eyes (one bigger than the other), thick dark-plum outlines (#33244a), flat colors with one shade + one highlight, wobble/bob animation, everything slightly crooked and hand-made. The redesign can evolve this — richer shading, cleaner silhouettes, more personality — but characters must stay CUTE-dead, not gross-dead.

---

## 2. GLOBAL STYLE GUIDE (deliver this first — everything else obeys it)

Deliver a one-page style guide defining:

- **Palette**: a named master palette (~24 colors): grass greens (day + night-tinted), dirt browns (dry/tilled/moist), zombie skin greens (4-5 tones), wood tones, UI gold/cream, danger red, magic purple, night blues, plus per-crop accents. Include hex codes.
- **Outline rule**: color + weight relative to asset size (currently 4-6% of asset height, dark plum).
- **Shading rule**: light direction (top-left), one shade tone + one highlight per surface, no gradients on characters (gradients OK on skies/UI).
- **Proportion sheet**: zombie body ratios for the five size classes: SMALL (mini), NORMAL, BIG, HULK (huge belly, hunched), COLOSSUS (tiny head, mountain body). Head:body roughly 1:1.2 for normal — bobblehead.
- **Isometric spec**: field tiles are 2:1 diamonds (width = 2× height). All terrain art must sit on this grid. Camera angle is a classic ~30° farm-game view, no perspective distortion.
- **Readability floor**: every character must read at 40px tall; every icon at 20px.

---

## 3. DELIVERY FORMAT (how to hand assets back)

- **Transparent-background PNG sprite sheets, @2x resolution**, grouped per section below, PLUS the master palette/style page.
- Name things exactly as listed (e.g. `crop-carrot-stage2.png`, `zombie-jester-idle.png`).
- Where an asset animates, deliver 2-4 keyframes side by side (walk wobble = 2 frames; flame flicker = 2; water = 2).
- Character sheets: front-facing ¾ view (the game only uses one facing).
- Sizes given below are the on-screen display size — deliver at 2×.

---

## 4. THE COMPLETE ASSET INVENTORY

### 4A. APP & BRAND (5 assets)
1. **Game logo**: "ZOMBIE FARM" chunky display lettering (currently Luckiest Guy font, green with dark outline + drop) — a drawn logo version welcome.
2. **"RESURRECTION" wooden plank sign**: horizontal wood board, grain, a nail head each end, white hand-painted letters.
3. **App icon** 512px: a single charming zombie face/bust on a dusk sky (current: shambler under a moon). Needs 512, 192, 180 crops + a maskable-safe version.
4. **Splash background scene**: layered dusk sky (deep purple → orange → green field), rolling hill, picket fence line, 2 gravestones, moon with craters, twinkling stars, 2 bats, 5 fireflies. A parade strip where 3 zombies walk across.
5. **Loading/empty-state cosmetic** (optional flourish).

### 4B. HUD & CORE UI (18 assets)
6. **Resource pill capsule**: dark green rounded capsule, lighter border, inner top highlight (38px tall).
7. **Gold icon**: faceted gold NUGGET with glints (21px). NOT a coin.
8. **Brain icon**: we intentionally use the standard 🧠 emoji — SKIP, no asset needed.
9. **Zombie-count icon**: unmistakable zombie head — flat-top messy hair, uneven googly eyes, forehead stitch, one tooth (21px).
10. **Health/heart icon**: glossy red heart with a small stitch seam (21px).
11. **XP bar**: dark wood trough + juicy green fill + rounded ends.
12. **Buttons — green** (Market/Continue): glossy grass-green, thick dark-green border, bottom ledge shadow, states: normal / pressed / disabled(grey) / toggled(gold outline).
13. **Buttons — red** (INVADE/New Farm): same in danger red.
14. **Hamburger menu button** + open state (✕).
15. **Modal window frame**: wooden panel — header plank (title bar) + darker body, corner joints; close ✕ button as a small wood block.
16. **Market tab strip**: 3 tabs (Crops / Zombies / Trees), active vs inactive.
17. **Shop row card**: item art slot + name/description area + buy button; plus a "locked" (silhouette + level tag) variant.
18. **Toast/notification lozenge**: dark wood pill with green border.
19. **Planting-mode banner**: green capsule showing the seed icon + text.
20. **Goal row card**: parchment-ish row, done-state (stamped/checked).
21. **Almanac combo card**: small framed card, 3 states: RAISED (green glow border), possible (plain), unknown (dashed border + "?" face).
22. **Cursor set (desktop)**: 40px "seed in hand" cursor per plantable category is generated from item art automatically — just ensure produce icons read at 40px; plus a **spade cursor**.
23. **Progress/rank bar** (almanac): wood trough + green fill.

### 4C. FARM TERRAIN & AMBIENCE (16 assets)
24. **Grass base**: warm green field texture direction (subtle tufts, tiny flowers — yellow + pink, sparse).
25. **Dirt apron**: the dark soil diamond under the whole field, with mottled patches.
26. **Field tile — grass** (unplowed, inside fence): subtle checker tint variation.
27. **Field tile — plowed plot**: dark tilled diamond with 3 furrow ridges.
28. **Field tile — fertilized overlay**: moist darker soil + white/pale-green granules dusted along furrows with tiny shadows.
29. **Picket fence**: posts with pointed caps + two rails, white with grey weathering; needs straight runs for all 4 diamond edges (front rails are shorter/offset).
30. **Entrance path**: worn dirt track with stepping stones + edge grass.
31. **Ready-to-harvest arrow**: bouncing green arrow marker.
32. **Tap ripple**: white expanding ellipse.
33. **Cloud shadows**: 2 soft drifting blobs.
34. **Night kit**: moonlit blue overlay tone, 18 twinkling stars, 6 fireflies (glow dot + halo), 2 flying bats, soft moonbeam shaft.
35. **Butterflies**: 2 (pink, blue), flapping.
36. **Harvest pop**: produce icon popping up + fading.
37. **Coin/gold float text style** + particle puffs (dirt brown, gold sparkle, green heal sparkle, white confetti).
38. **Gravestone set**: 3 silhouettes (rounded, broken-top slab, white cross) with R.I.P engraving, moss, grass tufts; plus **emerging green hand** (rising stages) and **risen fist/thumbs-up** moment.
39. **Speech/thought bubbles**: thought bubble (with 3 fillings: rainbow, butterfly, music note), hungry bubble (brain filling, drooling variant), and a "BRAINS!" speech bubble with tail.

### 4D. YARD DECORATIONS (8 vignettes)
40. **Scarecrow**: patched purple coat, burlap head with stitched grin + button eye, floppy hat, straw wrists, a crow perched on its arm (+1 circling crow), 2 pumpkins at the base.
41. **Wishing well**: stone ring (visible stones), shingled red roof on posts, crank, rope + swaying bucket, flowers at base.
42. **Hay corner**: 2 hay bales (twine, straw texture) + leaning pitchfork + loose straw.
43. **Mailbox & crates**: blue mailbox with red flag + cobweb, 2 stacked wooden crates, 1 barrel.
44. **Fairy ring**: 7 small mushrooms in a circle (purple/red caps) — glows faintly at night.
45. **Pumpkin patch**: winding vine, big leaves, 3 pumpkins.
46. **"ZOMBIE XING" sign**: wooden signpost, tilted board, small skull on top.
47. **(New, optional) 1-2 extra yard props** in the same voice: wheelbarrow, bird bath, or crooked lamppost.

### 4E. CROPS — 10 crops × 5 states each (50 assets)
For EACH crop: `stage1 sprout` / `stage2 mid` / `stage3 ripe on plot` / `wilted` (grey-brown droop) / `produce icon` (the harvested item, used in market + popups + cursor, must read at 40px).

48. **Carrot** — orange taper, leafy top.
49. **Corn** — golden cob, husk, silk tuft.
50. **Pumpkin** — classic ribbed, curly stem.
51. **Gloomshroom** — purple-capped spooky mushroom, pale spots, faint glow.
52. **Ghost Pepper** — red hot pepper with a tiny ghost-flame wisp off the stem.
53. **Moon Melon** — pale mint moon-cratered melon, soft glow.
54. **Wormy Apple** — glossy red apple, a happy googly-eyed worm bobbing from a hole.
55. **Beating Beet** — heart-shaped crimson beet that visibly THUMPS (2 frames), root rings, heartbeat blip accent.
56. **Eyeball Berries** — a vine cluster of 3 eyeball-berries (different iris colors) whose pupils wander together, bloodshot veins.
57. **Grave Garlic** — pale grumpy bulb (closed cross eyes, frown), scraggly shoot, green stink wisps, one fainted fly.

### 4F. TREES — 5 types (10 assets: tree + night/glow variant where noted)
58. **Gnarly Oak** — classic bumpy canopy.
59. **Weeping Willow** — draped fronds.
60. **Spooky Tree** — bare crooked branches, wispy purple canopy, pale spirit sparkles; **glows with drifting spirit motes at night**.
61. **Bone Birch** — trunk of stacked bones with knuckle joints + a skull knot, pale sage canopy with rib-shaped leaf arcs.
62. **Lantern Tree** — gnarled black tree whose FRUIT are tiny glowing jack-o'-lanterns on strings; **halos intensify at night**.

### 4G. ZOMBIES — 12 characters (each: idle/walk 2-frame wobble + battle lunge pose)
Shared: bobblehead, uneven googly eyes, stitched smile w/ one tooth, zig-zag shirt hem, little flies orbiting when hungry.

63. **Shambler** — everyday zombie, RED PLAID shirt.
64. **Mini Z** — tiny, quick, adorable; small class.
65. **Headless** — no head on shoulders; carries own head under arm (head still shows expressions/mutations).
66. **Gardener** — mint green skin, STRAW HAT (iconic — keep readable), gentle face, gardening apron/overalls.
67. **Bruiser** — big class, purple, barn-door build.
68. **Banshee** — pale blue, wispy, faint white glow aura.
69. **Abomination** — HULK class: huge hunched patchwork oaf; heaving pear belly stitched from OTHER zombies' skin patches (a green patch, a purple patch, crooked center seam, thread-X belly button), long limp arms with oversized 3-finger paws, enormous dopey underbite with 2 snaggle tusks, animated drool strand. Dumb + huggable + terrifying.
70. **Grave Digger** — mustard shirt, YELLOW HARDHAT (with a dent), shovel slung across the back.
71. **Jester** — teal skin, purple/teal two-prong JESTER HAT with gold bells, gold-and-teal diamond motley tunic.
72. **Chef** — pale green, white puffy TOQUE, white coat, carrying a dripping ladle.
73. **Gravemound** — COLOSSUS class: mossy walking hillside, tiny head sunk in shoulders, cracked R.I.P gravestone embedded in his back, moss tufts.
74. **Golden Shambler** — the shambler design entirely in gleaming gold tones with a soft glow (a trophy/secret unlock — make him feel SPECIAL).
75. **(SECRET — design it, never label it in any player-facing sheet) "The Awakened"** — a gardener transformed: SAME straw hat + mint skin, but a heavier big-class frame, dark tattered coat, furious V-brows, small fangs, chest claw-scars, white talons, faint green aura. Menacing boss-energy while clearly still "the gardener."

### 4H. MUTATIONS — 10 visual zones (worn ON any zombie; all combos of 2 must stay visually distinct)
Each mutation OWNS a body zone so any pair reads clearly. Deliver each as an overlay/attachment sheet on a neutral zombie:

76. **Speedy** (carrot) — orange headband + winged red sneakers + motion lines. Zone: brow + feet.
77. **Kernel-Powered** (corn) — corn-cob gauntlet forearms + kernel studs on shoulders. Zone: arms/shoulders.
78. **Gourd-Headed** (pumpkin) — head replaced by a pumpkin (eyes/mouth carved-ish but cute). Zone: whole head.
79. **Sporified** (gloomshroom) — purple mushroom cap hat + drifting spores. Zone: head-top cap.
80. **Flaming** (ghost pepper) — flame hair licking upward (2 frames). Zone: head-top fire.
81. **Moon-Touched** (moon melon) — pale glowing aura + tiny crescent on forehead + 2 orbiting stars. Zone: surrounding aura.
82. **Wormfriend** (wormy apple) — a proud chunky worm pal emerging from the side of the head, googly eye, rosy cheek. Zone: head-side.
83. **Big-Hearted** (beet) — glowing pulsing heart visible on the chest. Zone: chest.
84. **All-Seeing** (eyeball berries) — a large third eye on the forehead (with lashes) that tracks. Zone: forehead. (On hats/caps it sits ON the hat.)
85. **Pungent** (garlic) — green stink cloud + wavy wisps from the mouth + one fainted fly. Zone: breath/mouth-side.

**Special combo art (must be designed):** Gourd-Headed+Flaming = glowing jack-o'-lantern head · Sporified+Flaming = flames flaring from under the cap · Sporified on a straw hat = mushrooms sprouting from the hat · All-Seeing on Gourd = carved glowing third eye.

### 4I. BATTLE WORLDS — 8 complete scene kits
Each scene kit = **sky treatment + celestial + horizon layer + ground + path + 1 grand landmark + ambient critter + BUILDING (with 5 damage-crack stages) + DEFENDER character + PROJECTILE + shared brawler pose** (the defender charges out to melee — needs a running pose).

86. **Old MacDoughnut's Farm** — warm sunset, sun rays, red barn (white X door, hayloft with farmer), hay bales, windmill, crop rows, silo, pecking chickens. Defender: overalls farmer, straw hat. Projectile: tomato.
87. **Law Offices of Grim & Grimmer** — dusk downtown, skyline with lit windows, billboard ("GRIM & GRIMMER — WE SUE ZOMBIES"), sidewalk + crosswalk + streetlight + hydrant, pigeons, manhole steam. Building: grey office tower w/ LAW sign. Defender: suit lawyer with bowler. Projectile: fluttering legal papers.
88. **Pirate Cove** — bright sea sky, sun glint on water, beach sand w/ shells + starfish, palm, rocky island, passing distant ship, gulls, crab, buoy. Building: beached pirate ship (sail, skull flag, portholes). Defender: pirate w/ eyepatch + tricorn. Projectile: cannonball.
89. **Ninja Dojo** — pink dusk, giant rising-sun disc, snowcapped mountains, torii gate, pagoda silhouette, bamboo, stepping stones, drifting petals, floating paper lanterns. Building: dojo w/ curved tiered roof, red door, lanterns. Defender: masked ninja. Projectile: spinning shuriken.
90. **Robot Factory** — smoggy industrial sky, crane, smokestacks, power pylons, hazard-stripe yard, rivets, sparking cable, patrol bot critter. Building: factory w/ sawtooth roof, rotating gear emblem, chimney smoke. Defender: boxy robot (red eyes). Projectile: spinning gear.
91. **Haunted Mega-Mall** — sunset parking lot, painted arrows, lampposts w/ moths, benches, stray cart, roadside pylon sign ("MEGA MALL", flickering), sweeping searchlights, escaped balloon, flickering "OPEN 24/7". Building: boxy mall w/ glass atrium, faint ghost inside, neon strips, flickering MEGA MALL roof sign, sad SALE banner. Defender: mall cop w/ cap + badge. Projectile: giant salted pretzel.
92. **Wizard's Tower** — deep night, aurora ribbons, stars, pine forest, distant crooked academy towers, glowing rune stones, fairy ring, creeping fog, hopping toad, rising spell motes. Building: crooked stone spire, purple pointed roof w/ crescent finial, glowing arched windows, orbiting spellbooks, potion smoke. Defender: bearded wizard w/ star-spangled hat. Projectile: fizzing potion bottle w/ sparkle trail.
93. **Lunar Lab (finale)** — black starfield, Earth in the sky, comet, satellite, crater-rim horizon, grey regolith w/ craters + rocks + bootprints, lander module, little rover w/ blinking headlight, low-grav dust. Building: white geodesic dome (panel seams, porthole w/ nervous scientist, airlock w/ warning light, antenna dish, flag). Defender: astronaut in bubble helmet. Projectile: tumbling moon rock.

### 4J. BATTLE UI (8 assets)
94. **Squad bench card**: 64×86 card w/ mini zombie, name plate, hp sliver — states: ready (gold border), FIGHTING (green), dead (X + greyed), WAIT-locked (dark + countdown).
95. **Enemy name plate + HP bar** (red) and **zombie mini HP bar** (green).
96. **Battle timer plaque**: small wooden sign.
97. **Damage crack decals** (5 progressive) that overlay any building.
98. **VICTORY! / REPELLED! result lettering** + loot panel + brain-won trophy moment + confetti.
99. **Squad picker row states**: GOING (green arrow badge) vs benched (zzz).
100. **Screen-shake/chomp-lunge** need no art; **debris/goo particle sprites** (wood bits, green goo blobs) do.

---

## 5. PRIORITY ORDER (deliver in waves so the game upgrades zone by zone)
1. Style guide + palette (everything depends on it)
2. Zombies (all 12 + mutation zone sheet) — the stars
3. Crops + trees + gravestones
4. Farm terrain + fence + decorations + night kit
5. UI kit (pills, buttons, modals, icons)
6. Battle worlds (one scene at a time, farm first)
7. Splash/logo/app icon

## 6. HARD RULES
- 100% original art. Reference screenshots define QUALITY & WARMTH only — no copied characters, assets, layouts, or logos, no Playforge property, no real people.
- Every mutation pair (55 combos) must stay visually distinguishable — zones may not cover each other.
- Keep the cute-dead tone: kids-cartoon spooky, zero gore.
- Everything must read on a 390px-wide phone screen.
- Free fan project: no watermarks/branding in assets.

---
*Prepared by the project's build engineer (Claude Code). The game logic, animations, and integration are already handled — every asset above has an exact slot waiting for it.*
