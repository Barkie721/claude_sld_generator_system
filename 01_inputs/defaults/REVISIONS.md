# Default Commercial — 2500 kVA Service — revision log: every change requested after the drawing was generated

> **Canonical:** `00_Docs/project_instructions_V1_0_0.md` §7.1 owns the change-request protocol;
> this file is the per-project record it writes to.

**Log at fix-time, not request-time.** The config edit is already happening; the discipline is one
entry alongside it. A request you decided NOT to act on still gets an entry with `wontfix` — those
are often the most informative, because they are where the drawing is right and the expectation was
wrong.

**Why this exists:** OFF-021, OFF-028 and OFF-029 were three faces of one engine bug, found
separately across four phases and re-derived each time. `scope: engine-suspect` entries across
projects are the harvest — sweep them when deciding what engine work is worth doing. A shape
repeating in two projects is an `FL-XXXX` candidate.

This log **feeds** `10_failure_log/`, it does not replace it. FL is cumulative across every project,
which a per-project log structurally cannot be — and that cumulative property is the entire value.

```
7_revisions/REVISIONS.md      per project · raw · cheap · EVERY request, including vague ones
        │
        │  repeats across projects, or traces to engine behavior
        ▼
10_failure_log/ FL-XXXX       repo-global · defect + NAMED GUARD
        │
        │  fix is big enough to schedule
        ▼
11_future_updates/ FU-XXXX    prioritized P0–P3 with Effort + Readiness
```

---

## 1. Issue history — mirrors the `DELIVERY.md` revision table

The title block already renders a REVISIONS table (`titleblock_template_30x42_V1_0_0.html:55`, six
rows, filled bottom-up), so these rows are drawing data, not just bookkeeping.

| Rev | Date | Description | Seal status |
|-----|------|-------------|-------------|
| 6 | 2026-07-28 | Level 2/3 raised to 650 pitch — clears an A-1 tick penetrating 2P-2-A | unreviewed |
| 5 | 2026-07-28 | Riser pitch tightened 700 -> 540; level 2/3 content lowered | unreviewed |
| 4 | 2026-07-28 | Branches reordered lighting-power-mechanical; all feeder tags right-aligned | unreviewed |
| 3 | 2026-07-28 | Risers straightened to plumb columns; mechanical fan converted to cascade | unreviewed |
| 2 | 2026-07-28 | Power branch to 150 kVA step-down + 208 V plug-load cascade; level spacing tightened | unreviewed |
| 1 | 2026-07-28 | Added 3 storeys, power riser (4P) and mechanical riser (4M) | unreviewed |
| 0 | 2026-07-28 | Issued for coordination — single-level Tier-2 default composition | unreviewed |

---

## 2. Change requests

Newest at the top.

### R-011 · 2026-07-28
**Asked:** "theres a collission F-307, 2P-2-A. maybe raise the panel amd sec9ndar feeder, along with the adjacent?"
**Actually wrong:** A REAL collision that every checker missed, caught by eye. **F-307's A-1 TICK
penetrated 2P-2-A's box by 6 px.** The tick is drawn +/-8 px across its own run at the tag anchor, and
at the R-010 pitch of 540 that anchor sat 2 px below the panel's bottom edge.
**Why nothing caught it:** `check_symbol_clash` section B tests the PILL rect, not the tick;
`check_tag_feeder_clash` **explicitly excludes a tag's own tick** ("the tick is drawn on the line on
purpose"); and `check_tick_detach` asks the opposite question — whether a tick has come OFF its run.
A tick sitting ON its run but INSIDE a panel is in nobody's remit. `--audit` does not see it either.
**The mechanism, which is the part worth keeping:** the A-1 tag is pinned a **FIXED 90 px along the
run from its exit**, and F-307's exit is 2P-1-A's top at y 3798 — a position the pitch does not move.
So `fy` is **3708 at every pitch**; only the child panel and its level line travel. F-307's run is
`step - 448` px long, so at 540 the run was 92 px and the 90 px anchor landed 2 px from its far end.
**Fixed by:** `riser_step_standard` 540 -> **650**, exactly as suggested — raising the L2 panels
(2P-2-A and the adjacent 4M-2-A) and their feeders away from the fixed tag. Solved as a constraint
rather than guessed, because `fy` is fixed:

| step | 2P-2-A bottom | L2 line | tick vs panel | pill vs level line |
|------|---------------|---------|---------------|--------------------|
| 540 | 3706 | 3746 | **PENETRATES 6 px** | clear 22.5 |
| 560 | 3686 | 3726 | clear 14 | clear 2.5 — marginal |
| 580 | 3666 | 3706 | clear 34 | **LINE CROSSES PILL** |
| 600 | 3646 | 3686 | clear 54 | clear 6.5 — marginal |
| **650** | **3596** | **3636** | **clear 104** | **clear 56.5** |

⚠️ **560–600 is an unusable band** — the level line sweeps across the pill as it rises. 650 is the
first pitch with real margin on both constraints.
**Cost:** 220 px of sheet height. Final **2404 x 2352** — still 32% shorter than the engine default
and 100 px shorter than the R-006 value. The alternative that keeps 540 is
`a1_tag_placement['F-307'].dy: +64`, dropping the tag below the level line into the 52 px pocket
above 2P-1-A, but that leaves ~10 px margins against 56–104 px here.
**Scope:** `engine-suspect` — not the geometry, the checker coverage. **An A-1 tick inside a device
box is unguarded by all eight checkers plus `--audit`.** Strong FL candidate: extend
`check_symbol_clash` section B to test tick arms as well as pill rects.
**Promoted:** — (flagged; next free ID FL-0009)

### R-010 · 2026-07-28
**Asked:** "can we tighten the sld some more . the space between level 1 and 2 is not 100% b3ing used
see light tighten that up amd lower the level 2 content"
**Actually wrong:** Nothing broken — density. Measured before: the LEVEL2->LEVEL1 band was 1274 px
tall carrying 738 px of ink (**58%**), and LEVEL3->LEVEL2 was 700 px carrying 176 px (**25%**).
**Fixed by:** `riser_step_standard` 700 -> **540**. Level 2 sits at `baseline - step`, so a smaller
step lowers it; level 3 follows at `baseline - 2*step` and the sheet shortens by twice the reduction.
Plus `a1_tag_placement['F-307'].pill_dx: 20` (see below).
**540 is the floor, found by sweeping, and the edge is sharp:**

| step | result |
|------|--------|
| 700 / 600 / 560 | clean |
| **540** | **clean — chosen** |
| 530 | F-307 penetrates ITS OWN CHILD 2P-2-A by 18 px (`collinear_v=1`, `through_symbol=1`) |
| 480 | the above PLUS `line_through_device=2`, `out_of_band=2` |

⚠️ **The binding constraint is the POWER column, not the mechanical one.** `2P-1-A` is a Chain-B
panel (behind 4T-2-A) so it sits at y 3798, ~360 px ABOVE the floor-1 row where the Chain-A `4M-1-A`
sits at 4158. Gap between L2 and L1 panels: **power 92 px vs mechanical 452 px** at the final pitch.
Power runs out first, and F-307 plus its tag has to live in that gap. Any further tightening has to
start by lowering 2P-1-A, which is chain geometry, not a config key.

**One thing measured clean but READ tight, and was fixed anyway.** A right-side pill always starts at
`run + 32`, which is exactly the panel's right edge (a 64-wide box centred on the run). At 540 the
F-307 run is only 92 px, so its pill sat high enough to share 13.5 px of vertical range with
2P-2-A's box. The intersection has **zero width**, so `check_symbol_clash` correctly read 0 — but the
pill visibly touched the panel corner. `pill_dx: 20` moves the pill alone and stretches the leader,
leaving 20 px to the panel and 30 px to the mechanical column. ⚠️ Not `dx` (carries the tick off the
run, FL-0008) and not `pill_dy` (moving down the run crosses the level-2 line at y=3746).

**Result:** sheet **2404 x 2132** (was 2452 at step 700, 3452 at the engine default 1200 — a **38%**
height reduction overall). LEVEL2->LEVEL1 now 1114 px at **66%** ink, LEVEL3->LEVEL2 540 px at
**33%**. Every checker 0, audit `ok`, `band_outside=2` unchanged. Sheet stays width-bound at
s = 1.0000 throughout, so this bought real vertical density rather than a scale change.
**Scope:** `preference`
**Promoted:** —

### R-009 · 2026-07-28
**Asked:** "can we make sure that the feeder tags are all aligned so that they're on the right side
and then the other thing would be can we move the branches around so that lighting is first then
power and then last mechanical"
**Actually wrong:** Nothing — a drafting-order request. The bus read power, mechanical, lighting
(that order was itself the `R-007` fix), and the four riser tags sat on the LEFT from `R-008`.
**Fixed by:** `sec-204.device_ids` -> `CB-02 (lighting), CB-01 (power), CB-03 (mechanical), N-G bond`,
and all four riser tags to `side: 'right'`. The other five tags (2503 / 5004T / 4004 / 1253 / 2504T)
already defaulted right, so the sheet is now uniform. Columns land evenly at **980 / 1170 / 1360**.
**⚠️ The predicted collision happened, and it needed a real fix.** The requested order puts the two
Chain-B TRANSFORMER columns ADJACENT — precisely the arrangement `R-007` avoided by parking mechanical
between them. `--audit` returned `glyph_collision 1` on 4T-1-A x 4T-2-A again.
**No config key can widen that lane, and this is worth knowing:**
- `chain_column_nudge` (OFF-017) only reaches INTERNAL tap columns — it is read inside
  `placeInternalChains`, and these transformers are bus-fed Chain B.
- `DIM.breaker_pitch_min` and `DIM.panel_clearance` are NOT in the `pick()` list; column pitch is
  computed from the width-contribution model and is not configurable.
- Relocating the N-G bond as a spacer does nothing: an L1-3 renders LAST in the section regardless of
  its position in `device_ids` (tested — it stayed at x 1450).
- **Root cause, engine-suspect:** the width model budgets a panel half-width (70) and +30 for a TX
  primary tag pill, but NOT the transformer's LABEL BLOCK, which extends ~147 px right of centre.
  The computed pitch was 190 px where the spaced label needed ~192.
**Cleared by fixing a house-style divergence, not by fudging geometry.** Both transformers carried
`'480Δ - 208Y/120V'` (16 chars) inherited from the pre-delete flat topology; **the golden's own
notation is `'480Δ-208Y/120V'` (14 chars, no spaces around the dash)**. Matching the golden shortens
the label block by 14.4 px and opens the clearance from **17.6 px to 32.0 px**. Audit `ok`.
⚠️ The colliding label is the WESTMOST transformer's (4T-1-A) — its block runs east into its
neighbour. Fixing only 4T-2-A's string changed nothing; the first attempt did exactly that because
the two entries were written with different escapes (`'480\u0394 - …'` vs a literal `Δ`).
**Scope:** `preference` for the order; `engine-suspect` for the width model under-budgeting a
transformer label block.
**Promoted:** — (FL candidate alongside R-007: same root cause, now seen twice)

### R-008 · 2026-07-28
**Asked:** "straighten up the lin up and rotate feeder double check there there are no clashes other wise redesign where need to make space 2P-2-A, 2P-3-A, F-310, F-307"
**Actually wrong:** The 208 V cascade was drawn as a STAIRCASE, not a column. Each hop drifted
**100 px west per level** (2P-1-A centre 995, 2P-2-A 895, 2P-3-A 795 — the documented lighting/mech
drift constant) and every hop drew a 4-vertex dogleg: up 90, west 100, up again. Measured clearance
before: **2P-2-A sat 26 px from 4M-2-A**, the tightest pair on the sheet.
**Fixed by:** `subfeed_straighten: ['F-307','F-310','F-308','F-309']` (OFF-027) — snaps each child's
centre X to its feeder's exit X, so `exitX == landingX`, the two corner vertices go colinear and the
polyline collapses to ONE vertical. Plus a topology change: **the mechanical riser was converted from
a depth-1 fan to a cascade** (`r-309` now starts at 4M-2-A, not 4M-1-A). Plus all four riser tags to
`side: 'left'`.
**Why the fan had to go — three attempts failed first, recorded so nobody retries them:**
1. `subfeed_exit_pitch: {'4M-1-A': 64}` to stop F-308's A-1 tick (drawn ±10 px across its own line)
   touching F-309 at 4.7 px. It worked, but shortened F-309's dogleg from 95 px to 68 — under its own
   76 px pill — so the pill then overlapped F-309's own riser.
2. `pill_below` on F-309: the pill then hit F-309's own *exit stub* instead. A jog bounded by two
   verticals 68 px apart cannot hold a 76 px pill above OR below.
3. `dst_x_offset: 60` on r-309 to widen the jog eastward: **x=1345 is the LIGHTING column**
   (2L-1-A / 4T-1-A), so F-309 ran straight through 2L-1-A's box and collinear with F-304T —
   `collinear_v=1`, `feeder_x_device=1`, `through_symbol=1`, audit `feeder_crossing=1`. East is not
   available. A two-exit fan cannot be made clean in this lane spacing at any setting; one exit per
   panel removes the whole class.
**Result — three plumb columns, evenly spaced, every checker 0 and audit `ok`:**

| | before | after |
|---|---|---|
| 2P column | 995 / 895 / 795 (staircase) | **995 plumb** |
| 4M column | 1185 / 1085 / 1285 (fan) | **1185 plumb** |
| 2P-2-A nearest neighbour | **26 px** (4M-2-A) | **126 px** |
| 2P-3-A nearest neighbour | 226 px | 126 px |
| F-307 / F-310 nearest parallel feeder | 90 px (F-308) | **190 px** |
| F-307 / F-310 / F-308 / F-309 | 4-vertex doglegs | **all PLUMB** |

Tags rotated as a consequence, exactly as asked: a dogleg carries a horizontal-orient pill above its
jog, a plumb run carries a vertical-orient pill beside it. All four flipped WEST — east of the
mechanical column the lighting box starts at x=1313, leaving ~20 px, while west has 126.
**Scope:** `preference` for the straightening; the fan→cascade conversion is `project-only`.
**Promoted:** — (the "two exits on one panel top cannot be tag-cleaned in a tight lane" result is
worth an FL if it recurs)

### R-007 · 2026-07-28
**Asked:** (found by `--audit` during the R-005 build, not by the user) `glyph_collision 1` on d-307 x d-308.
**Actually wrong:** With CB-01 and CB-02 adjacent on the bus, the two Chain-B transformer columns sat
side by side and **4T-2-A's label block ran into 4T-1-A's glyph extent** — 17.6 px of clear air
between the label's last character and the neighbouring symbol rect. `--audit` bounds a glyph
INCLUDING its label; `check_symbol_clash` compares device RECTS only, so it read 0 while the audit
read 1. ⚠️ **Stage 14's closing `checks non-zero:` line covers only the `4_checks` RESULT keys —
`make_results.mjs:171` filters `checks`, never `audit`** — so a non-zero glyph_collision is recorded
in `RESULTS.json` and printed by stage 7, but is absent from the summary line most people read.
**Fixed by:** topology change — reordered `sec-204` to `CB-01, CB-03, CB-02, NG` so the mechanical
(Chain A) column separates the two transformer columns. All three breakers are the same class, so
left-to-right is a pure drafting choice. No config nudge needed.
**Scope:** `project-only` — though the reporting gap is worth a look on its own.
**Promoted:** —

### R-006 · 2026-07-28
**Asked:** "I feel like we have a lot of space between levels can we tighten up the single line"
**Actually wrong:** Nothing broken — `riser_step_standard` was at the engine default 1200, sized for
the golden's full per-floor cluster against this project's one panel per floor.
**Fixed by:** `riser_step_standard: 700`. Chosen by SWEEP, not preference — 700 is the tightest value
that stays clean with no tag override:

| step | sheet | s | per storey on paper | result |
|------|-------|---|---------------------|--------|
| 1200 | 2406x3452 | 0.8368 | 10.46 in | clean (was) |
| 900 | 2406x2852 | 1.0000 | 9.38 in | clean |
| **700** | **2404x2452** | **1.0000** | **7.29 in** | **clean — chosen** |
| 600 | — | — | — | `tag_on_symbol=1` (r-307 pill on a box) |
| 500 | — | — | — | F-307 routes THROUGH ITS OWN CHILD 2P-2-A |

⚠️ The paper gap shrinks far less than the pixel gap until `s` hits its clamp at 1.0 (below ~938 px
here) — above that the composer just scales the drawing back up, so reductions only bite once `s` is
pinned. This supersedes `R-004`, which measured the same key on the pre-cascade topology and left it
at the default; the ask changed.
**Scope:** `preference`
**Promoted:** —

### R-005 · 2026-07-28
**Asked:** "for the power panel can we instead do a 150 KVA Step Down Transformer that [feeds] to a
[208] volt panel from on level one and then from that level one panel it would sub be to plug load
panel level 2 and from level two it will sub be to level three"
**Actually wrong:** Nothing — a design change. The power branch was CB-01 -> 4P-1-A (480 V, Chain A)
with a depth-1 fan to levels 2/3.
**Fixed by:** topology change. CB-01 retripped 400AF/**250**AT (the 150 kVA primary OCPD per
`3_phase_transformer_feeder_schedule_V1_0_0.json`), then 4T-2-A 150 kVA 480D-208Y/120V (%Z 4.35,
X/R 2.95 — impedance-table midpoints) -> 2P-1-A 500 A **MCB** (the 500 A secondary OCPD lives in the
panel main, NEC 240.21(C)) -> 2P-2-A (L2) -> 2P-3-A (L3). Feeder tags 2503 / 5004T / 2254 / 2254, all
data-layer lookups. `subfeed_max_depth` 1 -> 3, `floor_anchors` retargeted to the 2P stack,
`level_map` updated, and both `a1_tag_placement` overrides DELETED — the cascade exits `feed_top`
and never dives, so the jog corridor that needed `pill_below` no longer exists.
**⚠️ This is the repo's first true CASCADING riser** (2 hops; the golden only ever fans at depth 1).
The compounding-offset family (OFF-021/028/029) lives in `_s2FloorYOffset`, which is emergency-sheet
only — and the normal-sheet cascade proved **exact**: `check_level_bands` §3 reads 40 / 40 on levels
2 and 3 with no constant-difference ladder, which is the documented signature of that bug.
**Scope:** `preference`
**Promoted:** — (the depth-2 result is a coverage fact worth keeping: a normal sheet does not compound)

### R-004 · 2026-07-28
**Asked:** (raised during the R-002 fix, not by the user) the sheet carries ~1100 px of empty vertical per storey.
**Actually wrong:** Nothing. `riser_step_standard` defaults to 1200 px, sized for the golden's full
per-floor cluster; this project has one panel per floor per riser. MEASURED the alternative rather
than assuming: at 600 the sheet is 2414x2252 and composes at s = 1.0000 using 84% of the page height
with 11 px text at 0.1146 in; at 1200 it is 2414x3452, composes at 0.8368 filling the page height,
text at 0.0959 in — closer to the golden's 0.0455 in. Shrinking the pitch does not fill the white
space, it shrinks the drawing on the same sheet. The emptiness is device density, not pitch.
**Fixed by:** nothing — left at the engine default 1200. Both settings pass every checker with the
level grid intact (40/40/614). Reasoning recorded in the build script beside the key.
**Scope:** `wontfix`
**Promoted:** —

### R-003 · 2026-07-28
**Asked:** (found by stage 12, not by the user) 2 of 6 level-mapped devices outside the 180 +/- 250 px datum tolerance.
**Actually wrong:** Nothing in this project. The base-floor level line deliberately folds in
`SW_ENVELOPE_BOTTOM_Y` (4800) — it is drawn under the switchboard envelope, not under the Level-1
panels — so the L1 datum gap is 614 px while L2/L3 sit at 40 px. Measured the FROZEN GOLDEN's own S1
geometry: 4L-1-A gap 614, 4L-2-A gap 40, 4L-3-A gap 40. **Identical to the pixel.** The acceptance
row is miscalibrated for normal sheets — the 180 px figure came from emergency-sheet pitch work — and
the golden would fail it 2-of-6 with the same config.
**Fixed by:** nothing in the drawing. `ACCEPTANCE.md` §3 records the measurement and §5 names it as a
template defect: `_PROJECT_TEMPLATE/ACCEPTANCE.md` ships this row as `target 0 outside`, which is
unachievable on any normal sheet carrying a switchboard.
**Scope:** `engine-suspect` — not the engine's geometry, the checker's target. FL-XXXX candidate:
`check_level_bands` should exempt the base floor of a sheet with a switchboard, or state a separate
base-floor target.
**Promoted:** — (flagged to Mayo, not yet logged; next free ID is FL-0009)

### R-002 · 2026-07-28
**Asked:** "so I don't see the mechanical panels and the level lines I was looking for with this viewer can you tell me what's wrong"
**Actually wrong:** Nothing was broken. The topology had no mechanical panel and declared no floors —
`level_order: []`, `level_map: {}`, so `geometry.level_lines` was `[]`. That was the documented
Tier-2 default for a service with no stated storeys (narrative §2), and the sidecar deliberately
CLEARS the engine's hospital `_DEF_*` floor keys; had they been left absent the drawing would have
banded to hospital devices that do not exist here.
**Fixed by:** topology change — 3 storeys, CB-03 + 4M-1-A/2-A/3-A mechanical riser, 4P-2-A/3-A power
riser, 5 new R-1 feeders and 10 A-1/A-2 annotations; `floor_order` (object form), `floor_anchors`,
`floor_anchors_mechanical`, `level_map`, `level_order` populated. Both risers are depth-1 FANS off
the Level-1 panel, mirroring the golden — not cascading chains.
**Scope:** `preference` — the drawing was correct for what it was asked to draw; the ask changed.
**Promoted:** —

### R-001 · 2026-07-28
**Asked:** (found by stage 2b, not by the user) OPEN_ITEMS.md printed `undefined` in every halt column.
**Actually wrong:** The halt objects carried the older 4-key shape (`reason`/`affects`).
`make_open_items.mjs` reads the 5-key shape — `id, topic, text, nec_reference, blocks` — and greps
`text` for placeholder markers. The old shape still validates clean and still counts 3 halts, so
nothing else catches it; only the ledger goes blank.
**Fixed by:** topology change — rewrote `compositor_halts[]` to the 5-key shape and added
`compositor_notes[]` (4 keys, no `blocks`) for the Tier-2 defaults.
**Scope:** `project-only`
**Promoted:** —

---

## Naming

`R-NNN` sequential within the project, never reused. **Scope is the mining key.** Verbatim matters in
the `Asked` line — "still some messiness" is a real data point precisely because it is not yet a
diagnosis, and unaided judgement has beaten the checkers more than once. This is the only place that
signal is captured.
