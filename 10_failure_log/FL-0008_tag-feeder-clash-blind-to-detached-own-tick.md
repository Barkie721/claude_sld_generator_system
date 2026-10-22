# FL-0008 — `check_tag_feeder_clash` excludes every tag's own tick as "drawn on the line on purpose", so 31 A-1 ticks floated in whitespace while the checker reported clean

> ⚠️ **EVIDENCE ARCHIVED 2026-07-28.** This entry cites paths under `09_tests/` that no longer
> exist: the **9-Story Hospital - 2x2000 kVA** project folder — its `check_tag_feeder_clash.mjs`,
> `hosp9_build_topology.mjs`, `run_pipeline.sh` stage 12b and `PHASE7_TAGS.md` — was deleted on 2026-07-28 at Mayo's instruction.
> The finding itself is unaffected — **the guard survives.** `check_tick_detach.mjs` and the stage-12b wiring both live in
> `09_tests/_PROJECT_TEMPLATE/4_checks/` and `_PROJECT_TEMPLATE/run_pipeline.sh`, in the generalized
> form that supersedes the deleted copies, so every project scaffolded from the template inherits it.
> This entry stays `fixed`. What is gone is the 31→0 case that proved it.
> To re-read the evidence, restore from the pre-delete repo tarball (the only copy; there is no
> git): `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`.
> Context and what the delete cost: `09_tests/README.md`.

| Field | Value |
|-------|-------|
| **ID** | FL-0008 |
| **Title** | The tag×feeder checker structurally cannot see a tick that has left its own run — an exclusion that is correct only until a tag moves ACROSS the feeder instead of along it |
| **Opened** | 2026-07-28 |
| **Closed** | 2026-07-28 |
| **Status** | `fixed` |
| **Severity** | `S2` |
| **Stage** | 4 Layout |
| **Component** | `09_tests/9-Story Hospital - 2x2000 kVA/check_tag_feeder_clash.mjs` × the engine's `renderR1Tags` `dx`/`dy` semantics |
| **Failure class** | `other` — gate blind spot (a checker whose exclusion rule silently stopped being true) |
| **Detected by** | **`ESCAPED`** — it reached Phase 7 of a seven-phase redesign. Every gate was green and the acceptance table said the row was closed. |

---

## 1. Symptom

An acceptance row reading **"A-1 tick off its own feeder: 27 → 0"** rode from Phase 1 to Phase 7 of
the 9-storey hospital redesign with **nothing measuring it**. It had been counted by eye off a
rendered sheet once, at Phase 1, and never again.

When a checker was finally written for it (`check_tick_detach.mjs`, Phase 7), the count was **31**,
not 0 — and `a1_tag_placement` held exactly 31 `dx` entries, a 1:1 match. Throughout, the project's
own tag×feeder checker reported its headline number normally and the drawing passed 63 rules /
0 errors / 0 warnings.

## 2. Impact

Thirty-one A-1 feeder tags rendered with their tick and leader root translated off the feeder they
annotate, leaving the pill connected to nothing and the tick sitting in whitespace. On a
construction document an A-1 pill is the feeder schedule reference; a tag that does not visibly
attach to its run is ambiguous about **which** feeder it sizes.

Blast radius is one project's drawing quality, not an NEC non-negotiable and not a golden-case
divergence — but the class is the dangerous one. Per this log's own convention, **a gate that goes
green while something is broken outranks a gate that goes red wrongly**, and this one went green
across six consecutive phases while the defect count grew.

## 3. Root cause

Two mechanisms, and the failure needs both.

**The engine half.** `renderR1Tags` applies `a1_tag_placement`'s `dx`/`dy` to the attach point
`(fx, fy)` **before** calling `renderTag`. `renderTag` then emits `[tick, leader, rect, text]`
relative to that point, so the tick, the leader root and the pill all translate together. `dx`/`dy`
are therefore correct only for sliding a tag **along** its run; moving it **across** the run carries
the tick with it. `pill_dx`/`pill_dy` (OFF-023) are the correct knob — pill only, tick stays, leader
stretches — and the rename is provably pill-identical, because `renderTag` adds `pdx` exactly where
`dx` would have shifted `fx`.

**The checker half.** `check_tag_feeder_clash.mjs` sweeps tag boxes against feeder segments and
**excludes a tag's own leader and tick** from the sweep, on the reasoning that "the tick is drawn on
the line on purpose". That is true — right up until the tag moves across its run, at which point the
excluded object is precisely the evidence. The exclusion was written when the only tag moves in play
were along-run, and it silently stopped being true when Phase 1 started using `dx` to push pills
sideways.

Neither half is wrong in isolation. The failure is that the tool that would have caught the engine
behaviour had already declared that behaviour out of scope.

## 4. Resolution

New checker: **`check_tick_detach.mjs`**, wired as pipeline **stage 12b**. It needs no estimation —
`renderTag` emits the tick first, so `lines[0]` of every A-1 `feeder-tag` group **is** the tick, and
its midpoint is the literal `(fx, fy)` the engine computed. Distance from that point to the nearest
segment of the feeder named by the group's `data-id` is the answer; > 2 px is detached.

It is deliberately blind to legitimate along-run sliding: a stacked A-1 is displaced along the run by
construction and still measures ~0.

The 31 findings were then fixed by renaming every offending `dx`/`dy` to `pill_dx`/`pill_dy` in one
edit. **31 → 0**, and the tag×feeder list did not move a pixel — which is the inertness proof for the
rename.

Files: `check_tick_detach.mjs` (new), `run_pipeline.sh` (stage 12b), `hosp9_build_topology.mjs`
(`a1_tag_placement` key renames).

## 5. Regression guard  ← the point of this whole log

**`check_tick_detach.mjs`, pipeline stage 12b.** Acceptance is 0; the checker prints
`RESULT tick_detach tick_detached=N tick_total=N tick_feeders=N` and stage 14 records it in
`3_output/RESULTS.json`, so the number is in a diffable file rather than in scrollback.

It ships in **`09_tests/_PROJECT_TEMPLATE/4_checks/`**, so every project scaffolded from the template
carries the guard from its first run — this cannot come back on a *new* project by omission.

Second-order guard: **`ACCEPTANCE.md` now has a `measured by` column, and a blank in it is the
alarm.** This row is the reason that column exists. A criterion with nothing measuring it is a wish,
and this log entry is what a wish costs when it rides seven phases.

## 6. Detection gap

Every gate stayed green because **no gate looks at this project at all.** `run_all_gates.sh` is
engine regression against the hospital golden, and this defect lives in a project's
`layout_config`, which the golden does not have. That is correct and by design — but it means a
project's only nets are its own ungated checkers, and one of those had an exclusion rule that had
quietly expired.

Within the project's own suite:

| Net | Why it was blind |
|---|---|
| `validate_topology_V1_0_0.mjs` | 63 rules / 0 errors. No SH rule measures annotation-to-feeder attachment. |
| `snapshot_html.mjs --audit` | `label_overlap` is label × label; `feeder_crossing` is feeder × device. A tag detached from a line collides with nothing, so it scores zero on both. |
| `check_tag_feeder_clash.mjs` | Excluded the tick by construction — see §3. |
| the acceptance table | Carried the row, with the column that would have named a prover not yet existing. |

The generalisable lesson is not "write more checkers". It is that **an exclusion inside a checker is
an assumption with no expiry date on it**. `check_tag_feeder_clash.mjs` now carries a comment saying
so, and its advisory sections print a warning rather than sitting silent, because "filed under an
advisory nobody reads" is the same failure one step removed.

## 7. Links

- Related failures: [FL-0003](FL-0003_a1-vertical-tags-zero-align-correction.md) — the other
  A-1 tag-placement entry, also "probably fine, unverified on screen"; same shape, caught earlier.
  [FL-0001](FL-0001_sync-gate-dll-embed-false-green.md) — the other false-*green* entry.
- Specs / contracts touched: none. This is a project-layer defect and an engine *semantics*
  clarification (`dx` vs `pill_dx`), not a contract change.
- Gates involved: none — see §6. `run_all_gates.sh` cannot see a project.
- Future updates: [FU-0009](../11_future_updates/FU-0009_project-folder-structure-standard.md) —
  ships this guard into `_PROJECT_TEMPLATE/` so new projects inherit it.
- Session: 9-Story Hospital redesign, Phase 7 (`PHASE7_TAGS.md`).
