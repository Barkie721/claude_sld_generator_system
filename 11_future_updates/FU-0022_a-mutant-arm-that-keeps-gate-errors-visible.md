# FU-0022 — a mutant arm that keeps a gate's own error visible in the suite output

| Field | Value |
|-------|-------|
| **ID** | FU-0022 |
| **Title** | Guard FL-0028's fix: prove that G6's and gen_engine's stderr still reaches `run_all_gates.sh` output |
| **Proposed** | 2026-10-13 |
| **Proposed by** | `Claude` |
| **Status** | **`shipped` 2026-10-13** — accepted by Mayo the same day, then built (see §10) |
| **Priority** | `P2` (the README default; not set by Mayo) |
| **Effort** | `S` (it took under one session) |
| **Readiness** | `ready` |
| **Category** | `validation/gates` |
| **Stage** | `gate` |
| **Component** | `08_validation/mutants_gate_stderr.mjs` (new), `08_validation/run_mutants.sh` |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` |
| **Schema impact** | `none` |
| **Version bumps** | none |
| **Gates affected** | none in the 13-gate suite; `run_mutants.sh` `EXPECTED_HARNESSES` 1 → 2 |
| **Depends on** | FL-0028 |
| **Blocks** | — |
| **Target** | `backlog` |

---

## 1. Problem
FL-0028's fix is a redirect: `g6()` and `gen_idempotent()` now discard stdout only, so a failing render
or a crashed `gen_engine.mjs` shows its reason under the `FAIL`. It was proved by observed runs on
2026-10-13, but **nothing stops a later edit from putting `2>&1` back**, and the suite would stay just
as green with or without the fix. A gate's error output is exactly the kind of property nothing checks
until someone needs it.

## 2. Proposed change
A second harness under `08_validation/`, run by `run_mutants.sh`, that runs on a lab copy and has at
least two arms:
- **G6:** hide the rasterizer (put a `PATH` with no `rsvg-convert` first), run G6, and assert the
  `not runnable` line appears in the output.
- **gen_engine:** replace `gen_engine.mjs` with one that throws a marker, run the gen_engine gate, and
  assert the marker appears.

Each arm fails if the lab's `run_all_gates.sh` has `2>&1` put back. That is the control that proves
the arm can go red.

## 3. Scope
**In:** a guard for the two redirects FL-0028 changed.
**Out (non-goals):** any change to what the 13 gates assert; a general "every gate shows its stderr"
audit.

## 4. Acceptance criteria
- [x] The harness's arms pass against the live script.
- [x] Each arm goes red against a lab with `2>&1` restored, observed.
- [x] `run_mutants.sh` pins the new harness and its arm count.

## 5. Blast radius
`run_mutants.sh` only. That runner is outside the 13-gate count (FU-0012), so `EXPECTED_GATES` doesn't
move.

## 6. Verification plan
Run `run_mutants.sh` before and after: 1 harness becomes 2, all green. Then run once with each
redirect reverted in the lab and see the matching arm go red.

## 7. Risks / open questions
- `run_mutants.sh` builds its lab at `MUTANT_LAB`, default `/root/sld_mutant_lab`, a phone-side path.
  On the Windows PC it needs an override, and it refuses paths inside the repo.
- Hiding `rsvg-convert` on a box that has it means masking it on `PATH`. The G6 arm must not depend on
  the box lacking it.

## 8. Alternatives considered
- **A static check in `sync_gate` that greps the two lines for `2>&1`.** Cheaper, but FL-0022 shows a
  grep check can be satisfied by the wrong text, and it proves nothing about what the suite actually
  prints.

## 9. Links
- Related failures: FL-0028, FL-0022
- Related updates: FU-0012 (the separate mutant runner)

## 10. ✅ Shipped 2026-10-13

**Built:** `08_validation/mutants_gate_stderr.mjs`, **6 arms**, pinned in `run_mutants.sh` as
`mutants_gate_stderr.mjs|SLD_LAB|6`, with `EXPECTED_HARNESSES` going 1 → 2.

| arm | state | wants |
|---|---|---|
| A1 | G6, rasterizer hidden | its `rsvg-convert not runnable` line shows, and G6 fails |
| A2 | the same, with `2>&1` put back in `g6()` | the line is gone, and G6 still fails |
| B1 | `gen_engine.mjs` replaced by a throw | its error shows, and the gate fails |
| B2 | the same, with `2>&1` put back in `gen_idempotent()` | the error is gone, and the gate still fails |
| B0 | the lab untouched | a passing gen_engine gate prints its header and `PASS`, nothing else |
| B0' | B0 re-run after restore | the lab is clean |

**How it differs from §2's sketch:** each arm runs the `run()` wrapper and the one gate function,
pulled byte for byte from the lab's own `run_all_gates.sh`, not the whole suite, so the harness runs
in about 2 s. It hides the rasterizer itself (a failing stub first on `PATH`, plus on Windows every
`PATH` directory holding `rsvg-convert.exe`), and a preflight refuses to run if the mask does not
hold. So the G6 arms mean the same thing on a box that has rsvg (§7's second risk). A redirect swap that
finds nothing to replace fails its arm rather than leaving it resting on its other mutation. That
hole was found while proving the harness, when B2 stayed green on a lab whose swap had already
been reverted.

**Observed, on the Windows PC:**
- A clean lab scored **6/6**. The whole runner, with `MUTANT_LAB` in a scratch directory, scored
  **2 harnesses passed** (12/12 and 6/6) on a faithful 591-entry lab.
- **With G6's redirect reverted in the lab, A1 went red:** *"the gate failed, but 'rsvg-convert not
  runnable' never reached the output — FL-0028 has regressed"*. **With gen_engine's reverted as well,
  B1 went red too.** Both reverted swaps then failed A2 and B2 with "could not be applied".
- Pointed at the real tree, it refuses with exit 2.
- The suite is unchanged: `--no-png` 9/9, `--quick` 6/6. The harness is outside the gate count.

**Not covered, on purpose:** a passing G6 printing nothing extra. That needs a box where rsvg
renders, and an arm that depends on the box would make the pinned arm count vary between boxes.

**Docs moved with it:** `run_all_gates.sh` header, `repo_runbook` mutant section and
`README_engine.md` now say two harnesses. `00_Docs/staleness_audit_2026-08-02.md` still says one, and
is a dated audit left as written.
