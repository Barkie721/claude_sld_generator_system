# ELECTRICAL NARRATIVE — SPROUTS OFFICE BUILDING (V1_0_0)
# Project: Sprouts Office Building — 2000 A Service | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Source: Mayo's verbal scope, 2026-07-28. Two ambiguities were resolved by
# direct question before composition and are marked [ASKED] below. Everything
# else stated here is either as-dictated or a documented Tier-2 default logged
# in §8 and in metadata.compositor_notes[].
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service size: **2000 A at 480 V**  `[REQUIRED — stated]`
- Service voltage: 480Y/277V  *(Tier-2 default)*
- Configuration: 3 phase, 4 wire  *(Tier-2 default)*
- Utility transformer: **2000 kVA**, 13.2 kV primary — 480Y/277V secondary  **[DERIVED]**

  Mayo asked that the utility transformer kVA be derived and the fault current
  derived from it. The derivation:

  ```
  required kVA = 2000 A × 480 V × √3 / 1000 = 1662.8 kVA
  next standard pad-mount size                = 2000 kVA
  2000 kVA FLA at 480 V, 3Φ = 2,000,000 / (480 × √3) = 2405.6 A
  ```

  2000 kVA is the smallest standard size that fully supports the stated 2000 A
  service (2405.6 A = 120 % of the service rating). The alternative — 1500 kVA,
  1804 A — cannot carry the full 2000 A and yields a lower fault current, so it
  is the *less* conservative choice on both counts.

- Utility metering: CT metering in the switchboard metering section  *(Tier-1 auto-include)*
- Available fault current: **DERIVED, not utility-provided** → see HALT-002 and §1.1.

### 1.1 Fault-current derivation — worst case, as requested

Mayo directed that impedances be assumed so as to produce the **worst case**
(maximum) fault current. Worst case for fault duty = **minimum** impedance and an
**infinite** primary bus. Both assumptions are stated, not looked up — the
`transformer_impedance_V1_0_0.json` data layer covers dry-type distribution units
15–500 kVA only and has no 2000 kVA row.

**Service entrance / main switchboard bus:**

```
assumed %Z, 2000 kVA liquid-filled pad-mount        = 5.75 %   (industry typical)
IEEE C57.12.00 manufacturing tolerance              = −7.5 %
worst-case %Z = 5.75 × 0.925                        = 5.319 %
I_sc = 2405.6 A / 0.05319 = 45,229 A                ≈ 45.2 kA symmetrical
```

Assumed X/R = 8.0 (typical 2000 kVA pad-mount) for asymmetrical duty. No motor
contribution is included — no motor schedule was provided.

**Switchboard AIC: 65 kAIC.** 45.2 kA exceeds the 42 kA standard rating, so the
next standard short-circuit rating applies (`nec_standard_ratings_V1_0_0.json`).

**208 V transformer secondaries** — these ARE data-layer values. Worst case uses
each unit's `percent_z.low` from `transformer_impedance_V1_0_0.json` with an
infinite bus on the primary:

| Transformer | kVA | %Z (low) | Secondary FLA | Worst-case I_sc |
|---|---|---|---|---|
| 4T-1-A / 4T-1-B (plug) | 75 | 4.4 | 208.2 A | **4,731 A** |
| 4T-2-A (mechanical) | 45 | 3.4 | 124.9 A | **3,674 A** |
| 4T-R-A (roof mechanical) | 30 | 2.3 | 83.3 A | **3,621 A** |

**480 V fault current downstream of the switchboard is NOT calculated** — that
needs feeder lengths, which were not provided (HALT-001). For AIC selection every
480 V device downstream of the main bus is conservatively bounded by the 45.2 kA
bus value, since fault current only decreases with distance.

## 2. BUILDING

- Occupancy: **office**  `[STATED]`
- Gross area: **50,000 SF**  *(informational)*
- Levels: **4 storeys plus roof**. Level lines drawn on R, 4, 3, 2, 1.
- Main electrical room: Level 1 *(assumed)*

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A
- 2000 A bus, 480Y/277V, 4W 3PH, **65 kAIC**, two-level bus (main + secondary)
- Main device: 2000 AF / 2000 AT, 3P, LSIG **with ground-fault protection**
  *(Tier-1 auto-include — NEC 230.95, main ≥ 1000 A. Cannot be suppressed.)*
- Neutral-to-ground bond at the service entrance *(Tier-1 auto-include — NEC 250.24(C))*

### Sections (left to right)
1. `incoming` — SEC-1
2. `metering` — SEC-2 (utility meter, CT clamp on the main bus)
3. `main_breaker` — SEC-3 (2000 AF/2000 AT GFP main)
4. `distribution` — SEC-4 (six feeder breakers)
5. `distribution` — SEC-5 (four spare breakers, four spaces, N-G bond at the far right)

### Fire pump
**None** — explicitly out of scope.

### Emergency / standby
**None** — explicitly out of scope. No generator, ATS, or emergency lineup.
Nothing was defaulted in; emergency power is an architecture decision, not a
Tier-2 default.

### Distribution breakers (full schedule)

Listed in bus order, west to east.

| Tag | Frame / Trip | Poles | Serves | Chain |
|-----|--------------|-------|--------|-------|
| CB-04 | 400AF / 400AT | 3P | 4M-1-A — 400 A 480Y/277V mechanical panel, Level 1 | A — Direct Panel |
| CB-01 | 250AF / 225AT | 3P | 4L-1-A — 225 A 480Y/277V lighting panel, riser base | A — Direct Panel |
| CB-02 | 250AF / 125AT | 3P | 4T-1-A — 75 kVA transformer → 208 V plug riser A | B — Transformer + Panel |
| CB-05 | 800AF / 800AT | 3P | 4M-R-A — 800 A 480Y/277V rooftop mechanical panel | A — Direct Panel |
| CB-03 | 250AF / 125AT | 3P | 4T-1-B — 75 kVA transformer → 208 V plug riser B | B — Transformer + Panel |
| CB-06 | 800AF / 800AT | 3P | BLR-1 — 500 kW boiler equipment connection | D — Terminal Load |
| SPARE-01…04 | 400AF / 400AT | 3P | SPARE (4 ea), SEC-5 | — |
| SPACE-01…04 | — | — | SPACE only (4 ea), SEC-5 | — |

The order is a pure drafting choice — all six are the same class — and two things
constrain it. **CB-04 is westmost** because 4M-1-A's branch is the only one
carrying a second full column (its whole 208 V mechanical riser), and that riser
is placed by drifting west off its parent; at the west end it drifts into open
margin instead of onto a neighbouring riser. **The two Chain-B plug transformer
columns (4T-1-A, 4T-1-B) are kept apart** by the roof column between them —
adjacent Chain-B columns put one transformer's label block inside the other's
glyph extent (R-007 / `glyph_collision`).

Transformer primary OCPDs are **not chosen values** — CB-02 and CB-03 at 125 AT
are the 75 kVA primary OCPD from `3_phase_transformer_feeder_schedule_V1_0_0.json`
(one_line_tag 1253).

⚠️ **Connected breaker capacity exceeds the bus.** Feeder trips total 2475 A
(225 + 125 + 400 + 800 + 125 + 800) against a 2000 A bus, before the four 400 A
spares. This is normal and depends on demand diversity — but **no connected-load
schedule was provided**, so no demand calculation was performed and the adequacy
of the 2000 A service is unverified. See HALT-003.

### Lighting riser — 480Y/277V, a CASCADE

| | L1 | L2 | L3 | L4 |
|---|----|----|----|----|
| Panel | 4L-1-A 225 A MLO | 4L-2-A 100 A MLO | 4L-3-A 100 A MLO | 4L-4-A 100 A MLO |
| Fed from | CB-01 | 4L-1-A `feed_top` | 4L-2-A `feed_top` | 4L-3-A `feed_top` |
| Feeder tag | 2254 | 1004 | 1004 | 1004 |

Three hops here; the deepest chain on the sheet is the mechanical branch at five,
so `layout_config.subfeed_max_depth` is **5** — it must EXCEED the chain depth. Exits are `feed_top` throughout: the child is always on a higher
floor, and a `feed_bottom` exit would make each run dive below its parent and
hook back up. Upper-floor OCPD is internal to each parent panel per its own
panel schedule.

### Plug-load risers — two branches, each a CASCADE  `[ASKED]`

Mayo's dictation ("subfeed to levels two and four from the level one panel") was
ambiguous; asked and answered: **each branch cascades L1 → L2 → L3 → L4**, so
every floor is served by both branches.

| Branch | Transformer | L1 | L2 | L3 | L4 |
|---|---|----|----|----|----|
| A | 4T-1-A 75 kVA | 2P-1-A 250 A **MCB** | 2P-2-A 250 A MLO | 2P-3-A 250 A MLO | 2P-4-A 250 A MLO |
| B | 4T-1-B 75 kVA | 2P-1-B 250 A **MCB** | 2P-2-B 250 A MLO | 2P-3-B 250 A MLO | 2P-4-B 250 A MLO |

The 250 A secondary OCPD (`one_line_tag` 2504T) sits in **each L1 panel's main**,
which is what protects the secondary tap conductors — NEC 240.21(C). Hence MCB,
not MLO. Bonding jumper #2 AWG, GEC #2/0 AWG per the transformer schedule.

Every panel in both branches is **250 A**, per Mayo's instruction (R-009); the
cascade feeders are `feeder_schedule` tag **2504** (1 set, 3 1/2" C, (4)500 AL +
#4 CU GND), up from tag 2254 at the previous 225 A.

⚠️ **Flagged for the EOR.** With every panel in a branch at 250 A and its
Level-1 head also 250 A, the branch main carries no diversity allowance in the
drawing: 2P-1-A's full rating is nominally passed up to 2P-2-A, and so on. That
is normal where demand diversity is real, but **no connected-load schedule was
provided** (HALT-003), so nothing here verifies it. The ratings are as
instructed, not as calculated.

### Mechanical — 480 V panel at Level 1 with a 208 V cascade above it

- **4M-1-A**: 400 A MLO, 480Y/277V, Level 1, fed from CB-04 (tag 4004).
- **4T-2-A**: 45 kVA, 480Δ–208Y/120V, fed from 4M-1-A (tag 703). Its primary OCPD
  is **100 AF / 70 AT** — the 45 kVA primary OCPD from the transformer schedule —
  and it lives in **4M-1-A's panel schedule**, not on this drawing.
- **Drafting (R-005):** the branch is drawn with 4M-1-A and 2M-1-A both on the
  Level-1 row and 4T-2-A in the lane between them, one level below. 4M-1-A's own
  incoming feeder F-316 is Z-routed off its breaker column so it clears the
  transformer's label block. The 45 kVA secondary F-318 is deliberately left to
  dogleg rather than draw plumb — a plumb run would double back on itself and
  cut through the transformer, because a transformer chain on the sub-feed path
  exits its secondary by dropping below the unit first.

  ⚠️ **This is a representation change, not an electrical one, and it is forced
  by a renderer limit.** Modelled the obvious way, as a breaker `internal_to`
  4M-1-A, the transformer and 2M-1-A drew correctly but **the three upper-floor
  208 V mechanical panels were silently dropped** — 13 entities gone. The engine
  runs `placeSubFeeds` before `placeInternalChains`, so nothing hanging off an
  internal chain is reachable by the sub-feed pass. Feeding the transformer
  directly from the panel puts the whole branch in the sub-feed pass, where the
  cascade above it places correctly. Not drawing a transformer's primary OCPD is
  a deviation from normal one-line practice — flagged for the EOR. Note the
  rooftop 30 kVA branch is unaffected and keeps its drawn internal breaker,
  because nothing cascades above it.
- 208 V mechanical cascade, rated to **match the 45 kVA secondary OCPD** as Mayo
  directed — 150 A (`one_line_tag` 1504T):

| | L1 | L2 | L3 | L4 |
|---|----|----|----|----|
| Panel | 2M-1-A 150 A **MCB** | 2M-2-A 150 A MLO | 2M-3-A 150 A MLO | 2M-4-A 150 A MLO |
| Feeder tag | 1504T | 1504 | 1504 | 1504 |

The 150 A secondary OCPD sits in 2M-1-A's main — NEC 240.21(C). Bonding jumper
#4 AWG.

### Rooftop mechanical

- **4M-R-A**: 800 A MLO, 480Y/277V, roof, fed from CB-05 (tag 8004, 3 sets).
- **4T-R-A**: 30 kVA, 480Δ–208Y/120V, fed from a 100AF/50AT breaker **internal to
  4M-R-A** (primary OCPD 50 A, tag 503).
- **2M-R-A**: 100 A MCB, 208Y/120V, roof — the 30 kVA secondary OCPD (100 A,
  `one_line_tag` 1004T) sits in the panel main per NEC 240.21(C). Bonding jumper
  #6 AWG.

### Boiler — terminal load (Chain D)  `[ASKED]`

- **BLR-1**: 500 kW equipment connection, 480 V 3PH, fed from CB-06.
- Sizing basis asked and answered: **resistive, PF 1.0**.

  ```
  FLA = 500,000 / (480 × √3) = 601.4 A
  601.4 × 125 % (continuous)  = 751.8 A
  next NEC standard rating     = 800 A
  ```

  CB-06 is 800 AF / 800 AT; feeder tag 8003 (3-wire — a resistive boiler has no
  neutral), 3 sets, 3" C, (3)500 AL + #1/0 CU GND.

  *The documented Tier-2 default is PF 0.90, which would have given 668 A × 125 % =
  835 A → a 1000 A breaker. Mayo selected the unity-PF basis; logged as NOTE-005.*

### Spares and spaces

Four 400 A / 3P spare breakers and four spaces, all consolidated in SEC-5 with
the N-G bond at the far right (R-006, R-008). An earlier revision parked two of
the spaces mid-lineup as lane separators for the mechanical branch; that job is
now done by putting CB-04 at the west end instead, so the six live feeder
breakers sit together with no gaps.

## 4. EMERGENCY / STANDBY POWER

**None** — out of scope, per §3.

## 5. FEEDER DISTANCES  `[T3-EOR]`

**NOT PROVIDED** → HALT-001. No voltage-drop calculation was performed, no A-5
tags are placed, and 480 V downstream fault-current attenuation is not computed.

## 6. SHEETS & LAYOUT  `[LAYOUT]`

- Single sheet: **S1 / E-501** — "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER"
- 30×42 Arch E1, 96 px/in
- `floor_order` / `level_order`: `["R","4","3","2","1"]` — five rows.
  ⚠️ `floor_order` must be the per-sheet OBJECT form `{"S1":[...]}`; a flat array
  silently falls back to the literal hospital stack in `_sheetFloorStackBottomUp`.
- **Four riser stacks**, but a `normal` sheet floor-bands only TWO *named* stacks
  (`floor_anchors` + `floor_anchors_mechanical`). The other two are listed in
  `floor_band_designations` (OFF-009):
  - `floor_anchors` → lighting stack (4L-1-A…4L-4-A) + roof anchor 4M-R-A
  - `floor_anchors_mechanical` → 208 V mechanical stack (2M-1-A…2M-4-A)
  - `floor_band_designations` → both plug stacks (2P-x-A, 2P-x-B)
- `subfeed_max_depth: 5` — the mechanical branch is five hops
  (4M-1-A → 4T-2-A → 2M-1-A → 2M-2-A → 2M-3-A → 2M-4-A) and the key must exceed
  the chain depth.
- `subfeed_straighten` on every riser cascade hop, so each riser draws as one
  plumb column instead of drifting ~100 px west per level and doglegging. The two
  mechanical transformer-chain hops (F-317, F-318) are deliberately **excluded** —
  see §3, they must dogleg.
- `chain_dst_x_offset` Z-routes F-316 off CB-04's column so 4M-1-A's own feeder
  clears 4T-2-A's label block.
- Every hospital-golden default naming hospital designations is explicitly
  cleared — absent keys fall back to the engine's `_DEF_*` hospital values, which
  would anchor this drawing to devices that do not exist here.
- `layout_config` is embedded in the topology AND written as the sidecar
  `sprouts_layout_config.json`.

## 7. KEYNOTES & OMISSIONS

- A-6 keynotes: none `[T3-EOR — both placement and text]`
- A-4 fault-current tags: placed where a value was actually derived — the utility
  transformer, the main bus, and the four 208 V transformer secondaries. Not placed on 480 V devices
  downstream of the switchboard, where no value was calculated (HALT-001).
- Omitted from topology: fire pump, generator, ATS, SPD, roof-level equipment
  beyond the mechanical panel and its step-down, motors, and all terminal loads
  other than the boiler — no mechanical or equipment schedule was provided.

## 8. TIER-2 OVERRIDE LEDGER

`TIER 2 OVERRIDE confirmed: boiler equipment-connection sizing basis = PF 1.00
(resistive) (default was PF 0.90)` — see NOTE-005.

All other defaults stand as listed above.

## 9. COMPLETENESS

Stage 1–3 complete and validated. Not a construction document.

> This SLD is for design development and coordination. It requires review and seal by a
> licensed Professional Engineer before construction use.
