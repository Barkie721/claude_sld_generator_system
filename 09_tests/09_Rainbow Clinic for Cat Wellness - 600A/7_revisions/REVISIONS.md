# Rainbow Clinic for Cat Wellness — revision log: every change requested after the drawing was generated

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
| 0 | 2026-11-18 | Issued for coordination | unreviewed |

---

## 2. Change requests

Newest at the top.

### R-001 · 2026-11-18
**Asked:** "look at the stage 8–13 checker counts … and try to drive them to zero or near zero using
layout_config knobs"
**Actually wrong:** first run had `tag_feeder_tight` 5 — beyond the 4 designed pennant-apex touches
(3 ATS-load A-4s on F-324/F-327/F-330 and the service A-4 on F-301, all OWN, the same 4 project 04
carries), the A-1 pills "703" (F-331) and "503" (F-333) of O4M-1-A's two-transformer fan hung below
their jogs 4 px from their own lower vertical legs. `feeder_x_feeder` 3 is the topological minimum
for this one-sheet shape (project 04 R-002): every ATS normal (source 1) lane runs above the source 2
tier band, so ECB-01's riser cuts the lanes to L4A-1-A and O4A-1-A and ECB-02's cuts the lane to
O4A-1-A.
**Fixed by:** `a1_tag_placement` `F-331: {pill_dx: -14}`, `F-333: {pill_dx: 14}` (pill-only move,
OFF-023; tick stays on the jog). tight 5 → 3, `tick_detached` 0.
**Scope:** `project-only`
**Promoted:** —

---

## Naming

`R-NNN` sequential within the project, never reused. **Scope is the mining key.** Verbatim matters in
the `Asked` line — "still some messiness" is a real data point precisely because it is not yet a
diagnosis, and unaided judgement has beaten the checkers more than once. This is the only place that
signal is captured.
