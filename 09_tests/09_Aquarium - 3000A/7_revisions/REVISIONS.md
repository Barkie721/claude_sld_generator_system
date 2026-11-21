# Aquarium — 3000 A — revision log: every change requested after the drawing was generated

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

### R-003 · 2026-11-21 (compositor self-review, run 4)
**Asked:** — (checker findings: collinear_v 1 on S2, three `2254` A-1 pills HARD on their own/adjacent runs)
**Actually wrong:** E4L-1-A's 45 kVA tap shared the panel-top lane with the incoming F-356; the 2S-1-B fan-out pills sat on the jog row.
**Fixed by:** `internal_chain_exit_nudge {E4L-1-A:-20}` + `chain_column_nudge {E2P-1-A:-20}`; `a1_tag_placement` F-318 left, F-357 vertical dy −300; `a1_long_run_midpoint {F-319:400}`.
**Scope:** `project-only`
**Promoted:** —

### R-002 · 2026-11-21 (compositor self-review, runs 1–4)
**Asked:** — (S2 Life Safety riser E4L-2-A on the Level 2 line, E4L-3-A in the wrong band)
**Actually wrong:** the build script set `s2_level_line_pitch: {}` / `s2_shift_delta: {}`. An explicit empty object REPLACES the golden defaults rather than falling back to them, so every floor pitch became 1250 and every shift 0. A compact one-band S2 (run 2) stacked both riser panels on one spot; role `normal` for S2 (scratch experiment) dropped 91 entities because only the emergency role places GEN/ATS subtrees. Separately, a riser leaving a panel that also carries an internal chain ran through that chain.
**Fixed by:** stating `{2:2800,3:1250}` and `{2:1328,3:1328}` (closed form 4840 − 180 − 3332 = 1328, this sheet's L1 line and child baseline equal the golden's); LS topology changed to the golden E4S-1-A sub-distribution pattern.
**Scope:** `engine-suspect` — the `{}`-clears-defaults behaviour is silent; a second occurrence should become an FL entry with a CV-style guard.
**Promoted:** —

### R-001 · 2026-11-21 (compositor self-review, run 1)
**Asked:** — (S1: 2M-1-A above the Level 2 line; 2P-1-B drawn over the 4P riser; lighting riser crossing the 2S-1-B fan-out)
**Actually wrong:** the internal-chain pass stacks transformer + 208 V panel ~900 px above the 800 A panel, taller than a 650 px floor step; the L1 fan-out child of 2S-1-B has no free lane below a chain-B secondary panel.
**Fixed by:** `riser_step_standard: 1100`; `feed_through_panels {2P-1-B: left}` (F-317 kept in topology); lighting moved to the west end of the bus (CB renumbered to bus order); `subfeed_straighten` on the riser hops.
**Scope:** `project-only`
**Promoted:** —

---

## Naming

`R-NNN` sequential within the project, never reused. **Scope is the mining key.** Verbatim matters in
the `Asked` line — "still some messiness" is a real data point precisely because it is not yet a
diagnosis, and unaided judgement has beaten the checkers more than once. This is the only place that
signal is captured.
