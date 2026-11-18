# Medical Office Building — 4000A 5-Level — revision log: every change requested after the drawing was generated

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
| 0 | 2026-11-18 | Initial composition from `5_docs/design_brief.md` — all checkers clean except the Level-1 datum artifact | unreviewed |

---

## 2. Change requests

Newest at the top.

_No post-generation change requests yet._ Rev 0 is the initial composition from the design brief.
The entries below record what the composition itself had to work around while it was being built —
logged here because all three trace to engine behaviour and belong in the `engine-suspect` harvest.

### R-003 · 2026-11-18
**Asked:** "Emergency: … E4P-1-A … sub-feeds E4L-3-A … sub-feeds E4L-5-A" (design brief §4)
**Actually wrong:** first run placed the emergency riser panels on the S1-style floor-band rows
(riser_step 650) while the emergency sheet drew its level lines on the fixed-pitch stack, so the L3
line ran at the ATS row and E4L-3-A sat under its own step-down column; with `floor_order` S2
[5,4,3,2,1] the sub-feed lift walked the empty floors 2/4 at the default 1250 px pitch while the
line pass skipped them. Also F-328 (E4P-1-A riser) ran collinear with F-330 (its 30 kVA tap).
**Fixed by:** S2 `floor_order` [5,3,1]; E4L-x removed from `floor_band_designations`;
`s2_level_line_pitch {3:2690, 5:900}`, `s2_shift_delta {3:1240, 5:1240}` (derivation in the build
script); `internal_chain_exit_nudge {E4P-1-A:-20}`, `chain_column_nudge {E2P-1-A:-220}`,
`subfeed_exit_x_nudge {F-328:+20}`.
**Scope:** `engine-suspect` — the sub-feed lift and the level-line pass disagree about empty floors
in an emergency `floor_order`.
**Promoted:** —

### R-002 · 2026-11-18
**Asked:** "CB-11 … DS-IMG 400 A fused disconnect (inline) → 4S-1-A … Chain F" (design brief §3)
**Actually wrong:** the engine has a BOX entry for L2-5 but no renderer, so an inline disconnect
cannot be drawn.
**Fixed by:** topology change — CB-11 feeds 4S-1-A directly (Chain A); DS-IMG recorded in brief §9
and NOTE-011.
**Scope:** `engine-suspect`
**Promoted:** —

### R-001 · 2026-11-18
**Asked:** "Preferred topology: GEN-1 breaker → ATS emergency input directly" (design brief §4)
**Actually wrong:** the emergency-sheet placer needs an emergency switchboard lineup on the sheet to
position the generator and ATS row (`placeATSsAndGenerator` is called with the lineup's section X).
**Fixed by:** topology change — brief's own fallback E4MDP-1-A (400 A two-level, EMDP-MAIN
250AF/175AT, ECB-01 250AF/175AT) between GEN-1 and E4A-1-A; brief §9 row 1, NOTE-010.
**Scope:** `engine-suspect`
**Promoted:** —

---

## Naming

`R-NNN` sequential within the project, never reused. **Scope is the mining key.** Verbatim matters in
the `Asked` line — "still some messiness" is a real data point precisely because it is not yet a
diagnosis, and unaided judgement has beaten the checkers more than once. This is the only place that
signal is captured.
