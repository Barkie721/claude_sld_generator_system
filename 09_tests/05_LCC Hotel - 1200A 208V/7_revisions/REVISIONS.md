# LCC Hotel Works — revision log: every change requested after the drawing was generated

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
| 0 | 2026-10-21 | Preview — recreated from red-lined existing SLD | unreviewed |
| 1 | 2026-10-21 | Panelboard symbols; tag rows aligned; fed from MPB1 via T1; P4AA/LIGHT. risers straight | unreviewed |

---

## 2. Change requests

Newest at the top.

### R-009 · 2026-10-21
**Asked:** "change the feeder tag to call out"
**Actually wrong:** the engine draws an A-2 callout only on a feeder with no A-1; dropping the A-1 would fail TV-1.
**Fixed by:** engine OFF-034 (rev 1.0.22) `layout_config.a2_callout_feeders` · `['F-301']` — the T1 secondary shows the owner's conductor callout in place of the 12004T pill; the A-1 stays in the topology.
**Scope:** `engine-suspect` (capability gap, closed by OFF-034)
**Promoted:** —

### R-008 · 2026-10-21
**Asked:** "(4)4"C-(3)#500 KCM AL, (1)#350 KCM AL NEUTRAL & (1)#250 KCM AL GRD EACH for the feeder on the secondary of the transfoer it should be this"
**Actually wrong:** the T1 secondary used the transformer schedule row (1600 A, (6) sets, 16004T); the owner's conductors are sized to the 1200 A main.
**Fixed by:** topology — r-301 A-2 callout verbatim, calc_fields to match, A-1 tag 16004T → 12004T. NOTE-008.
**Scope:** `project-only`
**Promoted:** —

### R-007 · 2026-10-21
**Asked:** "get rid the neaural ground symbol and i think she will look good"
**Actually wrong:** nothing electrically; preference. The bond requirement moves to T1.
**Fixed by:** topology — L1-3 NG-BOND removed; NOTE-007 records the SDS bonding jumper at T1 (NEC 250.30(A)(1)).
**Scope:** `preference`
**Promoted:** —

### R-006 · 2026-10-21
**Asked:** "Straighten the feeder for P4AA and Light.. so they are vertically aligned with their upstream panel, and done forget to rotate the tags. For the squiggle, rotate 90 degress and for the 'from mpb1' right below it"
**Actually wrong:** the two one-hop sub-feeds jogged west (singleton riser shift), tags horizontal on the jog; the source squiggle was vertical-orient with its text to the left.
**Fixed by:** `subfeed_straighten` F-321/F-325 + `a1_long_run_midpoint` (vertical tag on the run) · engine rev 1.0.21: OFF-033 squiggle horizontal-orient, text centred below.
**Scope:** `preference`
**Promoted:** —

### R-005 · 2026-10-21
**Asked:** "for hotel switchboard, get rid of incoming and metering sections. Our feeder will go directly to the main breaker and switch the utility transfer to a standard transformer symbol and have the squiggle say To MPB1"
**Actually wrong:** the switchgear was drawn as a service entrance (L0-1 utility transformer, meter). It is fed from MPB1 through a 500 kVA 480-208Y/120 V transformer, so it is a separately derived system (supersedes Q10). The engine could not draw a source without an incoming section.
**Fixed by:** engine OFF-033 (rev 1.0.20, transformer-fed main) · topology: L2-2 T1 with `fed_from: MPB1`, sections main_breaker + distribution only, meter removed, N-G bond re-based on NEC 250.30(A)(1), secondary 16004T. Squiggle reads "FROM MPB1" (owner chose FROM over TO).
**Scope:** `engine-suspect` (capability gap, closed by OFF-033)
**Promoted:** —

### R-004 · 2026-10-21
**Asked:** "Feeder tag for P2,P1AA,P3, P4… make sure they are aligned with P1, UPS."
**Actually wrong:** their pills sat on the short upper riser above each Z-jog (y 4273–4333), not on the breaker riser with UPS/P1 (y 4466).
**Fixed by:** `a1_tag_placement` dx/dy on F-304..F-307 — same run, tick stays on it.
**Scope:** `project-only`
**Promoted:** —

### R-003 · 2026-10-21
**Asked:** "Feeder tags for P1A-D … make sure they are all aligned."
**Actually wrong:** OFF-025 midpoints on drops of three lengths put the pills at y 3897 / 3922 / 3947.
**Fixed by:** `a1_tag_placement` dy on F-311/F-312/F-314/F-315 (all of P1A–P1G now at y 3947).
**Scope:** `project-only`
**Promoted:** —

### R-002 · 2026-10-21
**Asked:** "for D2 leave the legend alone"
**Actually wrong:** 19 legacy designations fail TI-4 (outside the designation legend).
**Fixed by:** nothing — legend unchanged, names kept; recorded as HALT-008.
**Scope:** `wontfix`
**Promoted:** —

### R-001 · 2026-10-21
**Asked:** "for D1 keep A" (keep both panels named P4)
**Actually wrong:** two devices designated P4 fail TI-3 (designation uniqueness).
**Fixed by:** nothing — both kept as on the source drawing; recorded as HALT-007. The project stays a
preview: `run_pipeline.sh` stops at stage 2 until TI-3 and TI-4 clear.
**Scope:** `wontfix`
**Promoted:** —

---

## Naming

`R-NNN` sequential within the project, never reused. **Scope is the mining key.** Verbatim matters in
the `Asked` line — "still some messiness" is a real data point precisely because it is not yet a
diagnosis, and unaided judgement has beaten the checkers more than once. This is the only place that
signal is captured.
