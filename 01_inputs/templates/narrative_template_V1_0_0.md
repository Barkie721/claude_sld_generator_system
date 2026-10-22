# ELECTRICAL NARRATIVE TEMPLATE — SLD GENERATOR (V1_0_0)
# Project: ______________________ | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Blank narrative template. Fill it in, save it per-project at
# `09_tests/<Project>/1_source/<project>_SLD_narrative_V1_0_0.md` — `.md` or
# `.txt`, either is fine — and hand it to the compositor. Scaffold that folder
# first with `cp -r 09_tests/_PROJECT_TEMPLATE "09_tests/<Project>"`:
# `1_source/` is the authored half of a project, and everything downstream of
# it is regenerable (see `09_tests/README.md`). Structure mirrors the
# hospital golden narrative (power-flow order, service → distribution →
# emergency → sheets), but deliberately omits what the compositor derives
# itself: device IDs (d-xxx), routed-element IDs, object counts, and section
# tags. State the design; let the pipeline build it.
#
# Carries defect-journal findings D-1..D-9 from the template test run
# (see that session's handoff) — reworded §4
# architecture options, corrected §5 distance/tag semantics, documented the
# layout_config embedding and COMPOSITOR_HALT contract representations,
# chain-B primary-breaker and ATS field guidance, compositor schema pointer.
# -----------------------------------------------------------------------------

## 0. HOW TO USE THIS TEMPLATE

**Minimum viable narrative.** Only one field is truly mandatory: **service size
(kVA)**. Every other omitted field is defaulted per
`00_Docs/project_instructions_V1_0_0.md` §1.2 and logged as an assumption.
A one-liner like *"1500 kVA 480V office, 3 floors, two step-down transformers
for 208V lighting panels"* is a valid narrative. This template exists for when
you want to use the capability to its fullest — pre-answering every default,
override, and EOR input so composition runs without halts or blind defaults.

**Tier tags** (from the `sld_topology_rules_V1_0_0.md` §1 decision authority):

| Tag | Meaning |
|-----|---------|
| `[REQUIRED]` | Compositor must ask if missing. Cannot default. |
| `[T2-DEFAULT: x]` | Tier 2 — omitted → default `x` applied and logged. To override, state it explicitly (see §8 ledger). |
| `[T3-EOR]` | Tier 3 — omitted → `COMPOSITOR_HALT` placeholder on that branch. Never fabricated. |
| `[LAYOUT]` | Consumed at layout time (`layout_config` / `layout_hints`, schema §19/§20). Omitted → hospital-golden engine defaults. |

**Rules:**
- **Delete sections that don't apply** (e.g. all of §4 if there is no
  emergency/standby power). Don't leave blank headings — an empty section is
  ambiguous; a deleted one means "not in this design."
- Designations follow `equipment_designation_legend_V1_0_0.json`:
  `[PowerType][Voltage][Equipment]-[Level]-[Identifier]` (e.g. `4L-1-A` =
  480V lighting panel, Level 1, instance A).
- Non-negotiable NEC elements (§9) are auto-included. Don't spend narrative
  text requesting them — and don't request their removal.
- Prose is fine anywhere; tables are for enumerable inventories (breakers,
  ATS units, distances, keynotes).
- **Compositors:** this template is filler-facing. The connection/port dialect
  (feeder endpoints, `port_assignments`, bus taps, cross-sheet pairs) and the
  id-rebase rules are normative in `sld_topology_schema_V1_0_0.md` §6/§10/§16
  — compose against those, not against this template's prose.

---

## 1. SERVICE

- Service size: ______ kVA  `[REQUIRED]`
- Service voltage: ______  `[T2-DEFAULT: 480Y/277V]`
- System type: ______  `[T2-DEFAULT: 3Φ 4W]` — feeder schedule covers 3W/4W
  only; single-phase or delta will be noted as out-of-schedule.
- Utility transformer: ______ kVA, ______ kV primary → ______ secondary,
  %Z ______, winding ______ (delta-wye…), owned by ______
  *(impedance calc_fields auto-populate from `transformer_impedance_V1_0_0.json`
  where the lookup matches; a miss becomes `DATA_LOOKUP_MISS`, never a guess)*
- Utility feeder (to main switchboard line side), if dictated by the utility:
  ______ sets, ______ conduit, ______ conductors + ______ GND
  *(omit → sized by Tier-1 lookup from `feeder_schedule_V1_0_0.json`)*
- Utility available fault current: ______ kA  `[T3-EOR]` — needed for the
  bus-bracing / AIC adequacy check (DV-4) and every A-4 fault-current tag;
  typically from the utility letter.
  *If left blank, the compositor omits `available_fc` everywhere, places no
  A-4 tags, and records the halt in `metadata.compositor_halts[]` (schema
  open-objects rule) — never as a placeholder string inside a calc field
  (that would falsely trigger TV-5). The validator will report CLEAN on a
  halted topology: the halt ledger, not the validator, is the completeness
  record.*

## 2. BUILDING

- Type / use: ______  `[T2-DEFAULT: commercial]`
- Stories / levels: ______  `[T2-DEFAULT: single-level basement — no level
  lines unless floors are listed]`
- Level list, top → bottom (drives level lines and the riser stack, e.g.
  `Roof (R), Level 3 (3), Level 2 (2), Level 1 (1)`): ______  `[LAYOUT]`
- Gross area: ______ SF *(informational)*
- Main electrical room location: ______ *(informational)*

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — ______ (designation)
- Bus: ______ A, ______ V, ______ kAIC, single- or two-level: ______
- Main device: main breaker ______ AF / ______ AT (trip type ______) or MLO
- Construction notes (UL 891, NEMA, SER, SPD on bus, ARMS…): ______
- *Auto-included, no need to ask:* GFP on mains ≥1000 A (NEC 230.95), N-G bond
  at service entrance (NEC 250.24(C)), utility meter, A-1/A-2 tags on every
  non-stub-exempt feeder.

### Fire pump *(delete if none)*
- Fire pump: ______ HP, ______ FLA, ______ LRA, ______ V
- Fire pump breaker rating: ______ AF / ______ AT  `[T3-EOR]` — EOR must
  confirm per NEC 695.4(B)(2) locked-rotor basis (a provisional §3 algorithm
  exists but does not substitute for confirmation).
- Section position: ______  `[T2-DEFAULT: left of main breaker]` — either
  position taps the main bus ahead of the main disconnect (NEC 695.4(B),
  non-negotiable).

### Distribution breakers (full schedule)

| CB | AF/AT/Poles | Trip | Feeds (designation + description) | Chain | Floor |
|----|-------------|------|-----------------------------------|-------|-------|
| CB-01 | / /3P | | | | |
| CB-02 | / /3P | | | | |
| …  | | | | | |
| CB-nn | 225/225/3P | — | SPARE | — | — |
| SPACE | — | — | SPACE only | — | — |

**Chain column — the 7 feeder chain variants** (`sld_topology_rules` §5),
pick per downstream device:

| Chain | Pattern | Use when |
|-------|---------|----------|
| A | CB → feeder → panelboard | Direct 480V panel feed (most common) |
| B | CB → feeder → transformer → feeder → panel | Step-down 480→208Y/120V |
| C | CB → feeder → ATS source input | Normal source of a transfer switch |
| D | CB → feeder → terminal load | Fire pump / motor / equipment connection |
| E | CB → feeder → SPD (Mode A) | Dedicated-breaker surge protection |
| F | CB → feeder → disconnect → feeder → device | Inline disconnect required |
| G | panel → feeder → panel (no explicit CB) | Panel-to-panel sub-feed |

*(Feeder conductor sizing, tags, and callouts are Tier-1 lookups — do not
specify them for normal LV feeders unless overriding.)*

**Chain B primary breaker:** the transformer's primary breaker defaults to the
`3_phase_transformer_feeder_schedule_V1_0_0.json` primary OCPD for its kVA
(Tier 1). Enter a different AF/AT in the table only as a conscious selection —
note that the hospital golden feeds its 112.5 kVA units at 225 A with the 4W
feeder row even on delta primaries (golden-case precedent).

### Sub-distribution / sub-feed trees *(delete if none)*
Indented trees for Chain-G sub-feeds and Chain-B internal step-downs, e.g.:

```
4S-1-B (1600A MLO, fed from CB-07)
  └─ internal CB (225A/3P) → 4T-1-B (112.5 kVA) → 2P-1-B (400A MLO, 208Y/120V)
4M-R-A (1200A MLO, rooftop)
  feed_bottom → 4M-R-B (800A MLO)
```

- MCCs: model as panelboards (no MCC symbol in the registry); starter/VFD
  detail stays on the MCC schedule, not the SLD.
- Terminal loads (Chain D): give HP + FLA (motors) or kW / MCA+MOCP
  (equipment connections). Nameplate MCA/MOCP `[T3-EOR]` overrides kW-derived
  sizing; kW sizing itself uses `[T2-DEFAULT: PF 0.90, 125% continuous]`.

## 4. EMERGENCY / STANDBY POWER *(delete this entire section if none)*

**Architecture** — answer explicitly; this is the one question besides kVA
the compositor is instructed to ask when ambiguous:
- ( ) One switchboard with NEC class sections
- ( ) Separate **generator-fed** emergency switchboard whose distribution
      breakers feed the ATS **emergency (source 2)** inputs; ATS loads are
      downstream panels *(the golden-case pattern)*
- ( ) Emergency switchboard fed from an **ATS load side** (generator and
      normal source converge at the ATS; the ATS output feeds the board)
- ( ) Both / other — describe: ______

### Generator — ______ (designation)
- ______ kW / ______ kVA, ______ V, listing/level (NFPA 110 …, UL 2200): ______
- Generator breaker (integral): ______ AF / ______ AT
- **Generator feeder — all fields `[T3-EOR]`, no schedule lookup exists
  (NEC 445.13); omitting any of these halts the generator branch:**
  - Conductor size + material: ______
  - Number of sets: ______
  - Conduit size + type: ______
  - Ground/EGC size: ______ (NEC 250.122)
  - A-1 feeder tag text: ______
  - A-2 conduit callout text: ______
- Generator capacity vs. aggregate ATS load: EOR statement ______  `[T3-EOR]`
  — a design decision, not validated by the pipeline.

### ATS inventory *(one row per transfer switch)*

| ATS designation | NEC class (700/701/702) | Poles | Continuous A | Withstand kAIC `[T3-EOR]` | Normal source (SWBD/CB) | Emergency source (SWBD/CB) | Load (panel/device) |
|-----------------|------------------------|-------|--------------|---------------------------|-------------------------|----------------------------|---------------------|
| | | | | | | | |

- Withstand ratings feed the DV-5 check — give a value per ATS (commonly the
  bus kAIC). *Recorded in the contract as `calc_fields.withstand_rating` in
  amperes — 65 kAIC → `65000`.*
- ATS continuous rating is EOR-selected and **not validated against the
  source breaker ratings** (no pipeline rule covers it) — state your intent.
- If `nec_class` values are prose (e.g. `"LIFE SAFETY"`), either use `7xx`
  codes here or supply `nec_class_aliases` in §6 so ATS class ordering works.
- Fire-pump ATS (if any): normal source must tap ahead of the main disconnect
  (NEC 695.4(B)) — name the fire-pump CB as its normal source.

### Emergency switchboard — ______ (designation) *(delete if architecture (a))*
- Bus: ______ A, ______ V, ______ kAIC
- Main device: ______  `[T2-DEFAULT: MLO per NEC 700.10(B)(5)(a)]` — a main
  breaker is a Tier-2 override and changes the bus to two-level.
- Distribution breakers: same table format as §3.
- NEC class section ordering 700 → 701 → 702 is automatic and non-negotiable
  (DV-9); N-G bond auto-included.

### Emergency downstream chains
Per-branch indented trees (Life Safety / Critical / Equipment / Optional…),
same format as §3 sub-feed trees — ATS `load_out` → distribution panel →
sub-feeds / step-downs / terminal loads, with kVA and floor per device.

## 5. FEEDER DISTANCES  `[T3-EOR]`

Distances are staged into R-1 `calc_fields.length_ft` for future voltage-drop
analysis. **They do not by themselves produce tags:** A-5 VD tags are reserved
(not implemented — no renderer exists), and A-4 fault-current tags depend on
the §1 utility available fault current, not on distances.

| Feeder (from → to) | Distance (ft) |
|--------------------|---------------|
| | |

Or waive explicitly: *"Distances not provided this phase — leave VD/FC calc
fields empty; A-4/A-5 annotations suppressed where values are absent."*

## 6. SHEETS & LAYOUT  `[LAYOUT]`

*(Everything here is optional — omitted keys fall back to engine defaults,
which reproduce the hospital-golden behavior. Single-sheet projects can
delete all but the sheet table.)*

**Where this data lands:** the compositor embeds these keys as
`topology.layout_config` (schema §2); a sidecar copy for
`run_layout.mjs --config` is optional (sidecar wins on merge). Embedding
`subfeed_start_ports` — even at its default `["feed_bottom","feed_top"]` —
enables validator rule CV-14, which is otherwise capability-skipped.

### Sheets

| Sheet | Drawing no. | Role (`normal` / `continuation` / `emergency`) | Content |
|-------|-------------|------------------------------------------------|---------|
| S1 | E-___ | normal | |
| S2 | E-___ | emergency | |

- Default split `[T2-DEFAULT]`: NP on S1 (E-501, "SINGLE-LINE DIAGRAM —
  NORMAL POWER"), EM on S2 (E-502, "… EMERGENCY POWER"); single sheet if the
  system fits. Cross-sheet feeders (e.g. ATS normal sources) are auto-paired
  with A-3 squiggle refs.
- Squiggle text `[T2-DEFAULT: equipment designations]` — override: sheet
  numbers.

### Riser / level layout
- `floor_order` (row order, top first): ______ *(default `["R","3","2","1"]`)*
- `floor_anchors` — one anchor panel designation per floor row: ______
- `floor_anchors_mechanical` — anchors for mechanical rows (absent floors are
  skipped in the mech pass): ______
- `level_map` — designation → level code, **curated to rendered row, not
  service floor**; devices drawn off their floor's row map to `null`: ______

### Advanced `layout_config` / `layout_hints` *(schema §19/§20 — one-liners, all optional)*
- `sheet_skips` — per-sheet designation regexes intentionally not drawn
- `level_order` — level-line vocabulary top→bottom *(default `["R","3","2","1"]`)*
- `riser_step_standard` / `riser_step_roof` — px per floor row *(1200 / 1460)*
- `ats_xoffset_overrides` — per-ATS lateral nudge on the EM sheet
- `subfeed_max_depth` *(1)* / `subfeed_start_ports` / `subfeed_src_types` /
  `subfeed_dst_types` — sub-feed placement reach
- `continuation_entry_x` — X override for a continuation-entry panel
- `s2_level_line_pitch` — EM-sheet fixed level-line pitches, building-specific
  `[T2-DEFAULT: {"2":2800,"3":1250,"R":1250}]`
- `s2_shift_delta` — EM-sheet cluster pack-down (px the upper-floor parent
  moves down after the pitch cascade) `[T2-DEFAULT: {"2":1328,"3":1328,"R":1328}]`
- `nec_class_aliases` — prose → `7xx` remap for ATS class ordering
- `layout_hints.terminal_subfeeds` *(enabled)* /
  `layout_hints.subfeed_gutter_parents` *( [] )*

## 7. KEYNOTES & OMISSIONS

### A-6 keynotes  `[T3-EOR — both placement and text]`

| Sheet | # | Keynote text (UPPERCASE drawing convention) |
|-------|---|---------------------------------------------|
| S1 | 1 | |

### Omitted from topology
Equipment deliberately excluded from the SLD (shown on schedules/other
drawings instead) — list it so validators and reviewers know it's intentional:
- ______

## 8. TIER-2 OVERRIDE LEDGER

State overrides explicitly, one line each, in the form
`TIER 2 OVERRIDE confirmed: <decision> = <value> (default was <default>)`.
Unstated = default applied and logged. Rows not applicable to your design
need no entry. The watched decisions:

| Decision | Default | Override option |
|----------|---------|-----------------|
| 75 kVA xfmr secondary breaker | 250 A (schedule) | 225 A (retag `2254T`→`2254`) |
| 750 kVA xfmr secondary breaker | 2000 A | 2500 A (requires 3000 A bus — cost flag) |
| Fire pump section position | Left of main breaker | Right of main breaker |
| Emergency switchboard main | MLO (NEC 700.10(B)(5)(a)) | Main breaker (bus → two-level) |
| Flex port routing (xfmr, disconnect) | Vertical ports | Horizontal `flex_left`/`flex_right` |
| SPD Mode B corner | Bottom-right of panel | Other corner if obstructed |
| Equipment connection sizing | PF 0.90, 125% continuous | EOR PF / load factor |
| EM-sheet level-line pitches | Hospital-golden `s2_level_line_pitch` | Building-specific values (§6) |
| Service voltage / system type / building use / levels | §1.2 intake defaults | State in §1–§2 |
| NP/EM sheet split | S1 / S2 | State in §6 |
| A-4 fault-current tags | All eligible | `suppress_fc_tag: true` per device |
| A-5 voltage-drop tags | All ≥ threshold | `suppress_vd_tag: true` per feeder |
| A-5 `vd_display_threshold` | 0.0 % | Project threshold (e.g. 2.0 %) |
| A-3 squiggle text | Equipment designations | Sheet numbers |

## 9. CAPABILITY LIMITS — DO NOT REQUEST

**Placeholder symbols (8 of 35)** — no complete geometry/ports; a narrative
requiring them halts or degrades:
L0-2 MV Transformer · L1-5 Generator *(usable as a topology object with
provisional `gen_out` port — the §4 generator block works, but expect
provisional geometry)* · L1-6 Draw-Out CB · L2-9 Bus Plug · L2-10 UPS ·
L2-11 Inverter · L2-12 PV Array · L2-13 Meter Stack.

**Blocked configurations:**
- Busway-fed distribution (tap-offs need L2-9 — busway composition is blocked)
- UPS / inverter / PV / meter-stack one-lines (placeholders above)
- MCC symbols (model as panelboards — golden-case precedent)
- Single-phase / delta feeder sizing (schedule covers 3Φ 3W/4W only)

**Non-negotiable NEC elements** — auto-included; requests to remove are
refused with the code citation:
GFP on mains ≥1000 A (230.95) · N-G bond at service entrance (250.24(C)) ·
utility meter · A-1/A-2 tags on every non-stub-exempt feeder · emergency
section ordering 700→701→702 · fire pump tapped ahead of main disconnect
(695.4(B)).

## 10. COMPLETENESS CHECKLIST & OUTPUT MODE

Before submitting the narrative:

- [ ] Service kVA stated (§1 — the one mandatory field)
- [ ] Normal/emergency architecture unambiguous (§4 checkbox answered, or §4
      deleted)
- [ ] Every `[T3-EOR]` field filled **or** consciously accepted as a
      `COMPOSITOR_HALT` to resolve later:
      - [ ] Fire pump breaker rating (if fire pump)
      - [ ] Generator feeder conductor / sets / conduit / ground / tag /
            callout (if generator)
      - [ ] ATS withstand ratings (if ATS)
      - [ ] Utility available fault current
      - [ ] Equipment MCA/MOCP (if nameplate governs)
      - [ ] Keynote text (if keynotes wanted)
      *(Accepted halts live in `metadata.compositor_halts[]` — the validator
      reports CLEAN on a halted topology, so review the halt ledger, not just
      the validation report, before calling a composition done.)*
- [ ] Feeder distances provided or explicitly waived (§5)
- [ ] Sheets assigned or defaulted (§6)
- [ ] Tier-2 overrides stated in ledger form (§8)
- [ ] Nothing requested from the §9 limits list

**Output mode** — which stages to run *(stage numbering + fidelity per
`project_instructions_V1_0_0.md` §0/§4.0; default: Stages 1–3)*:
- ( ) Stages 1–3: topology + validation report (JSON contract with
      `data_layer_versions` pinned) — **high fidelity**; export the validated
      JSON to the deterministic `04_renderer/` engine (`run_layout.mjs`) for
      production geometry + SVG
- ( ) Stages 1–6 in-conversation: + layout, preflight, SVG —
      **approximate/representative fidelity**, visualization only, not for
      CAD import; per §8 complexity management only viable for small systems
      (>10 breakers or >2 switchboards → topology-only strongly recommended)

**Design basis** *(optional, informational — code editions, occupancy,
UL listings; the record document for AHJ/PE review is the parent BOD, not
this narrative)*: ______

# -----------------------------------------------------------------------------
# END OF TEMPLATE — narrative_template_V1_0_0
# Outputs require review and seal by a licensed Professional Engineer before
# construction use.
# -----------------------------------------------------------------------------
