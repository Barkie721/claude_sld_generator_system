# HO-0006 — DEDARMS separation: Phases 0 and 1 are done. Nothing has moved. Next is the T0 build gate.

> ✅ **CONSUMED 2026-07-30 — superseded by [HO-0007](HO-0007_dedarms-separation-phase2-t0-gate-shipped.md).**
> §3 was executed in full: the T0 gate exists as `08_validation/build_gate.sh`, wired in as **gate 13**,
> and the suite is **13/13**. **§5's hand-typed test recipe is superseded** — run the gate instead; it
> asserts the count that the recipe only printed. **§2② is now known to be incomplete:**
> `DEDARMS.Replay2023` is build-location-dependent too, despite `Deterministic=true`.
> Everything else in this file remains accurate and its §2/§4/§6 are still worth reading.

| Field | Value |
|-------|-------|
| **ID** | HO-0006 |
| **Written** | 2026-07-30 |
| **Session** | 2026-07-30 — executed Phase 0 (safety + ground truth) and Phase 1 (fix today's repo) of the DEDARMS separation handoff |
| **Status** | `consumed` 2026-07-30 — superseded by HO-0007 |
| **Continuation state** | `clean` — everything gates green. Nothing half-edited. **No file has been moved or renamed.** |
| **Work stream** | DEDARMS separation (new stream — distinct from SLD Replay, whose open entry is HO-0005) |
| **Gates last run** | `bash run_all_gates.sh` (full) ×2 — **12/12 PASS**, sync-gate **21/21 full · 19/19 quick**, G1 max deviation **0.0000 px**, 2026-07-30, *after* every edit below |
| **Tests** | **112 pass**, 0 fail — measured by execution this session, not quoted |
| **DEDARMS.dll** | **`9f16a1e7` — UNCHANGED**, sha-verified at session end. No re-bless owed |
| **DEDARMS.Replay2023.dll** | **`1a3b7ead` — UNCHANGED**, sha-verified. No re-bless owed |
| **family_map / embed** | both **`df7cfc4f`**, in lockstep |
| **Golden re-freeze owed?** | `no` — no byte-locked surface was touched |
| **Blocked on** | nothing. Phase 2 (FU-0011, the T0 build gate) is startable now, on the phone |
| **Next action** | ~~**§3 — build `08_validation/build_gate.sh` per FU-0011**, and prove it by breaking something~~ — **DONE 2026-07-30.** It was proved by breaking six things. See HO-0007 |

> **The plan being executed:** `/storage/emulated/0/Download/DEDARMS_SEPARATION_HANDOFF_2026-07-30.txt`
> Read §0 (including the §0.6 errata), then §10, then only the phase you are executing. It is ~1,950
> lines; reading it whole burns the context you need for the work. **§4 of this handoff lists where
> that document is now wrong** — believe this file over it on those points.

---

## 1. What was done

**Phase 0 — safety and ground truth.**

1. **Snapshot taken**, and it is the only undo that exists (no git, `rollback.method: NONE`):
   `Mayo_Claude_Workspace/Claude Revit SLD Generator/_snapshot_pre_split_2026-07-30/`
   84 M, 538 files, verified equal on both sides. **Beside the repo, deliberately not in Downloads**
   — that is where the last snapshot died, and FL-0006 still carries a dead pointer to it.
   **Do not delete it until the separation is finished or abandoned.**
2. **Baseline recorded on a clean tree**: 12/12 gates, sync 20/20, G1 0.0000. Run twice; FL-0006 did
   not fire (it follows an engine rev bump, not a repeat run).
3. **Check-NAME baseline captured** — the artifact every later phase must diff against.
4. **The test-count contradiction is resolved: 112, measured by execution.** The manifest said 69.
5. **Toolchain confirmed**: SDK 8.0.422 at `/root/dotnet/dotnet` (not on `$PATH`), `DEDARMS` builds
   0 errors in a scratchpad off `/storage`, lone MSB3073 as expected.

**Phase 1 — fix today's repo.** All of it stands on its own merit; none of it depends on the split.

6. **The four soft-skipping DLL checks are now hard fails (FL-0009)**, and the gratuitous guard that
   made the map↔DLL lockstep assertion skippable is deleted.
7. **`baselineCheck` no longer passes vacuously (FL-0010)** — an unparseable line or an empty list
   now fails. Mutant-proved both ways.
8. **The seven `05_revit/DEADARMS ADDIN` literals collapsed to one `ADDIN_ROOT` const**, plus
   `abs()` now honours absolute paths — the two edits that make Phase 7's sibling-repo move a
   one-line change instead of a seven-line search-and-replace.
9. **A new check (arrival ID 21)** asserts `ADDIN_ROOT` resolves to a real add-in directory.
10. **Doc sweep**: stale sync-gate counts, test counts, `.cs` file count, `CLAUDE.md` sizes, two
    dangling `MEMORY.md` pointers, the FU-0010 status line (which still said the 2023 add-in "did not
    load", long since solved), `__pycache__` deleted, HO-0003's self-contradictory `open` row fixed.
11. **Filed FL-0009, FL-0010, FU-0011.** Partially resolved FL-0004.

## 2. ⚠️ The five findings that change what comes next

**① `run_all_gates.sh` contains ZERO references to `dotnet`, `.csproj`, `.cs` or `.py`.**
So "12/12 gates green" says nothing whatever about 96 add-in source files. The 12/12 and the 112 are
independent claims from independent commands. This is measured, not inferred, and it is the whole
basis for Phase 2. **Corollary: you cannot verify any C# work with this repo's gates. Build T0 before
restructuring anything, not after.**

**② `DEDARMS.dll`'s sha is BUILD-LOCATION-DEPENDENT. This is new and nothing in the plan mentions it.**
Two clean rebuilds in the same scratchpad both produced `ceac2f29` — so the build *is* deterministic
— but neither equals the blessed `9f16a1e7`, built in place. `DEDARMS.csproj` sets no
`<Deterministic>` and no `<PathMap>` (its Replay2023 sibling sets `Deterministic=true`), so absolute
source paths reach the output. **T0 must therefore gate on 0 errors + an asserted test count, never
on a sha.** Full analysis in FU-0011 §3.

**③ The test count is printed but never asserted.** `DEDARMS.Tests/Program.cs` exits on
`failed`/`errors` only. A test that silently stopped being *discovered* would not fail the run —
which is how the count drifted 37 → 69 → 109 → 112 with three different docs each stuck at a
different number.

**④ `obj/` on both shipping projects embeds the current absolute path** (`project.assets.json`,
`*.nuget.dgspec.json`, `FileListAbsolute.txt`). **Clear `obj/` on both before the Phase 4 `mv`**, or
NuGet restores against the stale path. Not in the plan.

**⑤ HO-0005 §3 contains no repo paths at all.** The plan's "~18 paths" is wrong; the real burden is
~8 repo-relative refs in §4/§5/§8. **Decision recorded: HO-0005 takes PATH B** — proceed with
phone-side work and rewrite its paths in the same change-set as the Phase 4 move. Its continuation
state is `clean`, and Phases 0–3 touch none of them.

## 3. Next action — Phase 2 / FU-0011

Build `08_validation/build_gate.sh`. The full spec, both traps and the acceptance criteria are in
`11_future_updates/FU-0011_t0-csharp-build-gate.md`. Do not re-derive them.

The one thing worth repeating here, because it is the difference between a gate and a script:
**prove T0 by breaking something.** In a scratchpad copy only, delete a method body in
`Services/LayoutEngine.cs`, confirm T0 goes red, restore.

Phase 3 (decisions, no code) can be done in the same session if there is room; it changes no files.
**Phase 5 is the first point of no easy return** — do not start it in a session you cannot finish.

## 4. Where the separation handoff document is WRONG

Verified against the live repo this session. Its analysis held up well — ~35 citations were
spot-checked and nearly all were exact — but these are wrong:

| Where | Claim | Reality |
|---|---|---|
| **§11.2** | capture with `node … \| grep -E '^(ok\|FAIL)'` | **Matches NOTHING.** Result lines are indented two spaces. The command silently yields an empty file, and a diff of two empty files reads green — the same false-green class the phase exists to close. Correct command in §5 below |
| **§11.3** | "rename a DLL" to regression-test | **Insufficient.** `addin_dll` has two carry copies and the check uses `.filter(exists)`; removing one leaves the changed branch unreached. **Move both** |
| **§0.5 / E11** | 112 vs manifest's 69, "resolve this" | Resolved: **112**, by execution. A *fourth* number existed that the plan never mentions — `DEDARMS.Tests/README.md` said **37** |
| **§1.3** | HO-0005 names ~18 paths that hard-break | §3 names **none**; ~8 live in §4/§5/§8 |
| **E1** | first `check()` call is at L56 | L56 is the phase-1 `console.log`; the first `check(` is **L57**. (Its TDZ warning is otherwise correct and was respected) |
| **§10 Phase 1.7** | `CLAUDE.md:101` is a stale count | It is the add-in **`.cs` file count** (said 70, actually **96**), not a sync-gate count. Fixed anyway |
| **§12.5** | delete `05_revit/__pycache__/` | Done |

Also: the plan's "check N" citations are **arrival IDs**, not execution indices — four documents use
arrival order and two used a frozen 16-check execution order, and nothing said which. **The
convention is now written down in `00_Docs/repo_runbook_V1_0_0.md` §sync_gate.** Manifest L70 and
add-in `CLAUDE.md` L184/L214 are correct as written; **do not "fix" them.**

## 5. Facts you will need (VERIFIED this session unless marked)

**The corrected check-NAME capture** — use this, never §11.2's:
```bash
node 08_validation/sync_gate.mjs 2>&1 \
  | grep -E '^  (ok  |FAIL)  \[P[0-9]\] ' | sed -E 's/ — .*$//'
```
Diff the **NAMES** against the recorded baseline. **Never compare totals** — status counts cannot see
what a failed stage never attempted. A loose `^  FAIL` also double-counts the summary block's
`FAILED` lines; the gate's own `SYNC-GATE: N passed, M failed` line is the authority.

**The FL-0009 regression test**, which is also the mutant-proof for four checks:
```bash
cd ".../Revit Addins/DEDARMS"
mv bin/Release/DEDARMS.dll bin/Release/DEDARMS.dll.BAK
mv deploy/DEDARMS/DEDARMS.dll deploy/DEDARMS/DEDARMS.dll.BAK
# expect exactly 3 reds (checks 3, 5, 7); check 8 and the ADDIN_ROOT check stay GREEN
```
Measured A/B on identical state: **pre-fix 17 passed / 1 failed** (three `ok … (skipped)`),
**post-fix 16 passed / 3 failed.** Restore both afterwards.

**Running the C# tests** (`dotnet run` and `dotnet test` are both dead here):
```bash
cd ".../Revit Addins/DEDARMS.Tests"          # must build IN PLACE — csproj:91 climbs to the golden
export DOTNET_ROOT=/root/dotnet DOTNET_GCHeapHardLimit=0x60000000 DOTNET_EnableWriteXorExecute=0
/root/dotnet/dotnet build -c Release -p:EnableWindowsTargeting=true
/root/dotnet/dotnet exec bin/Release/net8.0/DEDARMS.Tests.dll   # RESULT: passed=112
rm -rf bin obj                                                   # leave none behind
```

**ASSUMED, not verified** — carried forward from the plan, still unproven:
- That the Phase 5 restructure is [M]/1–2 sessions rather than [L]. No C# has been moved yet.
- That `ReplayRoundTripTests.cs` survives the restructure (namespaces unchanged ⇒ probably; verify,
  do not assume).
- Every claim about how the add-in behaves *inside Revit*. Nothing this session executed in Revit.

## 6. Traps

1. **Never blanket-replace `18/18`.** `03_contracts/sld_replay_package_V1_0_0.md:368` and HO-0003
   use it for `diff_replay_csv.py --selftest`, which is unrelated to the sync-gate count.
2. **Always `grep -a`.** `04_renderer/strip_compare.mjs` contains literal NUL bytes and greps as
   binary, skipping silently. Deliberately unfixed.
3. **Do not touch the byte-locked surfaces** (`sld_viewer_engine_V1_0_0.html`, the generated
   `sld_engine.mjs`, the golden viewer) or the family-map JSON's prose lines. Each forces a re-bless,
   and the family map needs a Revit trip to restore lockstep. This is why FL-0004 is only partially
   fixed.
4. **`DEDARMS.dll 9f16a1e7` is the build that actually RAN in Revit** (2026-07-29). Any rebuild
   forfeits that until the next trip. It is why the 7.4 MB icon downscale was deferred to Phase 5,
   where a re-bless is already owed.
5. **`sync_gate` phase 3 rewrites `04_renderer/sld_engine.mjs` in place** and restores it from an
   in-memory backup. Running the gate is a real write to a product artifact.
6. **FL-0006 is still open**: sync_gate P4 reads `audit.json` that G6 regenerates later in the same
   run, so the first full run after an **engine rev bump** is a false red. The second is the answer.

## 7. Files changed this session

**Code (2):** `08_validation/sync_gate.mjs` (the FL-0009 + FL-0010 change-set),
`08_validation/lib/geometry_V1_0_0.mjs` (comment only).

**Contracts (1):** `03_contracts/current_state_manifest.json` — `addin_dll.note` rewritten: 69 → 112,
the correct run command, the un-gated-count warning, the build-location reproducibility finding.

**Docs (6):** `00_Docs/repo_runbook_V1_0_0.md` (counts, numbering convention, no-soft-skip rule, doc
sizes, MEMORY.md ghosts, reading-order renumber), root `CLAUDE.md` (`.cs` count),
`04_renderer/README_engine.md`, `02_specs/symbols/sld_system_model_V1_0_0.md`,
add-in `CLAUDE.md` (two FL-0004 sites), `DEDARMS.Tests/README.md`.

**Registers (8 modified + 4 created):** FL-0004 updated, `failure_register` (Next ID → FL-0011),
`update_register` (Next ID → FU-0012, FU-0010 status corrected), FU-0009 (stale line anchor),
FU-0010 (status line), HO-0003 (`open` → `closed`), HO-0005 (supersede note), and
**`handoff_register` (Next ID → HO-0007, the new HO-0006 row, and the note recording why two entries
are legitimately `open`)** — that last one was **omitted from this list until 2026-07-30**, found by
the verification pass, the same omission class as the three generated files below. Created:
FL-0009, FL-0010, FU-0011, **and this file**.

**Deleted (1):** `05_revit/__pycache__/`.

**The list reconciles to the snapshot diff, and that is the point of stating counts:**
2 code + 1 contract + 6 docs + 8 registers + 3 generated = **20 modified**, plus **4 created** and
**1 deleted**. `diff -rq "$SNAP" "$REPO"` prints exactly 20 `differ` / 4 `Only in REPO` /
1 `Only in SNAP` (`__pycache__`). Any other shape means this section is wrong again.

**Generated, not edited (3) — added 2026-07-30 after a snapshot diff caught the omission:**
`04_renderer/snapshots_page/audit.json`, `04_renderer/snapshots_page/manifest.json`,
`04_renderer/snapshots_titleblock/manifest.json`. Each differs by exactly **one line — the
`"generated"` ISO timestamp.** ⚠️ **Running the gate suite therefore mutates three tracked files
every time.** That matters for the split: any future "did I change anything?" diff will always show
these three, so they are noise that must be filtered, not signal. It also means a snapshot taken
*after* a gate run is not byte-comparable with one taken before.

**Moved: none.** `05_revit/DEADARMS ADDIN/` is exactly where it was.

**Successor: [HO-0007](HO-0007_dedarms-separation-phase2-t0-gate-shipped.md)** — `consumed`, not
`stale`: §3 was executed as written and its Phase 2 exit criteria were all met. Nothing in this file
was abandoned. The reconciliation counts in this section are session 1's and stay correct as written;
HO-0007 §7 carries the cumulative 22/7/1 shape.
