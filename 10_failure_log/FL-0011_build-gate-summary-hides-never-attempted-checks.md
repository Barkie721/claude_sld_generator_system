# FL-0011 — `build_gate.sh`'s summary silently omits checks that were never attempted; T4b vanishes without printing a line

| Field | Value |
|-------|-------|
| **ID** | FL-0011 |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `closed` — fixed and mutant-proved 2026-07-30 |
| **Severity** | S3 |
| **Stage** | gate |
| **Component** | `08_validation/build_gate.sh` — the T4/T4b block (L299–381) and the summary (L390–397) |
| **Failure class** | incomplete accounting — a status count that cannot see what a failed stage never attempted |
| **Detected by** | mutant re-run, DEDARMS-separation Phase 2 VERIFICATION session (2026-07-30) |

---

## 1. Symptom

The gate advertises **9 checks**. When an early stage fails, fewer than 9 lines are printed and the
summary reports the shortfall as if it were the whole story.

Measured, gutting `AverageParentX` in `DEDARMS/Services/LayoutEngine.cs` (mutant ①):

```
  FAIL  [T0.1] DEDARMS builds …
  FAIL  [T0.3] DEDARMS.Tests builds in place …
        T0.4 NOT ATTEMPTED — the test project did not build, so no count exists.
  FAIL  [T4]  fresh DEDARMS.dll embeds the canonical family map — no freshly built DLL …
BUILD-GATE: 4 passed, 3 failed.
```

`4 + 3 = 7`, not 9. **T0.4 announces itself. T4b prints nothing at all** — it is nested inside the
`else` of `if [ ! -f "$FRESH_DLL" ]` (L301), so when T0.1 fails, T4b is skipped with no trace. A
reader counting lines sees eight; a reader trusting the summary sees seven; the gate has nine.

## 2. Impact

The ⚠️ *"N failed of P+F ATTEMPTED — the checks below were never reached, so their absence from the
counts above is not evidence"* banner **exists in this script already** — but only on the
precondition path (L147–154). Every mid-run abort prints the bare arithmetic with no such warning.

This is the exact trap the script's own L383–388 comment names ("a status count cannot see what a
failed stage never attempted… so the verdict line is the authority, never the arithmetic") — the
comment is correct and the code implements it only for preconditions.

Severity is capped at S3 because **the verdict line is never wrong**: every observed shortfall
accompanied a `BUILD-GATE RED` and a non-zero exit, so nothing false-greens. The cost is diagnostic,
not correctness — and specifically, **T4b is the check Phase 5 most needs**, and it is the one that
disappears without a word.

## 3. Two misdiagnoses this produces

Both measured this session:

| Trigger | What the gate says | What is actually true |
|---|---|---|
| `Ctrl-C` / SIGINT mid-build | `FAIL [T0.3] … exit=1, errors=0` then runs on to completion, `BUILD-GATE RED` | Nothing is broken; you interrupted it. SIGINT does **not** abort the gate — it kills the running `dotnet`, and the script continues to the next stage |
| `<AssemblyName>` changed | `FAIL [T4] … no freshly built DLL at …/DEDARMS.dll (T0.1 must pass first)` | T0.1 **passed**. The output is now `DEDARMS.Core.dll`; T4's hardcoded filename is what missed it |

The `AssemblyName` case is the sharper one: the gate *does* catch the change (good, and it corrects
the verification plan's Tier E prediction that nothing would), but it names an innocent check as the
prerequisite and never mentions the real cause.

## 4. Root cause

Three separate omissions, one theme — the accounting was written for the happy path and the
precondition path, not for mid-run aborts:

1. T4b has no `else` arm; a missing `$FRESH_DLL` skips it silently.
2. The final summary has no equivalent of the precondition banner.
3. `PASS`/`FAIL` are counters, and nothing anywhere records the expected total (9), so the script
   cannot know it under-reported.

## 5. Fix — APPLIED 2026-07-30, and proved by re-running the mutants

- Give T4b the same explicit `T4b NOT ATTEMPTED — …` line T0.4 already has.
- Declare `EXPECTED_CHECKS=9` and, when `PASS+FAIL < EXPECTED_CHECKS`, print the ⚠️ ATTEMPTED banner
  in the final summary too, not only after preconditions.
- Change T4's missing-DLL text from *"(T0.1 must pass first)"* to something that does not assert a
  cause it has not checked — e.g. *"no DLL at <path>; T0.1 status was <ok|FAIL>. If T0.1 passed,
  `AssemblyName` may no longer be `DEDARMS`."*
- Optionally trap `INT`/`TERM` to abort loudly rather than degrade into a spurious `T0.3` red.

Deliberately **not** proposed: making T4b run without a DLL. It cannot; the skip is correct, only
the silence is wrong.

## 6. Related

- **FL-0010 §3** — "this repo has a recurring *count printed but never asserted* pattern." This is
  its sibling: **a count asserted against a total nobody wrote down.**
- **FL-0009** — soft-skips reporting success. Distinct: these checks do not report success, they
  report *nothing*, which is better but still unaccounted.
- **FL-0012** — concurrency false red; found in the same session, also diagnostic-quality.
- The SLD Replay work stream carries the identical trap in its stage-status counts (see `FU-0010`,
  and HO-0007 §6 trap 1).

---

## 7. FIX APPLIED AND PROVED — 2026-07-30

**Four changes to `build_gate.sh`:**

1. **`EXPECTED_CHECKS=9`** declared beside the counters. The gate now knows what it owes, so it can
   notice it under-reported. Before this, `PASS` and `FAIL` were counters measuring themselves.
2. **`T4b NOT ATTEMPTED — …`** on both skip paths, matching the line T0.4 already had.
3. **The shortfall banner fires on every mid-run abort**, not only the precondition path. It also
   fires in the *other* direction — more checks than `EXPECTED_CHECKS` means someone added one
   without updating the pin, which is a bug in the script, not the tree.
4. **T4's missing-DLL message no longer asserts a cause it has not checked.** `T01_STATUS` records
   T0.1's real outcome and the message branches on it.

Also: **`0 failed` with an incomplete run is now RED, not green** (`exit 1`). Without that branch the
gate could print "0 failed" and exit 0 while checks were skipped — FL-0009's class, one level up.

**Mutant ① — gut `LayoutEngine.cs`** (the exact mutant that found this):

```
  FAIL  [T4] … no DLL at …; T0.1 FAILED — fix that first, this check cannot run without a built assembly
        T4b NOT ATTEMPTED — no built DLL to read resource names from.
BUILD-GATE: 4 passed, 3 failed, of 9.  FAILED: T0.1 T0.3 T4
⚠️  ONLY 7 OF 9 CHECKS WERE ATTEMPTED.
    2 never ran, because a stage they depend on failed.
```

Before the fix this read `BUILD-GATE: 4 passed, 3 failed.` with **no T4b line at all**.

**Mutant ② — `<AssemblyName>DEDARMS.Core`**, the §3 misdiagnosis:

```
  FAIL  [T4] … no DLL at …, but T0.1 PASSED — the build succeeded and produced a
             differently-named output. Check <AssemblyName> in DEDARMS.csproj; it is no longer 'DEDARMS'
```

Before the fix this read *"(T0.1 must pass first)"* while T0.1 had passed.

**Item 4 of §5 (trap `INT`/`TERM`) is also done** — SIGINT now aborts loudly with exit 130 and says
the run was interrupted, instead of degrading into a spurious `T0.3` red. Not separately
mutant-proved; the code path is a three-line trap.

Verified green after: build-gate **9/9 of 9**, suite **14/14**.
