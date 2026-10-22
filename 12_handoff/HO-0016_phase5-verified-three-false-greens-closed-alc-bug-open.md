# HO-0016 — Phase 5 VERIFIED cold. Three false greens closed; the ALC bug is real and is now the trip's top question.

| Field | Value |
|-------|-------|
| **ID** | HO-0016 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | **`consumed`** by **[HO-0017](HO-0017_phase6-claude-md-split-complete.md)** on 2026-07-31 (Phase 6 executed). Superseded **HO-0015** as the resume point. |
| **Tree state** | `clean` — **14/14 twice, identical by check name** · `--quick` **6/6** · `--no-build` **13/13** · build-gate **15/15** (was 14 — `T0.6`, FL-0019 e, 2026-07-31) · sync **24/24 full · 22/22 quick** · **112** tests · **100** `.cs` · **89** named checks per run (was 88) |
| **Shipping shas** | ⚠️ **MOVED 2026-07-31 by the FL-0018 fix** — `DEDARMS be6ae51a` (was `d521ad30`) · `DEDARMS.Lab 2e86b97d` (was `43805105`, **zero Lab source change** — it `ProjectReference`s Core) · `Replay2023 1a3b7ead` unmoved. Reproducibility verified BEFORE blessing; embedded map still `df7cfc4f`; `runtime_unverified` stands on all three |
| **Blocked on** | nothing on the phone, and nothing on the trip either — **FL-0018 was FIXED 2026-07-31 rather than carried** (§4). The add-in is now correct under both host designs, so no open question gates the trip |
| **Next action** | **take the trip, or start Phase 6.** FL-0018 ✅ fixed · FL-0019 ✅ closed (all five) · provenance ✅ proved · FL-0020 + FL-0021 filed. Nothing on the phone is queued ahead of Revit; the trip list is unchanged except that the ALC question is now curiosity, not a blocker |

---

## 1. What this session was

Executed `Download/DEDARMS_PHASE5_VERIFICATION_PLAN_2026-07-30.md` — the re-check of separation
Phases 5a+5b+5c, written by the session that *built* them. Four cold read-only lanes (A gate/build,
B C#/split, C artifacts/contracts, E adversarial) run in parallel with their targets phrased as
**questions**, then a synthesis pass. §0.1's rule was honoured: **nothing read HO-0013/0014/0015
until the cold measurements existed.**

**Every finding below was re-derived by the main thread with its own command before being written
down.** Several plausible lane claims were discarded or corrected in that pass — including one of my
own (§6).

## 2. The verdict on Phase 5: the WORK is sound; the CHECKS had holes

Phase 5 itself came back clean on everything that was measured against the artifacts:

- **11/11 pinned shas** match disk; all carry copies present; 3/3 installer pins agree three ways.
- **Resource ownership is real** — read out of the actual `ManifestResource` metadata tables (not the
  csproj): `DEDARMS.dll` 2, `DEDARMS.Lab.dll` 3, `Replay2023` 0, **no name in both**.
- **The 112 tests are the SAME 112** — 92 test methods, identical names and theory-data counts, both
  old and new trees built and run. All 21 `<Compile Include>` links verified to resolve to the same
  content as before the split. §2 item 4 answered: same set, not just the same count.
- **`1a3b7ead`'s source is byte-for-byte untouched** — 32-file diff vs the pre-split snapshot: zero
  `.cs` differences, one csproj change, and that change was **measured** sha-neutral by an A/B rebuild
  at a fixed path. The decision not to re-bless Replay2023 was correct.
- **All three V3/V4/V5 refactors are behaviourally equivalent**, proven by execution rather than
  argument (same settings path; a 15-assertion rollback/round-trip suite; a snapshot diff).
- **All four never-mutant-proved checks CAN go red**: T0.5, T5, T5b, installer-pin. §2 item 3 closed.
  FL-0011's old `<AssemblyName>` misdiagnosis is confirmed fixed.

**What was NOT sound was the validation around it.** Three false greens were closed this session and
five more are logged open. See §3.

## 3. Changes made — all mutant-proved, none touching a shipping assembly

| # | Change | File | Proof |
|---|---|---|---|
| 1 | **FL-0015** resource-name match is now NUL-terminated (identity, not substring) | `lib/dll_embed_V1_0_0.mjs` | mutant RED; same mutant proved GREEN under the old code |
| 2 | **FL-0016** carry-copy sha check widened to `addin_lab_dll`; a *missing* copy now fails | `sync_gate.mjs` | mutant ×2 RED (drifted sha, deleted copy) |
| 3 | **FL-0017** `EXPECTED_GATES` pin added to the runner | `run_all_gates.sh` | mutant RED, **exit code 1 verified separately from the banner** |
| 4 | `replay2023_dll` given the `runtime_unverified` flag it always warranted | manifest | sync now reports **3** unverified artifacts, was 2 |
| 5 | `-SkipLab` no longer prints a false "14 buttons" when a satellite is already installed | `install_dedarms.ps1` | executed; all 3 paths re-checked |
| 6 | Stale `build_gate.sh` + `13_addin/CLAUDE.md` citations repointed, **and the counts corrected** | decision record | re-derived by `grep -n` |

**No shipping assembly was rebuilt or re-blessed.** `d521ad30` / `43805105` / `1a3b7ead` are the same
bytes HO-0015 shipped.

⚠️ **Fix 2 was deliberately implemented by WIDENING an existing check rather than adding a new name**,
so the gate-14 check-name baseline stayed at 24/22 and no re-bless cascade was triggered.

## 4. ⭐ THE TRIP QUESTION — ✅ **RESOLVED 2026-07-31: FL-0018 IS FIXED, NOT DEFERRED**

> **Mayo's call, 2026-07-31: apply the fix.** The add-in now loads the satellite through Core's OWN
> `AssemblyLoadContext` plus an `alc.Resolving` sibling probe, so it is correct **whether or not**
> Revit 2025 isolates add-ins — the open question below no longer gates anything.
> ⚠️ **What shipped is NOT the one-line fix this section recommends.** Re-measured over twelve cells:
> the one-liner **threw `FileNotFoundException` in the Default-ALC case** once the satellite had a
> private dependency, because `LoadFromAssemblyPath` drops `LoadFrom`'s sibling-directory probing.
> It would have traded a conditional bug for an unconditional one. FL-0018 §4a has the matrix.
> The dialog also now prints both ALC names, so this failure can never be misdiagnosed again.
> ⚠️ **And read FL-0021 before any future rebuild:** the first build after the `App.cs` edit
> recompiled NOTHING and re-emitted `d521ad30` at `Build succeeded, 0 Error(s)`, because an edited
> file here keeps its old mtime. The fix was on disk and absent from the artifact, at 14/14 green.
> **`touch` + `--no-incremental`, then verify the OUTPUT mtime and sha.**

The original analysis, kept because the mechanism is worth understanding:

**FL-0018 — `App.DiscoverButtons` calls `Assembly.LoadFrom`, which ALWAYS loads into the Default
ALC.** If Revit 2025 isolates add-ins in a custom `AssemblyLoadContext` (idiomatic on .NET 8), a
**second copy of Core** is loaded, `typeof(IFeatureModule).IsAssignableFrom(t)` returns **false**, and
the two Fun buttons vanish — while the dialog says *"installed but exposes no feature module"*, which
sends the reader to check the type's accessibility. It is public, it does have a parameterless ctor,
and `LoadFrom` succeeded. **A reader will rebuild, redeploy, and see the identical dialog.**

Reproduced **twice, independently** (lane B, and the main thread's own harness at `/root/alcrepro`):

```
scenario=default mode=shipped -> found=1  coreALC=Default         satALC=Default         CoreLibInstances=1
scenario=custom  mode=shipped -> found=0  coreALC=RevitPluginAlc  satALC=Default         CoreLibInstances=2
scenario=custom  mode=fix     -> found=1  coreALC=RevitPluginAlc  satALC=RevitPluginAlc  CoreLibInstances=1
```

**It is not applied.** The fix changes `App.cs` → re-blesses `DEDARMS.dll` → cascades through the
manifest, the installer pin, three living-doc anchors. That is a deliberate act, not a cheap one, and
it carries a **measured** regression: `LoadFromAssemblyPath` loses `LoadFrom`'s sibling-directory
dependency probing, so the day Lab gains a private NuGet dependency the ribbon breaks differently.

### Settle it for free, before deciding anything
On any Revit 2025 box, from any add-in, print:
`AssemblyLoadContext.GetLoadContext(typeof(App).Assembly)?.Name`
**If it prints `Default`, FL-0018 is dead** and can be closed `wont-fix`. If it prints anything else,
apply the fix (with an `alc.Resolving` handler) *before* the trip, not during it.

**This makes the trip MORE valuable, not less** — it now answers a question that decides a code change,
on top of HO-0015 §8's existing seven items.

## 5. Open, logged, not fixed

- **FL-0018** the ALC bug — S2, above.
- ~~**FL-0019** five checks that assert less than their names claim.~~ ✅ **ALL FIVE FIXED
  2026-07-31, 14 mutants red-then-green** (labs + shadow repos; no real source or contract edited).
  New `T0.6` (build-gate **14 → 15**); sync_gate got a real ~110-line XML well-formedness scanner,
  per-artifact `runtime_unverified`, a new `revit_addin_ids` GUID **value** pin, and `.addin` pair
  identity; T5 resolves the FULL class name; T4b now prints a ⚠️ COVERAGE line instead of reporting
  a shrunken pin as `1/1`. **No sync check NAME changed, so gate 14 needed no re-bless.**
  ⚠️ **TWO THINGS THAT SESSION GOT WRONG, both caught by its own mutants and recorded in FL-0019 §6.**
  First: **this handoff's own prescription for (e) was a tautology.** "Assert the compiled golden
  resolves under `$ADDIN_ROOT`" cannot be implemented — the golden is a SIBLING, at
  `dirname($ADDIN_ROOT)/09_tests/…`, which is precisely where `DEDARMS.Tests.csproj:91`'s three-level
  climb already lands, so composing that path and comparing proves nothing. The first draft did
  exactly that, went green, and was caught only by asking what would have to be true for it to go
  RED. **A check that passes on the real tree has proved nothing until it has been made to fail.**
  What T0.6 actually asserts: a lab must not silently compile against THIS repo's golden
  (`BUILD_GATE_LAB_GOLDEN_OK=1` declares the borrow deliberately).
  Second: the (b) fix **shipped FL-0019(a)'s own bug inside it** — its GUID sweep was a UNION over
  all four manifests, so deleting an `<AddIn>` block from the project copy while the deploy twin
  still declared it scored GREEN, with the declaration count sliding 6 → 5 as the only trace.
  Closed by pair identity. **A union can never see a per-file loss** — this repo has now met that
  exact shape four times (FL-0011, FL-0013, FL-0019 a, and inside its own fix).
- ~~**Unmeasured, needs a go-ahead:** whether an **in-place** rebuild still yields
  `d521ad30`/`43805105`.~~ ✅ **RUN AND ANSWERED 2026-07-31 — BOTH REPRODUCE.** `d521ad30` **×4**
  (`--no-incremental`; again via `DEDARMS.Lab`'s `ProjectReference`; again after `rm -rf bin obj`
  with an offline restore; and once more as the Lab's reference on that clean pass) and `43805105`
  **×2**. 0 errors, 0 warnings throughout. Restored per the protocol's step 4, four shas re-verified,
  `1a3b7ead` never touched, then **14/14 twice — 88 check names identical, 0 FAIL lines.**
  **This is the first evidence in this repo that a blessed artifact and the source on disk agree, and
  it closes lane E's FG-7 for the two 2025 assemblies.** Recorded as `provenance_2026_07_31` on both
  manifest artifacts. ⚠️ **True at that absolute path ONLY** — the builds stay location-dependent, so
  Phase 7 must re-establish this after re-homing rather than carry it forward. ⚠️ **`runtime_unverified`
  is untouched on all three** and stands; provenance is not runtime.
  ⚠️ **THE PROTOCOL ITSELF WAS DEFECTIVE — FL-0020, found on its own first command.** Its step 2 was a
  bare `dotnet build`, which MSBuild answered **incrementally**: `CoreCompile` skipped, mtime frozen at
  `2026-07-30 20:30:01`, and the sha comparison then reported the untouched July bytes as a
  reproduction — 3.6 s, `0 Error(s)`, ordinary success banner. **Had it been reported as written, this
  handoff would now carry the strongest provenance claim the repo has ever made, backed by a command
  that cannot produce it.** FL-0011 / FL-0019(e)'s class, in the instrument rather than the gate.
  The protocol is corrected in place (step 2 takes `--no-incremental`; a new step 2a **asserts the
  mtime moved before any sha is believed**, then does a clean `rm -rf bin obj` rebuild).
  ⚠️ Also confirmed: `known_stale["obj/Release"]`'s corrected reading — the clean rebuild reproduced
  the blessed sha in **both** `bin/` and `obj/`. The never-carry-from-`obj/` rule is unchanged.
- `compare_placement.py` has **no `--selftest`**, and **no gate runs any of the three Python oracles**.
- `artifacts.hospital_with_geometry` is a pinned sha **no code reads** — a slot without a check.
- `known_issues.null_byte_in_strip_compare` names **1 of the 3** NUL-bearing files.
- `Core/` names 7 feature types in live code (`PaneFeatureRegistry.cs:29,30`; `RibbonRegistry.cs:47,
  59,69,79,89`). Harmless inside one assembly; **blocks a future `DEDARMS.Core.dll`** in Phase 6/7.
- `PipelineResult.cs` — which owns the `ISubtxJournal` checkpoint/restore the split forced — is **not
  linked into `DEDARMS.Tests`**. It is correct (proved by a purpose-built suite), but nothing in the
  repo would catch a regression.

## 6. What this session got WRONG, recorded on purpose

**My own lane brief told all four lanes to wrap dotnet in `flock <lock> -c …` without `--close`.**
`dotnet build` spawns VBCSCompiler, which inherits the lock FD and outlives the run, so the lock was
never released and four lanes queued behind a dead process. Lane A reported it as a finding; it was
**my harness bug, not a repo defect**, and was withdrawn. `build_gate.sh:130` already uses
`flock --close` correctly — this was FL-0012's mechanism, one level up, re-created by the person who
had just read about it. Corrected mid-flight to the three live lanes.

Also: an early edit of mine injected **3 literal NUL bytes** into `dll_embed_V1_0_0.mjs` while fixing
a NUL-related check. Caught and scrubbed; all seven edited files verified NUL-free afterwards.
**FL-0013's trap is easy to re-spring even while reading about it.**

## 7. Lane D — the docs audit, which found MORE than the code lanes did

Lane D ran last, against the cold measurements. **It found ~31 defective claims across the living
docs**, and the two worst were not line numbers at all:

### Fixed this session (all re-derived by command first)
1. ⭐ **`repo_runbook §9` said "The add-in IS runtime-verified" — flatly contradicting §0 of its own
   file (`:34`).** The 104/128 hospital run was real but was **`9f16a1e7`**, not the shipping
   `d521ad30`. A reader planning the trip would have believed the current DLL had been exercised.
   Corrected with a banner; the evidence is kept, its subject is named.
2. ⭐ **`13_addin/CLAUDE.md:41` said the blessed copy "has run inside Revit"** (false) **and that the
   golden climb is FOUR levels** (it is three). Both corrected, plus "3 projects"→**4** and
   "13-gate suite … of which the above is the last"→**14, and gate 13 is NOT last**.
3. **Gate/check counts** repointed: runbook heading 13→**14**, `--no-build` 12/12→**13/13**, sync
   21/19 and 22/20→**24/22** (runbook ×3, root `CLAUDE.md`, `README_engine`), manifest "13 gates"→14.
   ⚠️ These were not cosmetic — **FL-0017's new `EXPECTED_GATES` pin makes a reader who trusts "13"
   hit a deliberate SUITE RED.**
4. **Manifest `known_stale["obj/Release"]`** — reason was false (see §5); rewritten, rule kept.
5. **Manifest `null_byte_in_strip_compare`** — named 1 of **3** NUL-bearing files and had the line
   wrong (108→**106**). Widened, with the re-derived contexts. Lane D independently re-confirmed
   **FL-0013's will-not-fix HOLDS**: all five NUL bytes are composite-key delimiters, one
   self-documenting, and stripping them would inject collisions.
6. `.cs` counts: root `CLAUDE.md` `7,802,880`→**7,803,392**; runbook "96 add-in source files"→**100**.

### NOT fixed — owed, and deliberately left
- **~15 further stale `file:line` citations**, mostly in `00_Docs/dedarms_separation_decisions_*.md`
  and `13_addin/CLAUDE.md` (`IconFactory.cs:231`→`:251`, `RibbonRegistry.cs:47,97,104`→`:55` +
  `LabFeatureModule.cs:43,50`, `RibbonBuilder.cs:62`→`:69`, `sync_gate.mjs:370/:381`→`:531`/`:542`,
  `dll_embed:89`→`:99`, `DEDARMS.csproj:29`→`:66`). **Several are NOT mechanical** — Phase 5b moved
  the resource literals to a different FILE, so the *set* changed, not just the numbers.
- `13_addin/CLAUDE.md` `.cs` partition (says 74 and 25/36/7/1=69; actual **72 = 27/37/7/1**, Lab 6),
  "three panels"→six, `DeployAddin` prose (removed in 5c), "the ONLY buildable shipping code".
- `repo_runbook:455` "no automated test runner" — the exact sentence `13_addin/CLAUDE.md:33` already
  corrected; the runbook copy was missed.
- `decisions §D3` describes `IconFactory` using `GetExecutingAssembly()` **in the present tense** —
  Phase 5b removed that. **Banner it as pre-5b rationale; do not silently repoint.**

### Lane D's judgement call, adopted
**FL bodies: repoint the `Component` field (a living index pointer), ANNOTATE the narrative body
(a historical record).** Precedent both ways exists in-repo — HO-0009's row fixed line numbers in
place, while FL-0013 §6 deliberately left consumed handoffs alone. FL-0013's `Component` cites
`build_gate.sh:355` (now a blank line; real target `:556`) and FL-0014 §2 cites `:296` (now `:469`).
⚠️ **When annotating FL-0014, state that its 4-swallow / 2-throw arithmetic is STILL CORRECT** —
lane D re-derived it — or the next reader will assume the whole table rotted with its line numbers.

## 8. Successor

> ✅ **CONSUMED 2026-07-31 by [HO-0017](HO-0017_phase6-claude-md-split-complete.md) — Phase 6 ran.**
> The split is done: `13_addin/CLAUDE.md` is now an ~11 KB hub plus six documents in `13_addin/docs/`,
> and `00_Docs/drift_surfaces_V1_0_0.md` exists. **The four `sync_gate` consumers needed no repoint
> and were mutant-proved anyway** — and that mutant caught a false green this repo's own new banner
> had introduced (**FL-0022**). Everything §5 lists as open is still open; nothing here was closed by
> Phase 6. **Resume at HO-0017 §8 (Phase 7).**
> ⚠️ The line numbers in §8 below were already stale when Phase 6 opened the file (**318 lines /
> `:272`,`:273`,`:277`** vs the measured **331 / `:284`,`:285`,`:289`**), and the file has since been
> split, so they are void. The *rule* they illustrate stands.

**HO-0015 is `consumed` by this entry.** Its §8 trip list is still required reading and is unchanged
except that FL-0018 is now item 0 on it.

Resume at **Phase 6** — briefing written and ready: **`/sdcard/Download/DEDARMS_PHASE6_PREP_2026-07-31.md`** (self-contained; the plan's §7.3 line map is DEAD — it describes a 222-line file that is now 330, and the fake-heading trap is now TWO fences, not one). 🚩 **Its §5 is the part that can go red: FOUR sync_gate checks read `13_addin/CLAUDE.md`, not the two the plan names, and `replay2023_dll`'s honesty check hangs on a SINGLE line.** ~~decide FL-0018~~ — done 2026-07-31. ~~then FL-0019 item (e)~~ — **FL-0019 is CLOSED,
all five items, 2026-07-31 (14 mutants). Read its §6 before writing any new check: this handoff's
own (e) prescription turned out to be unimplementable as written, and the fix for (b) shipped
(a)'s bug inside it.** The in-place rebuild test is also done — **both DLLs provably come from the
tree on disk** (`provenance_2026_07_31` in the manifest), so **nothing on the phone is queued ahead
of the trip and `App.cs` is free to change when the box answers FL-0018.**

⚠️ **`build_gate.sh` is 844 lines and its citations have now been stale in FIVE consecutive
sessions.** Current: `build_project()` `:291` · sole `-c Release` `:294` · **FOUR** call sites
`:347`/`:353`/`:377`/`:396`. `DEDARMS.Tests.csproj` is 95 lines, golden climb `:91`, depth **3**.
`13_addin/CLAUDE.md` is 318 lines with **THREE** shipping-sha anchors at `:272`/`:273`/`:277`.
**Re-measure. Do not copy these forward.**
