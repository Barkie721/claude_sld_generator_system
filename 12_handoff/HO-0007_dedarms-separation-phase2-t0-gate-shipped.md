# HO-0007 — DEDARMS separation: Phase 2 is done. The repo gates its own C# for the first time. Nothing has moved.

> ⚠️ **`consumed` 2026-07-30 — superseded by [HO-0008](HO-0008_dedarms-separation-phase2-verified.md).**
> A verification session re-derived **every number in this file by execution** and they all held: 13/13,
> 9 checks, 112 asserted, sync 21/21 · 19/19, shas `9f16a1e7`/`1a3b7ead`, snapshot 22/7/1. All seven
> mutants reproduced red-then-green.
>
> **Four claims below are wrong and have been corrected in place** (see HO-0008 §8 and **FL-0014**):
> mutant ③ gives **T4 *and* T4b** red, not "T4 alone"; **4** of the 6 consumers swallow the null, not 5
> — `CatRainOverlay.cs:141` `?? throw`s; **three** files carry NUL bytes, not just `strip_compare.mjs`
> (§6 trap 6); and the registers' "8 checks / six ways" should have read 9 and seven.
>
> Nine further mutants nobody had run found **FL-0011** (the gate under-reports its own check count;
> T4b vanishes silently) and **FL-0012** (concurrent runs → false RED). **Read HO-0008 §4** before any
> Phase 5 work — it is the WILL-catch / WON'T-catch list this handoff did not have.

| Field | Value |
|-------|-------|
| **ID** | HO-0007 |
| **Written** | 2026-07-30 |
| **Session** | 2026-07-30 (session 2 of the separation) — executed **Phase 2 = FU-0011**, the T0 C# build gate |
| **Status** | `consumed` — superseded by HO-0008, 2026-07-30 |
| **Continuation state** | `clean` — everything gates green. Nothing half-edited. **No file has been moved or renamed.** |
| **Work stream** | DEDARMS separation. Supersedes **HO-0006** (now `consumed`). The other open stream is HO-0005 (SLD Replay), untouched |
| **Gates last run** | `bash run_all_gates.sh` (full) — **13/13 PASS**, ~39 s. sync-gate **21/21 full · 19/19 quick**, G1 max deviation **0.0000 px**, 2026-07-30, *after* every edit below |
| **New gate** | `08_validation/build_gate.sh` — **9/9**, ~22 s. `BUILD-GATE GREEN` |
| **Tests** | **112 pass** — and as of today **asserted**, not merely printed |
| **DEDARMS.dll** | **`9f16a1e7` — UNCHANGED**, sha-verified at session end. No re-bless owed |
| **DEDARMS.Replay2023.dll** | **`1a3b7ead` — UNCHANGED**, sha-verified. No re-bless owed |
| **family_map / embed** | both **`df7cfc4f`**, in lockstep — re-proved from a *freshly built* DLL by the new T4 |
| **Golden re-freeze owed?** | `no` — no byte-locked surface was touched |
| **Blocked on** | nothing. **Phase 3 (decisions only, changes no code) is startable now, on the phone** |
| **Next action** | **§3 — Phase 3.** Answer the eight decisions in the plan's §10 Phase 3, write a decision record, change no code. Item 1 is already decided (two assemblies) |

> **The plan being executed:** `/storage/emulated/0/Download/DEDARMS_SEPARATION_HANDOFF_2026-07-30.txt`
> Read §0 (including the §0.6 errata), then §10, then only the phase you are executing. It is ~1,950
> lines; reading it whole burns the context you need for the work. **§5 of this file lists where that
> document and FU-0011 are now wrong** — believe this file on those points.

---

## 1. What Phase 2 delivered

**The one-sentence version: `run_all_gates.sh` used to contain zero references to `dotnet`, a
`.csproj` or a `.cs` file, so "12/12 green" was silent about all 96 add-in source files. It is now
13/13, and the 13th compiles both shipping assemblies and asserts the test count.**

**Created (2):**
1. **`08_validation/build_gate.sh`** — gate 13, 9 checks, ~22 s:
   - **T0.0** ×3 preconditions — `dotnet` runs, all three projects present, scratchpad is off `/storage`
   - **T0.1** `DEDARMS` builds Release, 0 errors (net8.0-windows)
   - **T0.2** `DEDARMS.Replay2023` builds Release, 0 errors (net48)
   - **T0.3** `DEDARMS.Tests` builds Release, 0 errors
   - **T0.4** the tests run **and `passed` equals the manifest pin**
   - **T4** the **freshly built** DLL still embeds the canonical family map — the BYTES
   - **T4b** every resource name the C# **hardcodes** still exists in that DLL — the NAMES
     (added late; see §2⑥, which is the most important finding in this file)
2. **`08_validation/lib/dll_embed_V1_0_0.mjs`** — `extractEmbeddedMapSha`, moved out of
   `sync_gate.mjs` and now imported by **both**. A byte-offset heuristic maintained in two places
   becomes two different notions of "the embed is fine". The plan's §11 already asks for this: "T0 and
   T4 already exist from Phase 2 — port them, do not rewrite them."

**Modified (3):** `08_validation/sync_gate.mjs` (import the lib; the function body is unchanged and
the check NAMES were diffed identical before/after), `03_contracts/current_state_manifest.json` (new
`artifacts.addin_tests` slot + the `replay2023_dll.reproducible` correction), `run_all_gates.sh`
(gate 13 + the `--no-build` flag).

**Docs (7):** root `CLAUDE.md`, `README.md`, `00_Docs/repo_runbook_V1_0_0.md` (§4 rewritten around 13
gates, with the whole design rationale and the mutant evidence), add-in `CLAUDE.md`,
`DEDARMS.Tests/README.md`, `FU-0011` (§6, the shipped record), and
`04_renderer/README_engine.md` — that last one added after the sweep had already been declared
complete, because both `CLAUDE.md` and `README.md` point readers *there* for gate commands and it
still enumerated only 12. **A doc sweep that misses the doc the other docs point at is worth
recording, not glossing.**

**Registers (2):** `update_register` (FU-0011 → `shipped`), `handoff_register` (HO-0006 → `consumed`,
this row, Next ID → HO-0008).

## 2. ⚠️ The findings that change what comes next

**① `DEDARMS.Replay2023` is build-location-dependent too. FU-0011 §3 said the opposite.**
That section named `DEDARMS` as the location-dependent one and cited Replay2023's
`<Deterministic>true</Deterministic>` as the contrast. Measured this session: Replay2023 gives
`bb79a5cc` twice in one scratchpad, `31f3a9a6` in a different directory, and the blessed build is
`1a3b7ead` — **three distinct shas from byte-identical sources.** `<Deterministic>` removes
timestamp/MVID churn, not absolute source paths, which need `<PathMap>`.
**Consequence for Phase 7:** the plan's **T3** ("built DLL sha == toolkit manifest") is unachievable
for **both** shipping assemblies, not just DEDARMS, and its **T7** ("Replay2023 reproducibility: two
clean builds, same sha") is only meaningful if both builds run in the *same directory*. Write T7 that
way or drop it. The manifest's `reproducible` field now carries the qualifier.

**② T4 is not a relocation of sync_gate logic, and the distinction is the whole point.**
sync_gate reads the **blessed carry copy** — *are the bytes I am about to carry to the Revit box
honest?* T4 reads what the build **just produced** — *does the build still embed the map at all?*
Only the second question catches the Phase 5 landmine, and it was **proved**: deleting the family
map's `<EmbeddedResource>` line gives 0 compiler errors, 112 tests passing, and **T4 as the only red.**
Keep both.

**③ Phase 5's `internal`→`public` and RootNamespace work is now checkable, but only partly.**
T0 proves it compiles; T4 proves the embed survives. **Nothing here can see the ribbon.** The
`RibbonBuilder.cs:33` `Assembly.GetExecutingAssembly().Location` landmine remains provable only inside
Revit, because the per-button failure is swallowed by the catch at `RibbonBuilder.cs:62`. Do not let a
green 13/13 read as "the restructure worked".

**④ Building `DEDARMS.Tests` in place is safe — verified, not assumed.** It has **no
`ProjectReference`**; it source-links 21 production files. So building it does *not* rebuild
`DEDARMS` and cannot clobber `bin/Release/DEDARMS.dll`. That was the one thing that could have made
this gate cost a Revit trip, and it does not.

**⑥ ⚠️ THE MOST IMPORTANT FINDING, AND IT CORRECTS THIS SESSION'S OWN WORK. T4 does NOT catch a
`RootNamespace` change — T4b, added afterwards, does.**
The gate as first shipped claimed (in four documents) that T4 would catch the Phase 5 embed landmine.
**That claim was false and is now corrected.** Measured while preparing the verification plan: setting
`<RootNamespace>DEDARMS.Core</RootNamespace>` renames every embedded resource to
`DEDARMS.Core.Resources.…`, so all **five** hardcoded `"DEDARMS.Resources.…"` lookups return null — and
the gate stayed **8/8 fully green**, because T4 finds the map by its `$schema` bytes and those bytes are
still embedded, merely under a different name. **T4 proves the bytes are IN the DLL; it never proved
they were REACHABLE.**
**T4b closes it:** it extracts the expected names *from the C# source* (5 distinct literals across 6
sites) and asserts each exists in the built DLL as a **UTF-8** byte sequence. The UTF-8 detail is
load-bearing — a C# string literal is stored UTF-16LE in the `#US` heap while resource names are UTF-8
in `#Strings`, so a UTF-8 search finds the real name and cannot be fooled by the literal it is
validating. Verified both ways on the mutated build: all five UTF-8 names absent, all five UTF-16
literals present. T4b also fails on an **empty** extraction list (FL-0010's vacuous-pass class).
**Proved:** mutant ⑦ — RootNamespace mutated → T4 green, **T4b red naming all five**; restored → 9/9.
**Why this matters more than anything else in this handoff:** Phase 5 *is* the RootNamespace change.
Had this not been caught, gate 13 would have green-lit the exact failure it was built to prevent, and
the failure is *mostly* silent — 4 of the 6 consumers swallow the null (`IconFactory.cs:231`, serving
`RibbonRegistry.cs:47,97,104`, and `VideoAsset.cs:23`, both `return null`); `CatRainOverlay.cs:141`
**and** `FamilyResolver.cs:384` both `?? throw`, at runtime, in Revit. ⚠️ **CORRECTED 2026-07-30 by the
verification session** — this line read "5 of the 6 … only `FamilyResolver.cs:384` throws" and named
`CatRainOverlay.cs:141` as a `return null`, which it is not. See **FL-0014**.
**The lesson to carry into Phase 3/5: "the artifact is present" and "the artifact is reachable by the
name the code uses" are different assertions.** This repo already knew the neighbouring version of
that lesson — FL-0001, "containment is not identity". This was its mirror image: identity without
reachability.

**⑤ The gate needs no network.** NuGet restore is served entirely from `~/.nuget/packages` (~340 ms),
including DEDARMS's *floating* `Nice3point … 2025.*` pin, which resolves offline to the cached
2025.4.50. Worth knowing before assuming a green gate proves the pin is current.

## 3. Next action — Phase 3 (decisions only, no code)

The plan's **§10 Phase 3**. Item 1 is already decided (**two assemblies**, §6.0) — confirm it still
reads correctly and move on. The eight open questions are listed there; the ones with teeth:

1. **Lab exclusion mechanism** — the tiny `IFeatureModule` inversion (recommended) vs
   `#if LAB_FEATURES`. The latter means the build you SHIP is not the build you TESTED, which this
   repo's whole culture argues against — and note that argument is now **stronger**, because gate 13
   tests exactly one configuration.
2. **How T5 asserts deploy completeness**, and what absent-Lab behaviour is *intended*.
3. **Pin `<RootNamespace>DEDARMS</RootNamespace>`** in `Directory.Build.props`. **Phase 2 raises the
   value of this:** T4 now fails loudly if RootNamespace drift breaks the embed, so the pin plus T4
   together close E8's silent-null class from both ends.
4. **Owners** for the six ungated drift surfaces and FL-0001/0002/0004.
5. **T8/T9, or say out loud that 3 of 9 checks lose their gate.**
6. **Read §15 and decide whether the product-definition session happens before or after Phase 5.**

Phase 3 changes no files, so it can share a session with something else. **Phase 5 is the first point
of no easy return — do not start it in a session you cannot finish.**

**One thing Phase 3 should also decide, newly surfaced:** whether to commit a **check-NAME baseline
file** for sync_gate. Phases 4/5/7 all want to diff check *names* against a recorded baseline (never
totals — a status count cannot see what a failed stage never attempted). Today that baseline is
captured ad hoc in each session and thrown away. Committing it makes the diff trivial but adds a
tracked artifact that itself needs bless discipline. Not decided here on purpose.

## 4. Facts you will need (VERIFIED this session unless marked)

**Run the C# gate:**
```bash
cd "$REPO"
bash 08_validation/build_gate.sh          # 9 checks, ~22 s, expect BUILD-GATE GREEN
bash run_all_gates.sh                     # 13/13, ~39 s
bash run_all_gates.sh --no-build          # 12/12 — deliberately blind to all C#
bash run_all_gates.sh --quick             # 5/5, Node-only, no dotnet
```

**Overrides** (defaults are the measured ones): `DOTNET_BIN` (`/root/dotnet/dotnet` — **not** on
`$PATH`), `BUILD_GATE_SCRATCH` (`/root/.cache/dedarms_build_gate`, must be off `/storage`),
`SLD_ADDIN_ROOT` (`$REPO/05_revit/DEADARMS ADDIN`). `DOTNET_GCHeapHardLimit=0x60000000` is set inside
the script and is **not optional** — without it CoreCLR dies with
`GC heap initialization failed with error 0x8007000E`.

**`SLD_ADDIN_ROOT` now exists in `build_gate.sh` and IS EXERCISED** — every mutant this session ran
through it. That matters because sync_gate's equivalent env override was deliberately **deferred to
Phase 7** on the grounds that an unexercised hard-fail branch is the FL-0001 bug class. The build gate's
copy is not unexercised. **Phase 4 must update the add-in root in TWO files now**, not one:
`sync_gate.mjs`'s `ADDIN_ROOT` const and `build_gate.sh`'s `ADDIN_ROOT` default.

**How to mutant-test the gate without touching real sources** (this is how it was proved, reuse it):
```bash
LAB=/root/.cache/dedarms_mutant
mkdir -p "$LAB/05_revit"
cp -a "$REPO/05_revit/DEADARMS ADDIN" "$LAB/05_revit/DEADARMS ADDIN"
ln -s "$REPO/09_tests" "$LAB/09_tests"     # DEDARMS.Tests.csproj:91 climbs 4 levels to the golden
cd "$REPO" && SLD_ADDIN_ROOT="$LAB/05_revit/DEADARMS ADDIN" bash 08_validation/build_gate.sh
```
The symlink is what makes it work: the lab reproduces the **four-level ancestry** the test csproj
climbs, so the golden still resolves while `$REPO`'s own `07_data`/`03_contracts` stay authoritative.

**The corrected sync-gate check-NAME capture** (unchanged from HO-0006 §5 — still the right command):
```bash
node 08_validation/sync_gate.mjs 2>&1 \
  | grep -E '^  (ok  |FAIL)  \[P[0-9]\] ' | sed -E 's/ — .*$//'
```
Diff the **NAMES**. **Never compare totals.** The gate's own `SYNC-GATE: N passed, M failed` line is
the authority. `build_gate.sh` prints a deliberately parallel `BUILD-GATE: N passed, M failed`.

**Change accounting against the snapshot** — `diff -rq "$SNAP" "$REPO"` now prints
**22 `differ` / 7 `Only in REPO` / 1 `Only in SNAP`** (was 20/4/1 after session 1). The deltas are
**`run_all_gates.sh` and `README.md`** joining the differ list, and **`build_gate.sh`,
`lib/dll_embed_V1_0_0.mjs` and this file** joining the created list. Every other name in those counts
is session 1's. **Three of the 22 are generated timestamps** (`snapshots_page/audit.json`,
`snapshots_page/manifest.json`, `snapshots_titleblock/manifest.json`) that move on every gate run —
noise to filter, not signal, and the reason a snapshot taken *after* a gate run is not byte-comparable
with one taken before.

**ASSUMED, not verified:**
- That the Phase 5 restructure is [M]/1–2 sessions rather than [L]. No C# has been moved yet.
- That `ReplayRoundTripTests.cs` survives the restructure. Verify; do not assume.
- Every claim about how the add-in behaves *inside Revit*. **Nothing this session executed in Revit,
  and gate 13 cannot change that** — it proves compilation and Revit-free logic, nothing more.

## 5. Where the plan and FU-0011 are WRONG

| Where | Claim | Reality |
|---|---|---|
| **FU-0011 §3** | `DEDARMS` is location-dependent; Replay2023's `Deterministic=true` is the contrast | **Both are location-dependent.** Replay2023: `bb79a5cc` / `31f3a9a6` / blessed `1a3b7ead`. `Deterministic` ≠ `PathMap`. Kills plan T3 for both assemblies; constrains T7 |
| **FU-0011 §2 item 5** | T4 "already exists inside `sync_gate.mjs`" — fold it in | Not a relocation. sync_gate checks the **blessed** DLL, T4 the **freshly built** one. Mutant ③ separates them: 0 errors, 112 tests, map gone, T4 the only red |
| **FU-0011 §2** | gate 13 "behind a flag if the 12-gate suite should stay fast" | Runs by **default** in full mode — 22 s did not justify the flag. `--no-build` opts out; `--quick` excludes it |
| **plan §10 Ph2.1** | "0 warnings 0 errors" | 0 **errors** only. 1 warning on DEDARMS (MSB3073 xcopy, Windows-only) and 12 on Tests are expected and permanent. §0.6/E11 already corrected this; repeated here because §10 still reads the old way |
| **plan §11 T1/T2** | T1 = build, T2 = test, as separate toolkit gates | Shipped as one script with sub-checks T0.1–T0.4, because the test project's in-place build strategy differs from the shipping projects' and splitting them would duplicate that asymmetry |
| **HO-0006 §5** | run the tests with the hand-typed 3-command recipe | **Superseded — run the gate.** The recipe still works, but it does not assert the count, which was the entire problem |

Also: **the plan's §10 Phase 2 item 3 says "in a scratchpad copy only, delete a method body".** Taken
literally that is useless — `build_gate.sh` re-copies sources into its scratchpad on every run, so a
mutation there is overwritten before the build. The working method is the `SLD_ADDIN_ROOT` lab in §4.

## 6. Traps

1. **A green 13/13 still says nothing about Revit.** T0 proves compilation; T4 proves the embed. The
   ribbon, the panes, family placement and every runtime behaviour need the Revit box.
2. **Running gate 13 writes inside the repo, transiently.** `DEDARMS.Tests/bin`+`obj` appear and are
   removed by an EXIT trap. Precedent exists (`sync_gate` phase 3 rewrites `sld_engine.mjs` in place),
   but do not run it on a tree with unsaved work in that folder.
3. **Never re-pin `expected_passed` to get green.** If the count moved and you did not add or remove
   tests, **the count is the finding** — most likely a `<Compile Include>` link dropped from
   `DEDARMS.Tests.csproj` (21 source-linked files, no `ProjectReference`).
4. **Clear `obj/` on both shipping projects before the Phase 4 `mv`** — they embed absolute paths
   (`project.assets.json`, `*.nuget.dgspec.json`, `FileListAbsolute.txt`). Still true, still not in
   the plan. Note the gate does **not** do this for you: it strips `bin`/`obj`/`deploy` from its own
   scratchpad copies, never from the repo's shipping projects.
5. **Never blanket-replace `12/12`.** Most hits are historical FL/FU/HO records that are *correct as
   written* — they describe the repo at the time. Only the living docs were changed (root `CLAUDE.md`,
   `README.md`, the runbook, add-in `CLAUDE.md`, `DEDARMS.Tests/README.md`). Same discipline as the
   standing `18/18` rule.
6. **Always `grep -a`.** `04_renderer/strip_compare.mjs` contains literal NUL bytes and greps as
   binary, skipping silently. Deliberately unfixed.
7. **FL-0006 is still open**: sync_gate P4 reads `audit.json` that G6 regenerates later in the same
   run, so the first full run after an **engine rev bump** is a false red. The second is the answer.
8. **`DEDARMS.dll 9f16a1e7` is the build that actually RAN in Revit** (2026-07-29). Any rebuild
   forfeits that until the next trip — which is why gate 13 builds in a scratchpad and never in place,
   and why the 7.4 MB icon downscale and the `<PathMap>` fix are both deferred to Phase 5, where a
   re-bless is already owed.

## 7. Files changed this session

**Created (2):** `08_validation/build_gate.sh`, `08_validation/lib/dll_embed_V1_0_0.mjs`, **and this
file** (3 including the handoff).

**Modified (13):** `run_all_gates.sh` · `08_validation/sync_gate.mjs` · `04_renderer/README_engine.md` ·
`03_contracts/current_state_manifest.json` · `CLAUDE.md` · `README.md` ·
`00_Docs/repo_runbook_V1_0_0.md` · `05_revit/DEADARMS ADDIN/CLAUDE.md` ·
`05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS.Tests/README.md` ·
`11_future_updates/FU-0011_t0-csharp-build-gate.md` ·
`11_future_updates/update_register_V1_0_0.md` · `12_handoff/handoff_register_V1_0_0.md` ·
**HO-0006** (marked `consumed`, with the superseded-recipe banner and a §7 successor line).

**Moved: none.** `05_revit/DEADARMS ADDIN/` is exactly where it was. **Deleted: none.**

**Reconciliation against the snapshot** — `diff -rq "$SNAP" "$REPO"` prints exactly
**22 `differ` / 7 `Only in REPO` / 1 `Only in SNAP`**, cumulative across sessions 1 and 2. Session 2's
own contribution is **`run_all_gates.sh` + `README.md`** newly in the differ list plus the **3** created
files (`build_gate.sh`, `lib/dll_embed_V1_0_0.mjs`, this handoff); the other 20 differ / 4 created were
session 1's, and the 1 `Only in SNAP` is its deleted `__pycache__`. **3 of the 22 are generated
`"generated"` timestamps** that move on every gate run, so any future "did I change anything?" diff
will always show them. **Any other shape means this section is wrong** — that is why the numbers are
stated.
