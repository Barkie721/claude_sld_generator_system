# 01_inputs/defaults — the canonical DEFAULT single line

> **This is the answer to "run the default".** When someone asks for the default single line, this
> is the composition they mean. The two files here are the source of truth; everything else about
> them is regenerable.

| File | Role |
|------|------|
| `default2500_SLD_narrative_V1_0_0.md` | the canonical default narrative |
| `default2500_build_topology.mjs` | the canonical default build script — `LAYOUT_CONFIG`, `HALTS`, `NOTES` all live at the top |

⚠️ **Do not rename either file when you copy them.** `run_pipeline.sh` derives the project slug from
the build script's own filename (`<slug>_build_topology.mjs`), and `4_checks/check_lib.mjs` derives
it independently from the topology's `metadata.slug`. Both resolve to `default2500`; renaming breaks
that agreement silently.

---

## Run it

```bash
cd "<repo>"
cp -r "09_tests/_PROJECT_TEMPLATE" "09_tests/01_Default 2500 kVA Service"
cp 01_inputs/defaults/default2500_*  "09_tests/01_Default 2500 kVA Service/1_source/"
cd "09_tests/01_Default 2500 kVA Service"
bash run_pipeline.sh          # phone storage is noexec — bash, never ./
```

All 17 stages (14 numbered plus 2b, 7b and 12b), exit 0. The build script resolves its output directory relative to its own location
(`1_source/../2_build`), so it works from any scaffolded project folder and nowhere else — running it
in place here would write `01_inputs/2_build/`.

**Expected result** — the newest run in
[`09_tests/01_Default 2500 kVA Service/3_output/RESULTS.json`](../../09_tests/01_Default%202500%20kVA%20Service/3_output/RESULTS.json)
is the record; diff against it rather than against this paragraph. At engine 1.0.17 (run of
2026-10-04): 16 devices · 12 routed · 9 annotations · **63 rules, 0 errors, 0 drops** · audit
all-zero · composing at s = 1.0000. Two non-zeros, both expected:
- `band_outside=2` — the base-floor datum artifact that measures **identically on the frozen
  golden** (614 / 40 / 40); not a defect.
- `page_scale out_of_band=1` — the sheet clamps at s = 1.0000, outside a composed-scale band that
  was measured with the pre-FU-0008 phantom frame in place. The band is wrong, not the sheet; see
  [FU-0013](../../11_future_updates/FU-0013_restate-composed-scale-targets-against-honest-geometry.md).

---

## What the default composition IS

**2500 kVA, 480Y/277V 3Φ 4W, commercial, 3 storeys, one sheet.** Single switchboard `4MSB-1-A`,
4000 A two-level bus, four sections (`incoming` · `metering` · `main_breaker` · `distribution`).

Three feeder branches, **left to right on the bus in this order**:

| Tag | Frame / Trip | Serves | Chain |
|-----|--------------|--------|-------|
| CB-02 | 250AF / 125AT | `4T-1-A` 75 kVA → `2L-1-A` 250 A MCB — **lighting** | B |
| CB-01 | 400AF / 250AT | `4T-2-A` 150 kVA → `2P-1/2/3-A` — **power**, 208 V plug-load cascade | B |
| CB-03 | 400AF / 400AT | `4M-1/2/3-A` — **mechanical** riser | A |

Both risers are **plumb cascades** (L1 → L2 → L3, `feed_top` exits, `subfeed_straighten`), not fans.
Columns land at x 980 / 1170 / 1360. All feeder tags sit on the **right** of their run. Floor pitch
`riser_step_standard: 650`. A-7 level lines on Levels 1–3.

Tier-1 auto-includes, none suppressible: GFP on the 3000 AT main (NEC 230.95), N-G bond at the
service entrance (250.24(C)), utility CT metering, A-1/A-2 tags on every non-stub-exempt R-1.

**Three Tier-3 halts ship with it by design** — available fault current, utility TX %Z / X-R, and
feeder distances. They are what an EOR still owes on any real job, so the default exercises
`OPEN_ITEMS.md` rather than pretending the information exists. It therefore **cannot graduate to
`06_deliverables/`**, and that is correct.

---

## ⚠️ This is a REFERENCE COMPOSITION, not a set of Tier-2 intake defaults

**Do not read this folder as "what the compositor assumes when the client didn't say."** Most of what
is here — 3 storeys, a mechanical riser, a 150 kVA step-down, a plug-load cascade — are stated design
decisions, not values derivable from "2500 kVA service".

The Tier-2 intake defaults are unchanged and still live in
`00_Docs/project_instructions_V1_0_0.md` §2.3: single-level basement, **no level lines unless floors
are specified**, one distribution section with two feeder breakers. A genuinely single-storey
building must still compose that way. Inventing three floors for a client who never mentioned them
would violate §2.3's own discipline of defaulting minimally and logging the assumption.

Two different questions, two different answers:

| Question | Answer lives in |
|---|---|
| "Run the default single line." | **here** |
| "The narrative didn't state X — what do I assume?" | `project_instructions_V1_0_0.md` §2.3 |

---

## Provenance

Composed 2026-07-28 across `R-001` … `R-011`. **The full log is `REVISIONS.md` beside this file** —
preserved here when `09_tests/Default 2500 kVA Service/` was deleted, because it is authored and was
not regenerable from the two source files. It records every request verbatim plus the approaches that
FAILED, which is the part that saves a cycle. Worth keeping in mind:

- **A normal-sheet CASCADE does not compound.** OFF-021/028/029 live in `_s2FloorYOffset`, which is
  emergency-sheet only. Measured 40 / 40 on levels 2 and 3 with no constant-difference ladder.
- **`subfeed_straighten` (OFF-027) is what makes a riser plumb.** Without it every hop drifts 100 px
  west per level and draws a 4-vertex dogleg.
- **A depth-1 FAN cannot be made tag-clean in a tight lane** — two exits on one panel top defeat
  `subfeed_exit_pitch`, `pill_below` and `dst_x_offset` in turn. Cascade instead.
- **Two adjacent Chain-B transformer columns trip `--audit`'s `glyph_collision`** and no config key
  widens the lane; the cure was adopting the golden's own 14-char `480Δ-208Y/120V` notation.
- **An A-1 tag is pinned a fixed 90 px from its exit**, so its `fy` does not move with the floor
  pitch — only the child panel and its level line travel past it. Shrinking the pitch walks the
  panel edge into a stationary tag.

**Two defects found here are still open and unlogged as `FL`** (take the number from the `Next ID`
line of [`10_failure_log/failure_register_V1_0_0.md`](../../10_failure_log/failure_register_V1_0_0.md),
checked against the folder listing — `FL-0009` was named here once and has since gone to a different
defect):
1. An **A-1 tick inside a device box** is unguarded by all eight checkers *and* `--audit`. Fix:
   extend `check_symbol_clash` §B to test tick arms as well as pill rects.
2. The **width-contribution model does not budget a transformer's label block** (~147 px right of
   centre), which is what makes two Chain-B columns collide at the computed pitch.
