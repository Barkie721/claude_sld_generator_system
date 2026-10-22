# HO-0008 — Phase 2 / gate 13 VERIFIED by re-derivation. Every number held. Four findings, three of them real defects. Still nothing has moved.

| Field | Value |
|-------|-------|
| **ID** | HO-0008 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` 2026-07-30 — **successor is [HO-0009](HO-0009_dedarms-separation-phase3-decisions.md)**, which executed §9 in full |
| **Tree state** | `clean` — 13/13, sync 21/21 · 19/19, shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead`, no `bin`/`obj` leftovers |
| **Blocked on** | — |
| **Next action** | done. Original next action was **Phase 3: the eight decisions, no code** (plan §10 Phase 3) — **all eight are now decided and recorded in [`00_Docs/dedarms_separation_decisions_V1_0_0.md`](../00_Docs/dedarms_separation_decisions_V1_0_0.md)**, which outranks both this file and the plan |

> ### ⚠️ TWO STATEMENTS IN THIS FILE ARE CORRECTED BY HO-0009 — read before relying on §9
>
> 1. **§9 row 1's *"the build you SHIP is not the build you TESTED"* has the direction backwards.**
>    Measured 2026-07-30: `08_validation/build_gate.sh:166` builds **`-c Release` and only Release**,
>    which under a Debug-only `#if LAB_FEATURES` is the *shipped* configuration. **The decision to
>    reject `#if` was still correct** — the real cost is that the five Lab source files would be
>    **compiled by no gate at any time**.
> 2. **§9 row 5 attaches a `build_gate` correction to a `sync_gate` item.** Its *"the count is 9, not
>    8"* is about **build_gate's nine checks**; E7's *"3 of 9"* is about the **nine add-in-related
>    sync_gate checks**. **Two different nines** — the annotation does not modify E7's arithmetic.
>
> **§4 is unaffected and remains required reading for Phase 5.** Everything else here re-derived and
> stands.

---

## 0. The one-line answer

**Session 2's work is sound.** Every number in HO-0007 re-derived correctly by execution, all seven
claimed mutants reproduced red-then-green, and the gate does what it says. What did *not* hold was
some of the **prose about** the gate — and the two never-tried mutants that nobody had run turned up
two real defects. The instrument is trustworthy; its documentation was not, in four places.

## 1. Tier A — every number re-derived cold, before reading HO-0007

| Claim | Command | Result |
|---|---|---|
| suite is 13 gates | `grep -c 'run "' run_all_gates.sh` + execution | **13 / 13 passed**, ~20 s |
| build gate has 9 checks | `grep -cE '^  (ok\|FAIL) +\['` | **9**, `BUILD-GATE: 9 passed, 0 failed` |
| sync gate | `sync_gate.mjs` / `--quick` | **21 passed** / **19 passed** |
| tests asserted | `[T0.4]` line | `passed=112 failed=0 skipped=0 errors=0 == pin (112 passed)` |
| source count | `find … -name '*.cs'` | **96** |
| hardcoded resource names | the T4b extraction | **5** |
| blessed shas | `sha256sum` ×3 | `9f16a1e7` / `9f16a1e7` / `1a3b7ead` |
| snapshot oracle | `diff -rq "$SNAP" "$REPO"` | **22 differ / 7 only-REPO / 1 only-SNAP** |
| no leftovers | `ls DEDARMS.Tests/` | clean |
| doc sizes | `wc -c` | 32 517 / 75 250 / **107 767** (~31.8 / 73.5 / 105.2 KiB) |

**Nothing drifted.** HO-0007 §7's reconciliation is also arithmetically sound: 22 = 20 (session 1) + 2
(session 2), 7 = 4 + 3, and every one of the 29 names ties to a stated intent. **D8 confirmed.**

## 2. The findings

### FL-0011 — the gate under-reports its own check count (S3, open)

`build_gate.sh` advertises 9 checks. When an early stage fails it prints fewer and the summary states
the shortfall as if it were the total. Mutant ① gives `BUILD-GATE: 4 passed, 3 failed` — **7 of 9**.
T0.4 at least announces `NOT ATTEMPTED`; **T4b prints nothing at all**, because it is nested inside
`if [ ! -f "$FRESH_DLL" ]`'s `else`.

The ⚠️ *"…never reached, so their absence from the counts above is not evidence"* banner already
exists in this script — but only on the precondition path. This is the trap the script's own summary
comment names, implemented for one of the two cases.

**Two live misdiagnoses fall out of it, both measured:**

| You did | Gate says | Truth |
|---|---|---|
| `Ctrl-C` mid-build | `FAIL [T0.3] … exit=1, errors=0`, then **runs on to completion**, RED | Nothing is broken. SIGINT does not abort the gate; it kills the child `dotnet` and the script continues |
| changed `<AssemblyName>` | `FAIL [T4] … no freshly built DLL … (T0.1 must pass first)` | T0.1 **passed**. Output is now `DEDARMS.Core.dll`; T4's hardcoded filename is what missed |

Verdict lines were never wrong — every shortfall came with `BUILD-GATE RED` and non-zero exit. The
cost is diagnostic, and it lands hardest on **T4b, the check Phase 5 most needs.**

### FL-0012 — two concurrent runs give a false RED (S3, open)

One hardcoded scratchpad opened with `rm -rf`, plus an in-place `DEDARMS.Tests/obj` that two runs must
share. Measured: the **earlier** run failed with phantom `NETSDK1004` and `CS2001` on a clean tree
while the later run went 9/9 green. Recommendation is `flock` — the only option that also covers the
in-place build, which cannot be made per-PID without breaking `csproj:91`'s golden climb.

Fails **red, never green**, and the EXIT trap still cleaned up correctly under concurrency.

### FL-0013 — T4b's own grep could silently shrink its input (S3, mitigated)

`RESNAMES` was extracted with `grep -rhoE` — **no `-a`** — over a tree containing `RibbonBuilder.cs`,
which holds a NUL byte at offset 2746 and therefore greps as binary. All five names were found only
because no literal happens to live in that file.

**The ground rule is also wrong.** Every living doc names `04_renderer/strip_compare.mjs` as *the*
NUL-bearing file. Measured repo-wide: **three** files carry NUL bytes — `strip_compare.mjs`,
`DEDARMS/UI/RibbonBuilder.cs`, and `DEDARMS.Replay2023/Services/ReplayPreflight.cs`. Two of the three
are `.cs` files inside the tree Phase 5 restructures.

`-a` applied this session, verified output-identical. Still owed: a guard better than `NRES==0`, which
fires only when *every* name disappears, not when one does.

### FL-0014 — four living docs assert facts measured once and never re-derived (S3, fixed)

The plan predicted a third self-correction. There were four.

1. **"5 of the 6 consumers swallow the null" is wrong.** Reading all six: `IconFactory.cs:231`
   (serving `RibbonRegistry.cs:47,97,104`) and `VideoAsset.cs:23` `return null`; **`CatRainOverlay.cs:141`
   and `FamilyResolver.cs:384` both `?? throw`.** It is **4 swallow / 2 throw**. The claim sat in five
   places including **the T4b failure message an operator actually reads**.
2. **The manifest still said the test count was not gated** — a `⚠️` in `addin_dll.note` telling the
   reader FU-0011 "exists to close" it, sitting one key away from the `addin_tests` slot that closed it.
3. **Mutant ③'s recorded result was stale** — "only T4 red" is now **T4 *and* T4b** (7 passed, 2 failed).
4. **Both registers missed the T4b correction** — still "8 checks / six ways", and the runbook's
   "why it can be trusted" narrative **omitted mutant ⑦ entirely**, the very mutant that justifies T4b.

All corrected in place. The pattern is the one §0.1 of the plan named: *the session verified the thing
it built, not the thing it claimed* — and note that the doc-sweep grep actually **printed** two of these
and they were read past as historical.

## 3. What was exercised that never had been

**All 7 known mutants reproduced.** Mutant ⑦ (`RootNamespace`) confirmed exactly: **T4 GREEN, T4b red
naming all five.** Both runtime paths confirmed: a failing assertion goes red via the
`all DEDARMS.Tests pass` branch **printing the failing test's name and its Xunit exception**; a
tests-only compile break gives T0.3 red + `T0.4 NOT ATTEMPTED`.

**All 9 never-tried mutants attempted.** Highlights:

- **T0.2 can go red — first time ever observed.** Gutting a non-source-linked `Replay2023` method
  isolates it (T0.2 red, everything else green); gutting a source-linked one gives T0.2 + T0.3.
- **`expected_skipped` exercised in isolation** — adding a `[Fact(Skip=…)]` keeps `passed=112` and
  moves `skipped` to 1; T0.4 goes red on the skipped clause alone.
- **All three T4 error paths fire** (`no length prefix`, `implausible resource length`, `not valid
  JSON`), plus real truncation and an off-by-one length.
- **The EXIT trap survives SIGINT** — the plan's actual question, answered **yes**, `bin`/`obj` removed.
- `--verbose` works (78 lines, 3 build logs); an unknown flag exits 2.
- **Hiding `lib/dll_embed_V1_0_0.mjs` is handled asymmetrically**: `build_gate.sh` degrades gracefully
  (T4 + T4b red, *"extractor crashed"*), while `sync_gate.mjs` dies with a raw ESM stack, **zero check
  lines and no `SYNC-GATE:` authority line at all**. The suite still scores it FAIL because `run()`
  tests the exit code — but see open question 1.
- **No dynamic resource-name construction exists today**; all six sites are plain literals or `const`.

**Tier B3 — the plan said the manifest-pin branches "cannot be driven end-to-end". They can.** The gate
derives `REPO` from its own location, so a *shadow repo* (`build_gate.sh` + `lib/` + a mutated
`03_contracts/` + `07_data/`, with `SLD_ADDIN_ROOT` at the lab) drives every branch for real. All
confirmed end-to-end: missing slot, string-instead-of-number, wrong pin, invalid JSON, **and T4's
never-exercised `re-bless the manifest` branch.**

**Tier C reproduced** — moving both blessed DLLs aside gives **exactly 3 reds** (carry copies, embed
honesty, deploy `.addin`), with lockstep and `ADDIN_ROOT` **green**. Shape is `18 passed / 3 failed`,
not session 1's `16 / 3`: same three names, two more passes, because sync_gate grew from 19 to 21
checks. **This is precisely why the standing rule is "diff the NAMES, never the totals."** Both DLLs
restored, shas verified, 21/21.

The lockstep check staying green with **no DLL on disk** looks alarming and is correct: it compares two
*manifest fields* and deliberately has no disk guard, because the `carry_copies.some(exists)` guard that
used to sit there was FL-0001's failure class wearing caution as a disguise.

The sync_gate refactor is **provably behaviour-preserving**: the extracted function is byte-identical to
the snapshot's inline version apart from `sha(blob)` → `crypto.createHash('sha256')…`, and the old
`sha()` helper was exactly that expression.

## 4. ⭐ Tier E deliverable — what gate 13 WILL and WILL NOT catch in Phase 5

Rehearsed in the lab. **This is the most useful thing in this handoff.**

### WILL catch

| Phase 5 change | Which check | Confidence |
|---|---|---|
| any C# that stops compiling, in **any** of the three projects | T0.1 / T0.2 / T0.3 | measured, incl. Replay2023 in isolation |
| a `<Compile Include>` link dropped from `DEDARMS.Tests.csproj` | T0.3 (`CS2001`, **names the exact missing path**) | measured |
| **moving a source-linked file** into a subfolder | T0.3 — legible, diagnosable | measured |
| a test file deleted, or tests silently un-discovered | T0.4 (112 → 108) | measured |
| a test made `Skip` | T0.4, skipped clause | measured in isolation |
| **`<RootNamespace>` retargeted** (resources renamed) | **T4b**, naming all 5 | measured — this is *the* Phase 5 landmine |
| **resources dropped from the build** (e.g. a `DEDARMS.Lab` satellite excluding the cat media) | **T4b**, naming `Cat1.png`, `Hell_Cat.png`, `catvideo.mp4` | measured |
| the family map no longer embedded | T4 + T4b | measured |
| **`<AssemblyName>` changed** | T4 — but **misdiagnosed** as "T0.1 must pass first" | measured; see FL-0011 |

⚠️ **Feed back into Phase 3:** the cat-media result means **T4b already *is* the deploy-completeness
check Phase 3 item 2 is trying to design.** Do not design a second one; extend T4b.

### WILL NOT catch

| Phase 5 change | Why | Consequence |
|---|---|---|
| **`internal` → `public` on all 17 types** | nothing asserts accessibility | 9/9 green. The single biggest mechanical diff Phase 5 makes is **invisible** to the gate. Expected, but now written down |
| **moving a non-source-linked file** anywhere | the main csproj globs `**/*.cs` | green — folder structure is unverified |
| **a `.cs` file deleted outright** if nothing references it | T0.0's "96 .cs files" is **printed, never asserted** (it silently read 95 during a mutant) | green |
| **`<FullClassName>` in the `.addin` vs. the real type** | sync_gate checks the field is *present and non-empty*, never that the type exists | **a namespace rename → Revit loads the add-in and fails at startup.** Exactly HO-0003's failure mode |
| **`<Assembly>` in the `.addin` vs. built `AssemblyName`** | only checked as a *file beside the manifest*, in deploy folders | caught incidentally by T4, misdiagnosed |
| **anything about runtime behaviour inside Revit** | the gate compiles and runs Revit-free logic only | `RibbonBuilder.cs:33`'s `Assembly.GetExecutingAssembly().Location`, swallowed by the `catch` at `:62`, remains provable only on the box |
| a NUL byte appearing in a `.cs` file holding a resource literal | FL-0013 | mitigated by `-a`, guard still weak |

> **A green 13/13 must never be read as "the restructure worked."** It means the sources still compile,
> the tests still all run and still number 112, and the resources are still embedded *and reachable by
> name*. It says nothing about the ribbon, the panes, family placement, or whether Revit loads the DLL.

**This makes the case for the plan's unbuilt T5**: assert `<Assembly>` and `<FullClassName>` from each
`.addin` against the freshly built assembly. It is the largest remaining hole, it is cheap, and it
covers the failure that has already cost one Revit trip.

## 5. The eight open questions from the verification plan — settled

| # | Question | Answer |
|---|---|---|
| 1 | Commit a sync-gate check-NAME baseline? | **Yes, but guard the capture.** A missing lib makes sync_gate emit *zero* check lines and no authority line — capture a baseline in that state and you get an empty file that diffs clean forever. Any baseline capture must assert a non-zero line count and the presence of `SYNC-GATE:` |
| 2 | Add a `BUILD_GATE_MANIFEST` override? | **No — not needed.** The shadow-repo technique (§3) drives every pin branch end-to-end with no knob in production code. Document the technique instead |
| 3 | Concurrency / scratchpad locking? | **Yes — `flock`.** Per-PID scratchpad fixes only half; the in-place tests build is unavoidably shared. See FL-0012 |
| 4 | Should `Program.cs` assert its own count too? | **Confirm session 2's "no".** One pin, in a contract. A second assertion compiled into the test host is a second thing to re-bless |
| 5 | Should gate 13 run in `--quick`? | **No.** `--quick` earns its name by being Node-only and dotnet-free; ~22 s would roughly quadruple it |
| 6 | `<PathMap>`/`<Deterministic>`? | **Still Phase 5**, where a re-bless is already owed. Both assemblies are location-dependent — confirmed unchanged |
| 7 | A `node` precondition in build_gate? | **Marginal — but do it as part of FL-0011's fix.** Measured: a missing lib already yields *"extractor crashed"* on T4/T4b, which is loud but names the wrong thing. One clear precondition red is cheaper to read |
| 8 | Does T4b belong in sync_gate too, against the **blessed** DLL? | **Yes.** T4b's value is name-reachability, and the blessed DLL is the one that actually gets carried to Revit. Today nothing checks that `9f16a1e7` still answers to `"DEDARMS.Resources.…"` |

## 6. Traps (HO-0007 §6 still applies in full; these are additions)

1. **A shortfall in the check count is not a pass.** `BUILD-GATE: 7 passed, 1 failed` means **8 of 9**
   ran. Until FL-0011 is fixed, read the check *lines*, not the arithmetic — and remember **T4b leaves
   no line at all** when T0.1 fails.
2. **Never run two gates at once** (FL-0012). If you see `NETSDK1004` or a `CS2001` about a
   `GeneratedMSBuildEditorConfig`, you did — it is not a real compile error.
3. **`Ctrl-C` does not stop the gate.** It kills the current `dotnet` and the run continues, reporting
   a `T0.3` failure you caused. The cleanup is still correct.
4. **Three files carry NUL bytes, not one** — `strip_compare.mjs`, `RibbonBuilder.cs`,
   `ReplayPreflight.cs`. Always `grep -a`, and re-measure the list rather than trusting this sentence.
5. **The shadow repo is the tool for manifest-branch work** — `build_gate.sh` resolves `REPO` from its
   own path, so copying the script + `lib/` + `03_contracts/` + `07_data/` elsewhere gives a fully
   drivable gate without touching the real contract.
6. **`_snapshot_pre_split_2026-07-30/` is still the only undo. Do not delete it.**

## 7. Files changed this session

**Created (5):** `10_failure_log/FL-0011…md` · `FL-0012…md` · `FL-0013…md` · `FL-0014…md` · **this file**.

**Modified (8):** `03_contracts/current_state_manifest.json` (the stale ⚠️ in `addin_dll.note`; **the
`addin_tests` pin and every sha untouched**) · `CLAUDE.md` · `00_Docs/repo_runbook_V1_0_0.md` ·
`08_validation/build_gate.sh` (comments, the T4b message, and **one behavioural character: `-a`**) ·
`08_validation/lib/dll_embed_V1_0_0.mjs` (comments only) · `10_failure_log/failure_register_V1_0_0.md`
(Next ID → `FL-0015`, four rows) · `11_future_updates/update_register_V1_0_0.md` ·
`12_handoff/handoff_register_V1_0_0.md` · plus `HO-0007` marked corrected at §2.

**Moved: none. Deleted: none. `05_revit/DEADARMS ADDIN/` is exactly where it has always been.**

**The only functional change to a gate this whole session is `grep -rhoE` → `grep -arhoE`**, proven
output-identical before and after. Everything else is prose, and the suite is green across all of it.

**Reconciliation against the snapshot** — `diff -rq "$SNAP" "$REPO"` now prints
**22 `differ` / 12 `Only in REPO` / 1 `Only in SNAP`** (was 22 / 7 / 1 at the end of session 2).

The **`differ` count is unchanged at 22**, and that is the check, not a coincidence: every one of the
eight files modified this session was *already* in that list from sessions 1–2, so editing them moves
no counter. `Only in REPO` rose by exactly **5** — the four new `FL-` entries and this handoff. The
single `Only in SNAP` is still session 1's deleted `__pycache__`. **Three of the 22 remain generated
`"generated"` timestamps** (`snapshots_page/audit.json`, `snapshots_page/manifest.json`,
`snapshots_titleblock/manifest.json`) that move on every gate run.

**Any other shape means this section is wrong** — same discipline as HO-0007 §7, and it is stated so
the next session can falsify it in one command.

**Final state, re-run after every edit above:** `run_all_gates.sh` **13/13** · `--no-build` **12/12** ·
`--quick` **5/5** · `build_gate.sh` **9/9** · sync-gate **21/21 full · 19/19 quick** · shas
`9f16a1e7` / `9f16a1e7` / `1a3b7ead` unmoved · no `bin`/`obj` leftovers · no stray backup files.

## 8. Where HO-0007 is wrong

| Where | Claim | Reality |
|---|---|---|
| §2 / §5 / runbook | mutant ③ → "T4 alone red" | **T4 and T4b** — 7 passed, 2 failed |
| §2, §4, CLAUDE.md, the lib, the T4b message | "5 of the 6 consumers swallow the null"; `CatRainOverlay.cs:141` `return null` | **4 of 6.** `CatRainOverlay.cs:141` `?? throw`s |
| §6 trap 6 | only `strip_compare.mjs` has NUL bytes | **three files do**, two of them `.cs` in the add-in |
| §4 | "9 checks" (correct) | but the **registers** said 8, and "six ways" should be seven |

Everything else in HO-0007 — the numbers, the mutants, the `SLD_ADDIN_ROOT` lab, the two-file
`ADDIN_ROOT` warning for Phase 4, the build-location-dependence of both assemblies — **re-derived
correctly and stands.**

## 9. Resume here — Phase 3, decisions only, NO CODE

**Read §4 above first.** It changes at least two of these, and it is the thing Phase 2 existed to
produce.

The authority is the plan's **§10 Phase 3** (`/storage/emulated/0/Download/DEDARMS_SEPARATION_HANDOFF_2026-07-30.txt`
— read §0 incl. the §0.6 ERRATA, then §10, then only the phase you are executing). **Item 1 is already
decided: two assemblies** (HO-0007 §6.0) — confirm it still reads correctly and move on. The list is
carried forward here so this handoff is self-sufficient and you need not open a `consumed` one:

| # | Decision | What verification changed about it |
|---|---|---|
| 1 | **Lab exclusion mechanism** — a tiny `IFeatureModule` inversion (recommended) vs `#if LAB_FEATURES` | **The case against `#if` is now stronger.** Gate 13 tests exactly one configuration, so a conditional-compile split means the build you SHIP is not the build you TESTED — which this repo's whole culture argues against |
| 2 | **How T5 asserts deploy completeness**, and what absent-Lab behaviour is *intended* | ⚠️ **Half of it already exists.** Excluding the cat media turns **T4b** red naming `Cat1.png`, `Hell_Cat.png`, `catvideo.mp4` (measured, §4). Do not design a second check — extend T4b, and scope T5 to the real gap: `<Assembly>`/`<FullClassName>` vs the built assembly, which **nothing** checks today |
| 3 | **Pin `<RootNamespace>DEDARMS</RootNamespace>`** in `Directory.Build.props` | Value confirmed: the pin plus T4/T4b close E8's silent-null class from both ends. Note T4b, not T4, is the end that catches the rename |
| 4 | **Owners** for the six ungated drift surfaces and FL-0001 / FL-0002 / FL-0004 | Add the three new open/mitigated ones: **FL-0011**, **FL-0012**, **FL-0013** |
| 5 | **T8/T9, or say out loud that 3 of 9 checks lose their gate** | Unchanged, but note the count is **9**, not 8 — the registers were stale (FL-0014) |
| 6 | **Read plan §15** and decide whether the product-definition session happens **before or after Phase 5** | Unchanged |
| 7 | **Commit a sync-gate check-NAME baseline file?** (Phases 4/5/7 all want to diff names, never totals) | **If yes, guard the capture.** A missing `lib/dll_embed_V1_0_0.mjs` makes sync_gate emit *zero* check lines and **no `SYNC-GATE:` authority line** — capture then and you bless an empty baseline that diffs clean forever. Any capture must assert a non-zero line count *and* the presence of `SYNC-GATE:` |
| 8 | **The remaining five open questions** are already answered in **§5 above** — read them as decided-unless-overturned, not as open | `BUILD_GATE_MANIFEST` is **not needed** (shadow repo); `flock` for concurrency; `Program.cs` stays unasserted; gate 13 stays out of `--quick`; `<PathMap>` stays Phase 5 |

**Phase 3 changes no files, so it can share a session with something else.** The natural pairing is the
**FL-0011 + FL-0012 fixes** — both are small, self-contained and independently verifiable, and they
remove the two live misdiagnoses (§2) before Phase 5 starts leaning on the gate. FL-0013's remaining
items and T5 are the other cheap wins.

⚠️ **Phase 5 is the first point of no easy return — do not start it in a session you cannot finish.**

**The other open stream is untouched by this session:** **HO-0005**, SLD Replay — `1a3b7ead` has still
never run inside Revit and that trip is still owed, along with the 10 unexplained replay failures.
Nothing on the phone unblocks it.

**Two labs are left standing outside the repo and are reusable** (they cost ~35 MB and hold no
authority): `/root/.cache/dedarms_mutant` (the `SLD_ADDIN_ROOT` mutant lab, currently 9/9 green) and
`/root/.cache/dedarms_shadow` (the shadow repo for manifest-branch work). Rebuild recipes are in §4 of
HO-0007 and §3/§6.5 here. Delete them freely; nothing depends on them.
