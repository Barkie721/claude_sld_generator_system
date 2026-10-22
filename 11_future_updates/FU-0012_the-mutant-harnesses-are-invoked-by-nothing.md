# FU-0012 (SLD) — the mutant harnesses are invoked by nothing, in either repo

| Field | Value |
|-------|-------|
| **ID** | **FU-0012 (SLD)** — ⚠️ tag the repo; the toolkit sequence is at FU-0006 |
| **Proposed** | 2026-07-31, by the cold review of Phase 7b (**HO-0024**) |
| **Category** | validation/gates |
| **Priority** | P2 |
| **Effort** | S (the decision) / M (if the answer is "wire it in") |
| **Readiness** | `ready` |
| **Status** | **`shipped` 2026-08-01 — decided: a separate runner** |
| **Twin** | **FU-0006 (toolkit repo)** — same question, other repo. ⚠️ **Neither repo can see the other, so the decision must be recorded in both or it is only half made.** |

---

> # ✅ DECIDED AND SHIPPED 2026-08-01 — **a separate runner**, in both repos
>
> **The answer to §3 is option 2**, the one §2 called "the middle answer, and it may be the right
> one". `08_validation/run_mutants.sh` exists here and in the toolkit.
>
> **Why not suite-invoked:** each harness invokes the whole gate once per arm (12 here, 43 in the
> toolkit) and needs a writable lab off `/storage`, which is `noexec`. Wiring them in would put a
> **soft-skip path inside the suite — the exact failure mode these harnesses exist to hunt**
> (FL-0009) — and would move `EXPECTED_GATES` and the gate-14 check-NAME baseline, i.e. a re-bless,
> for a change that adds no new assertion about the product. **Why not manual-only:** "run it when
> you remember" is a written warning used as a control, and §2 already says this repo's record on
> that is bad.
>
> **What the runner asserts, beyond running things:**
> - `EXPECTED_HARNESSES` — a harness that was deleted, or never ran, is a RED, not a smaller green
>   (FL-0017's lesson one layer up).
> - a **per-harness ARM COUNT** — an arm deleted from inside a harness that still reports green is
>   FL-0023's measured failure one layer down.
> - it scores on **the `MUTANTS:` summary line, not the exit code alone**: a harness that dies
>   before its first arm exits non-zero with no line at all, and *absent* is its own verdict.
> - it refuses a lab on `/storage` or inside the repo, and asserts the lab is an entry-count-faithful
>   copy before believing anything it says.
>
> **Declared where a reader hits it**, per §3: `run_all_gates.sh`'s header and
> `00_Docs/repo_runbook_V1_0_0.md` — not only in a handoff.
>
> **The runner's own pins were mutant-proved**, three ways plus a control, against a shadow repo off
> `/storage`: arm-count mismatch → RED · harness list emptied → `HARNESS-COUNT MISMATCH` RED ·
> harness dies before scoring → `NO 'MUTANTS:' SUMMARY LINE` RED · unmodified → GREEN.
>
> 🚩 **AND IT PAID FOR ITSELF ON THE FIRST RUN, IN THE OTHER REPO.**
> `mutants_drift_coverage.mjs` **had no exit code at all** — its last statement was a `console.log`,
> so it printed "1 MUTANT(S) BEHAVED WRONG" and exited **0**. A harness that could not fail, guarding
> T9, found the instant a machine had to read output a human had been reading for weeks. **Toolkit
> FL-0003.** §2's "an unrun instrument is an absent instrument" understated it: this one was being
> run, and its answer was not being heard.
>
> **Results:** SLD 1 harness / 12 arms green · toolkit 4 harnesses / 43 arms green.

---

## 1. The state of affairs

This repo has **one** mutant harness, and it is one day old:

| Harness | Subject | Score |
|---|---|---|
| `08_validation/mutants_drop_staleness.mjs` | `[P1] published_drop shas == the LIVE upstream files` | 12/12 |

**Before 2026-07-31 there were none.** `sync_gate.mjs` — 14 checks, the cross-surface gate this whole
system leans on — had no mutant coverage of any kind. The toolkit repo has four more.

**None of the five is invoked by any gate suite.** `run_all_gates.sh` runs 13 gates and the harness is
not one of them; it is run by hand, by a session that knows to run it after editing the check it
covers. Its header says so.

## 2. Why this is a follow-up and not a defect

**It is consistent** with the four harnesses in the toolkit, which have always been manual.

**And it is the shape this repo keeps logging.** The instrument that exists to catch a
true-by-construction check is itself protected by nothing but a sentence in a handoff. This repo has
now produced five true-by-construction checks; **its record on written warnings as controls is bad,
and it says so itself** (HO-0023 §3.4 on the hand-maintained lockstep field).

The argument runs both ways:

- **For wiring it in:** an unrun instrument is an absent instrument. The staleness check's isolation
  arm (M10) is the only thing that distinguishes it from check 1; if someone "simplifies" the overlap
  away, only a run of the harness would notice.
- **Against:** the harness invokes the whole gate once per arm — **12 invocations here, 45 across all
  five.** That is not a `--quick` cost. It also needs a writable lab off `/storage` (`noexec`, and the
  harness refuses to run against the real tree), and **a harness that cannot build its lab would
  become a new soft-skip — the exact failure mode these harnesses exist to hunt** (FL-0009).

**A middle answer exists and may be the right one:** a separate `run_mutants.sh` in each repo,
invoked deliberately rather than on every gate run, **with its own arithmetic pin** so a harness
cannot vanish silently — the `EXPECTED_GATES` lesson from FL-0017, applied one layer up.

## 3. What "done" looks like

- A decision, recorded **in both repos**, that is one of: suite-invoked · separate runner ·
  explicitly declared manual-only.
- If suite-invoked or given a runner: **`EXPECTED_GATES` and the check-name baselines change and must
  be re-blessed deliberately, naming what changed.** ⚠️ A re-bless nobody explains is how a deliberate
  act becomes an absorbed one.
- If manual-only: say so **where a reader will hit it** — `run_all_gates.sh`'s header and the repo
  runbook — not only in a handoff. *A gap named only in a handoff is a gap nobody sees at the
  terminal* (the same reasoning that renamed T8's two checks in the toolkit).

## 4. Do not

- **Do not wire it in as a side effect of some other change.** The gate count is load-bearing here:
  a deleted gate otherwise reads as a smaller green (FL-0017).
- **Do not point the harness at the real tree to save building a lab.** It refuses, on purpose — it
  edits the published drop, deletes drop copies and corrupts the drop manifest.
