# FL-0012 — two concurrent `build_gate.sh` runs delete each other's build trees and produce a false RED

| Field | Value |
|-------|-------|
| **ID** | FL-0012 |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `closed` — `flock --close` applied and A/B-proved 2026-07-30 |
| **Severity** | S3 |
| **Stage** | gate |
| **Component** | `08_validation/build_gate.sh` — `SCRATCH` (L65, `rm -rf` at L191) and the in-place tests build (L222) |
| **Failure class** | false red — a green tree reported as a compile failure |
| **Detected by** | deliberate concurrency probe, DEDARMS-separation Phase 2 VERIFICATION session (2026-07-30) |

---

## 1. Symptom

Two overlapping runs against an unmodified tree. The **earlier** run failed:

```
RUN A rc=2   RUN B rc=0
A:  FAIL [T0.1] DEDARMS builds … exit=1, errors=1
    FAIL [T0.3] DEDARMS.Tests builds in place … exit=1, errors=1
    BUILD-GATE: 6 passed, 2 failed.   BUILD-GATE RED
B:  BUILD-GATE: 9 passed, 0 failed.   BUILD-GATE GREEN
```

The two "compile errors" are not compile errors:

```
error NETSDK1004: Assets file '/root/.cache/dedarms_build_gate/DEDARMS/obj/project.assets.json' not found.
CSC : error CS2001: Source file '…/DEDARMS.Tests/obj/Release/net8.0/DEDARMS.Tests.GeneratedMSBuildEditorConfig.editorconfig' could not be found.
```

Both are run B deleting run A's working directories underneath it.

## 2. Root cause — two shared mutable paths, neither guarded

1. **The scratchpad is one hardcoded path** (`/root/.cache/dedarms_build_gate`) and the script opens
   with `rm -rf "$SCRATCH"` (L191). B's `rm -rf` destroys A's restore output mid-build → NETSDK1004.
2. **The tests build IN PLACE**, at `$SRC/DEDARMS.Tests` — necessarily shared by any two runs
   against the same add-in root. Both `rm -rf …/bin …/obj` at L222, and both `cleanup()` on EXIT.
   Whichever finishes first deletes the other's `obj/` → CS2001.

`BUILD_GATE_SCRATCH` mitigates (1) only if the operator remembers to set it. Nothing mitigates (2),
because the in-place build is forced by `DEDARMS.Tests.csproj:91`'s four-level climb to the golden.

## 3. Impact

Bounded, and in the safe direction: **the corruption always produces a RED, never a false green.**
The loser's failure is loud, non-zero-exit, and reproducible. Nobody ships a bad build because of
this.

The cost is a wasted debugging session — the message says a C# file will not compile, and the
natural response is to go and read that C# file. Realistic triggers: an impatient second
`run_all_gates.sh`, a re-run started before the first finished, or any future CI that overlaps jobs.

Worth stating explicitly, because it is the *reason* the impact is bounded: **run A's `cleanup()`
still fired and left no `bin`/`obj` behind.** The EXIT trap is correct under concurrency; only the
verdict is wrong.

## 4. Options (DECIDED 2026-07-30: `flock`. Original table kept below)

| Option | Cost | Note |
|---|---|---|
| Make `SCRATCH` per-PID (`…/dedarms_build_gate.$$`) | trivial | Fixes (1) only. Loses the warm NuGet-restore locality of one stable path — measured ~340 ms, so negligible |
| `flock` the whole gate on a lockfile | small | Fixes (1) **and** (2). Second run blocks rather than corrupting. Needs `util-linux flock`, present here |
| Detect and refuse — fail fast if the scratchpad or `DEDARMS.Tests/obj` already exists | trivial | Fixes both, but turns a stale leftover from a killed run into a hard block requiring manual cleanup |
| Do nothing, document it | zero | Defensible: single-operator phone repo, failure is a loud red |

Recommendation: **`flock`**, because it is the only option that also covers the in-place build, and
because the in-place build cannot be made per-PID without breaking the golden climb.

## 5. Related

- **FL-0011** — the other diagnostic-quality defect found in the same probe session.
- HO-0007 §6 trap 2 — "running gate 13 writes inside the repo, transiently." This is the concurrency
  corollary that trap did not anticipate.

---

## 6. FIX APPLIED AND A/B-PROVED — 2026-07-30

**`flock` was chosen, as §4 recommended**, because it is the only option that also covers the
in-place tests build — which `DEDARMS.Tests.csproj:91`'s four-level golden climb forbids making
per-PID. The gate re-execs itself under `flock` before any side effect.

**The lock is keyed on the ADD-IN ROOT**, not on a fixed name: two runs against the same tree must
serialise, but the `SLD_ADDIN_ROOT` mutant lab is a genuinely independent tree and should not be
blocked by a real run. Two lock files were observed, as designed.

### ⚠️ `--close` is not optional, and leaving it out cost a debugging session

The first implementation used `flock --wait 300 <file> bash "$0"` and **made the gate far worse**:
`build_gate.sh` began taking **exactly 300 s and exiting 1** — the full lock timeout — on a tree
where nothing was wrong. The suite went from ~24 s to 3 m 41 s.

**Cause: `dotnet build` spawns `VBCSCompiler`, the Roslyn compiler SERVER — a daemon that
deliberately OUTLIVES the build.** It inherited the locked file descriptor and held the lock
indefinitely after the gate exited. Confirmed both ways: `flock --nonblock` reported the lockfile
HELD with no gate running, and killing `VBCSCompiler` released it immediately.

`--close` closes the descriptor in the child, so `flock` itself stays the only holder and the lock
dies with the run. **Any long-lived daemon a build spawns reproduces this without it** — MSBuild
node reuse is the other candidate. Verified after the fix: `VBCSCompiler` alive **and** the lockfile
FREE, two back-to-back runs at 15.3 s and 12.0 s.

### The A/B, on identical state

| | Run A | Run B |
|---|---|---|
| **with the lock** | `BUILD-GATE: 9 passed, 0 failed, of 9` GREEN | `9 passed, 0 failed` GREEN |
| **lock bypassed** (`BUILD_GATE_LOCK_HELD=1`) | **RED** — `FAIL [T0.2] … errors=137` | **RED** — same |

The specific error differs from §1's original `NETSDK1004`/`CS2001` on T0.1/T0.3 — the failure
surface varies with timing. What is invariant, and what this entry is about, is that **concurrent
runs produce a false RED**. They no longer do.

Overrides: `BUILD_GATE_LOCK_WAIT` (default 300 s), `BUILD_GATE_LOCK_DIR`. Absent `flock`, the gate
prints a loud warning and runs unprotected rather than refusing.
