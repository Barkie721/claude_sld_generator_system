# Clinic AI Test — One Sheet — revision log: every change requested after the drawing was generated

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
| 0 | YYYY-MM-DD | Issued for coordination | unreviewed |

---

## 2. Change requests

Newest at the top.

### R-001 · YYYY-MM-DD
**Asked:** "\<verbatim — the user's own words, not a diagnosis\>"
**Actually wrong:** \<what the drawing was really doing\>
**Fixed by:** \<config key + value · engine OFF-NNN · topology change · or "nothing"\>
**Scope:** `project-only` \| `engine-suspect` \| `preference` \| `wontfix`
**Promoted:** — \<or FL-XXXX\>

---

## Naming

`R-NNN` sequential within the project, never reused. **Scope is the mining key.** Verbatim matters in
the `Asked` line — "still some messiness" is a real data point precisely because it is not yet a
diagnosis, and unaided judgement has beaten the checkers more than once. This is the only place that
signal is captured.

## 2. Change log

### R-001 · 2026-10-20 · scope: engine-suspect · status: fixed by R-002 (engine 1.0.19) — owner experiment
**Asked:** what would the single line look like with both sheets combined into one?
**Done:** copied the two-sheet project's build script (slug `clinic1s`); every S2 object moved to
S1; sheet role `emergency` (the only role that places GEN-1 and the ATSs); the three ATS normal
feeds F-312/F-313/F-314 are plain same-sheet R-1s (no cross_sheet_refs, no A-3). E4MSB-1-A is listed
FIRST in `switchboards[]`: with 4MSB-1-A first, the emergency block anchors to the NP board (GEN-1's
feeder lands on 4MSB-1-A's bus and the ATS cluster sits over the normal branches).
**Measured (EM board first):** validation clean (P1+P2 0/0, P3 63 rules 0/0), but:
1. **DROPPED 4** — d-301 UTILITY-XFMR, r-301 service lateral, a-601, a-663. The engine draws the
   utility transformer only on a `normal`-role sheet, and one sheet has one role. Stage 7 fails
   coverage (157/161) and stops the pipeline.
2. **Collinear horizontal overlaps 4** — F-312/F-313/F-314 share one lane (y 3734) for up to
   2324 px on their way from 4MSB-1-A west to the ATSs; F-312 also overlaps F-321 (its EM-side run).
   The FU-0016 same-sheet bus-landing lane stacking applies to bus landings only, not ATS feeds.
3. **feeder × feeder crossings 9** — the long normal-feed lane crosses the EM breaker risers.
4. Each ATS still draws the hospital-literal stub "FROM 4MDP-1-A" under source 1, because the
   ATS normal-source stub is drawn whenever no A-3 is present.
**What a real one-sheet clinic needs (engine):** utility transformer placement keyed to the NP
lineup rather than the sheet role; per-feeder lane stacking for same-sheet ATS normal feeds (the
FU-0016 bus-landing lane, generalised); and the ATS source-1 stub suppressed when its feeder is
on-sheet. Not started — owner decision.

### R-002 · 2026-10-20 · scope: engine · status: fixed (run 5, engine 1.0.19) — owner request
**Asked:** EM side to the RIGHT of the normal-power single line; no squiggles on the ATS side,
since the feeders now connect.
**Engine — OFF-032 (rev 1.0.19), default-inert:** on a sheet with 2+ lineups (a) the NP lineup
draws its utility transformer on an `emergency`-role sheet; (b) the ATS/generator block anchors to
the EM lineup, so `switchboards[]` is back to NP first; (c) a 900 px gutter ahead of the EM lineup
holds the generator; (d) an ATS source-1 feeder whose breaker is on the same sheet gets no FROM
stub/squiggle and is drawn whole to the source1 port (Chain C used to land every ATS feeder on
source2), each in its own lane above the source2 tier band, which shifts down to make room.
Proof: hospital golden G1 0.0000 px, 12/13 gates (G6 the same pre-existing raster-only red,
composed SVGs byte-identical), sync_gate 14/14; the two-sheet clinic's geometry byte-identical.
**Project:** the kitchen column moved into SEC-4 west of the ATS normal feeds, SPARE-01 between it
and mechanical (F-312 had run through 2K-1-A).
**Measured:** drops 4 → 0, collinear 4 → 0, through_symbol 0, feeder × device 0, feeder crossings
9 → 3. The 3 are the minimum: with both ATS ports on the bottom edge, the normal run to C passes
under LS's source2 drop (1) and the run to EQ under LS's and C's (2).

### R-003 · 2026-10-20 · scope: project-only · status: done, re-published to the drop — owner request
**Asked:** "Pick up DEC-113 placement{} for the clinic, attended." Rulings A–E all (a): placement{}
only (equipment{} not yet); an explicit per-designation table; level spelled `"1"`; UTIL-MTR a
line-up component; the two not-placed reasons as proposed.
**Done:** the build script writes the tool repository's DEC-113 upstream `placement{}` on
`devices[i]` and `switchboards[i]`: `{level: "1"}` on 28 placed nodes (both lineups, 15
panelboards, 8 transformers, 3 ATSs); `{not_placed: {reason}}` on UTILITY-XFMR and GEN-1; nothing
on the 27 line-up components (mains, NG bond, utility meter, lineup breakers, spares/spaces,
`internal_to` panel breakers). The build throws on an unclassified node, a node classified twice,
or a name the topology lacks (each shown red on a mutated scratch copy).
**Measured:** with `placement` stripped, both topology files are byte-identical to the previous
run's; `clinic1s_geom_block.json` and every sheet and page SVG are byte-identical. P1+P2 0 errors,
P3 0 errors / 63 rules; conformance walk clean. The tool's desk port: IN-NOT-PLACED-MARKER moves
from N/A to PASS and fails on a mutated marker. The committed PNGs were left as they were: this
machine rasterizes with resvg, not rsvg, so a re-rasterization would be byte noise over identical
SVGs. Drop: `clinic1s_SLD_topology_V1_0_0__WITH_GEOMETRY.json` 566d0084 → 1c974817; sync_gate
14/14, run_all_gates --quick 6/6.

### R-004 · 2026-10-20 · scope: project-only · status: done, re-published to the drop — owner request
**Asked:** issue #55's check of the designation level codes `2`, `3` and `EM` in a one-storey
building. Owner ruling (a): rename, and re-publish the drop.
**Found:** `4T-2-A` and `4T-3-A` used the designation's level field as a running count. The pinned
legend (`equipment_designation_legend_V1_0_0.json`) reads that field as the level, `2` = Second
Level and `3` = Third Level, while the narrative's schedule and `placement{}` put both on level 1.
`EM` occurs only in `SPARE-EM-01` / `SPACE-EM-01`, the SEC-6-EM line-up spare and space, which are
not legend designations and carry no `placement{}`: left as they are.
**Done:** in the narrative and the build script, `4T-2-A` → `4T-1-B` (75 kVA, feeds 2M-1-A) and
`4T-3-A` → `4T-1-C` (45 kVA, feeds 2K-1-A), following the identifier count the rest of the drawing
uses (`2P-1-A`/`-B`, `EQ4T-1-A`/`-B`/`-C`); `run_pipeline.sh` re-run.
**Measured:** with the two names mapped back, both topology files and every sheet and page SVG are
byte-identical to the previous run's, and the drop file hashes to 1c974817; RESULTS.json is
unchanged but for its timestamp (P1+P2 0 errors / 55 rules, P3 0 errors / 63 rules). The PNGs are
re-rasterized this time, since their text changed (resvg, as R-003 notes). Drop:
`clinic1s_SLD_topology_V1_0_0__WITH_GEOMETRY.json` 1c974817 → 4a77b1bd; sync_gate 14/14,
run_all_gates --quick 6/6.
