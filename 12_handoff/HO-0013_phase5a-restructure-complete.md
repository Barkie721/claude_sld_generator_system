# HO-0013 — Phase 5a done: the add-in is restructured into feature folders. Gates green at 14/14. Phase 5b is next.

| Field | Value |
|-------|-------|
| **ID** | HO-0013 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` — superseded by **HO-0014**, which executed its next action (Phase 5b) in full. **Its Phase 5a record stands unchanged.** ⚠️ Its §7 `build_gate.sh` numbers are stale again — Phase 5b added ~30 lines. Re-measured: `build_project()` **`:282`**, sole `dotnet build -c Release` **`:285`**, call sites **`:338`/`:344`/`:368`/`:387`** |
| **Tree state** | `clean` — **14/14** (twice, identical by gate name) · `--no-build` **13/13** · `--quick` **6/6** · build-gate **10/10 of 10** (was 9/9 — a check was added) · sync **22/22 full · 20/20 quick** · **112** tests · shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead` **unmoved** · no `bin`/`obj` leftovers |
| **Blocked on** | nothing — Phase 5b is startable now, on the phone |
| **Next action** | **Phase 5b** — extract `DEDARMS.Lab.dll`. **Read `00_Docs/dedarms_separation_decisions_V1_0_0.md` first; it OUTRANKS the plan.** §7 below lists what 5b now owes, including two obligations 5a created |

---

## 0. The one-line answer

**The 74 `.cs` in `DEDARMS/` now live in `Core/ Sld/ Electrical/ Reports/ Lab/`** — 25/36/7/1/5, exactly
§0.6 E7's corrected figures. **Namespaces did not change**: every type is still `DEDARMS.*`. The five
embedded resource names did not change either, and that was not luck — it is what D3's
`<LogicalName>` pins were added to guarantee, one step earlier in the same session.

Also landed: `Directory.Build.props` + `.editorconfig` + `.sln` (§6.7), drift fixes (b) and (c), and
the three **mechanical** Core-purity violations V3/V4/V5. The two **structural** ones (V1/V2) are 5b's.

---

## 1. D3's two carried predictions are now MEASUREMENTS, and its central claim is PROVEN

The decision record's §14 carried five things it could not prove. **Two are now closed by execution.**

| # | Was | Now |
|---|---|---|
| **B2** | *"`<LogicalName>` is sha-neutral"* — predicted | **MEASURED.** Both shipping DLLs rebuilt **byte-identical** at a fixed path (`4d527168` / `187b56ef`), before and after |
| **B3** | *"a child csproj property beats `Directory.Build.props`"* — asserted from MSBuild import semantics, **never executed** | **MEASURED** via `dotnet msbuild -getProperty:RootNamespace`: DEDARMS=`DEDARMS`, Replay2023=`DEDARMS.Replay2023`, Tests=`DEDARMS.Tests`. The child wins |

**And the claim D3 actually rests on was proven in BOTH directions**, in a scratchpad lab, by moving
`Resources/` into `Sld/Resources/` exactly as Phase 5a then did for real:

```
WITH    <LogicalName>  →  DEDARMS.Resources.Cat1.png            (all five UNCHANGED)
WITHOUT <LogicalName>  →  DEDARMS.Sld.Resources.Cat1.png        (all five SILENTLY RENAMED)
```

⚠️ **The negative control built with 0 errors.** The rename is invisible to the compiler, invisible to
T4 (which finds the map by its `$schema` bytes), and would have surfaced only inside Revit — where
four of the six consumers swallow the resulting null. **T4b is the only check that catches it.**

**Plan errata E8 is wrong on this point** and is now corrected in the props file: E8 says pinning
`<RootNamespace>` means *"the resource NAMES NEVER CHANGE."* That holds only if nothing moves.
RootNamespace is one of **two** levers; the folder path is the other, and Phase 5a pulled it.

**Also demonstrated in passing:** the two DLLs built in `dedarms_ab` do not equal the two built in
`dedarms_build_gate`, from identical sources. §5 Q6's build-location-dependence was asserted; it is
now shown.

## 2. A hazard `Directory.Build.props` created, found before it could bite

**`build_gate.sh` copies PROJECT FOLDERS into the scratchpad. `Directory.Build.props` sits beside
them, one level up. It would not have travelled.** MSBuild would then walk up past the scratchpad
root, find nothing, and build the two shipping assemblies **with SDK defaults** — a different
compilation from the one that ships, reported as a pass.

Fixed both halves in the same change-set: the props file is copied to the scratchpad **root** (which
reproduces the real layout exactly, so MSBuild's upward walk stops in the same place), and a **fourth
T0.0 precondition asserts it exists**. Hard FAIL, never a skip — "build anyway if it is absent" is
FL-0001's class. **`EXPECTED_CHECKS` 9 → 10, in the same edit**, per the pin's own instruction.

## 3. ⚠️ §6.7's HOIST list would have taken gate 13 red — twice — with NO build error

§6.7 lists nine properties to hoist. **Three of them break `DEDARMS.Tests`, which §6.7's DO-NOT-HOIST
list never considers.** Both were reproduced by execution before being written down:

| Hoist | What actually happens |
|---|---|
| `PlatformTarget=x64` | the tests are **executed here** via `dotnet exec` on aarch64. Built x64: `System.IO.FileLoadException: Could not load file or assembly 'DEDARMS.Tests'` |
| `OutputPath` + `AppendTargetFrameworkToOutputPath=false` | move the test DLL from `bin/Release/net8.0/` to `bin/Release/`. `build_gate.sh` reads the TFM-qualified path |

**In both cases `dotnet build` returns 0.** T0.3 stays **green** and the damage lands at T0.4 looking
like a test defect rather than a csproj defect. All three stay in the two shipping csprojs, where they
are correct. ⚠️ **`DEDARMS.Lab` (5b) IS a shipping assembly and DOES want all three — copy them from
`DEDARMS.csproj` deliberately; they are not inheritable.**

**Hoisted (all verified sha-neutral):** `LangVersion` · `Deterministic` · `EnableWindowsTargeting` ·
`NoWarn` · `RootNamespace`.

### Drift (a) is DEFERRED to 5c, on purpose

`Nullable`/`ImplicitUsings` are absent on Replay2023. Hoisting them switches them **on** there and
changes that assembly's compiled metadata — and **`1a3b7ead` is the exact artifact HO-0005's owed
Revit 2023 trip exists to validate.** Phase 5a has no other reason to touch Replay2023, so changing it
would invalidate that evidence before it is collected, for nothing. **This is D8b Q6's reasoning
applied to drift (a).** Verified: Replay2023 still rebuilds byte-identical.

### Drift (c) is DEFENSIVE, not a live fix — and that is recorded as such

§6.7 warns that a missing `<PrivateAssets>all` on the 2025 Nice3point refs means *"shipping a
reference assembly into the addins folder is a load-time failure mode."* **Measured: an A/B build with
and without produced the IDENTICAL output folder.** Nothing was leaking; the packages already decline
to copy themselves. Kept because it is free and makes both csprojs enforce what both their comments
claim — **but it did not close a real leak, and the csproj comment says so.**

### Not done: `nuget.config`

§6.7 names it with no content. Every gate depends on an offline NuGet cache hit, and inventing a
`nuget.config` risks exactly that for no stated benefit. **Deliberately skipped, not forgotten.**

## 4. V3, V4 and V5 — and two places the plan's prescriptions were wrong

All three mechanical Core-purity violations are closed. **Core now has zero live feature-type
references** (verified by grep: no `using DEDARMS.Models;`, no feature type outside comments).

- **V3 — `SettingsStore`.** ⚠️ **The plan's fix would have made things worse.** It says *"DELETE them;
  callers already have generic `Load<T>/Save<T>`"* — but **measured: there are TEN call sites**, so
  following it literally sprays the load-bearing `settings.json` filename across ten places in five
  files. That filename is already on users' machines; renaming it silently drops their state. Instead
  the two overloads **moved** to a new `Sld/Services/SldSettingsStore.cs`, which removes the Core→Sld
  reference *and* keeps the filename in exactly one place. Call sites changed type name only.
- **V4 — `SubtxRunner`.** ⚠️ **The plan's interface does not solve the problem.** It prescribes
  `ISubtxJournal { object Checkpoint(); void Restore(object); void RecordSkip(...); }` — but
  **`SkippedItem` is itself an SLD model**, so spelling that third member concretely leaves Core
  referencing SLD through one more layer. The `...` elides the only hard part. Made it
  **`ISubtxJournal<in TSkip>`**; the checkpoint stays opaque (`object`). **All 8 call sites infer both
  type parameters and were left untouched.** (The plan says 12 call sites; **there are 8.**)
- **V5 — `DraftingViewCreator`.** Took a `PipelineResult` and called `SldTagStore.Tag` directly. It
  used the result object for exactly one thing, so it now takes `Action<string> warn` and
  `Action<View> tag`; the caller closes over projectName/sheetId/stampUtc. Three parameters left the
  signature rather than being forwarded — Core has no use for any of them.

**One latent reference found and closed:** `Core/UI/WpfKit.cs` carried `<see cref="SLDPaneControl"/>`.
A cref is a real reference, and after the split it would fail as **CS1574 — which is in the repo-wide
`NoWarn`**, for a good and unrelated reason (Tests source-links Revit-coupled files). So the one
warning that would report cross-assembly doc rot is already suppressed everywhere. Demoted to plain
`<c>` text, with the reason written beside it.

## 5. What the gates proved, and what they cannot

**14/14 twice, identical by gate name** (FL-0006) · `--no-build` 13/13 · `--quick` 6/6 · build-gate
**10/10 of 10** · sync **22/22 full · 20/20 quick** · **112 tests**.

**112 is the load-bearing number here.** The 16 repointed `<Compile Include>` links are the exact
hazard the manifest's `addin_tests` note describes — a dropped link removes tests without removing a
file. The count coming back **unchanged at 112** is the assertion that the repoint dropped nothing.

**Gate 14 needed no re-bless**, correctly: D7's baseline holds check NAMES, and none embeds a path.

⚠️ **None of this says the add-in RUNS.** §13 of the decision record applies in full. The restructure
compiles and the tests pass; the ribbon, the panes, family placement and whether Revit loads the DLL
are all untouched by every gate on this phone.

## 6. Numbers and files

**Moved:** 74 `.cs` + the 5 embedded resources, within `DEDARMS/`. **New (6):** `Directory.Build.props` ·
`.editorconfig` · `DEDARMS.sln` · `Core/Services/ISubtxJournal.cs` · `Sld/Services/SldSettingsStore.cs` ·
this file. **`.cs` count 96 → 98.**

**Modified:** `DEDARMS.csproj` · `DEDARMS.Replay2023.csproj` · `DEDARMS.Tests.csproj` ·
`build_gate.sh` · `current_state_manifest.json` · `CLAUDE.md` · `13_addin/CLAUDE.md` ·
`repo_runbook_V1_0_0.md` · `dedarms_separation_decisions_V1_0_0.md` · `sld_replay_package_V1_0_0.md` ·
`FU-0001` · 5 `.cs` for V3/V4/V5 + `WpfKit.cs` + the 10 `SettingsStore` call sites.

**`DEDARMS.Tests.csproj` is still 95 lines and the golden climb is still `:91`** — the 16-link rewrite
was made line-for-line for exactly that reason. ~10 documents cite `:91` by number.

`_snapshot_pre_split_2026-07-30/` is still the only undo. **Do not delete it.** ⚠️ It predates Phase 5a,
so rolling back to it now discards this phase entirely — it is no longer a fine-grained undo.

## 7. What Phase 5b owes — including two obligations 5a created

1. **The two STRUCTURAL violations, V1 and V2** — `RibbonRegistry` `typeof()`s all 16 commands,
   `PaneFeatureRegistry` `new`s the two panes. The `IFeatureModule` inversion (D1).
2. **D2c, still open and now the last word before the trip:** decide and record **what the Lab probe
   does when Lab is PRESENT AND THROWS.** Absent-Lab and broken-Lab are currently indistinguishable —
   both produce 14 buttons and silence.
3. **D2b, still without an instrument:** gate 13 builds `-c Release` only, and §6.6 defaults
   `IncludeLabFeatures` OFF for Release, so after 5b `DEDARMS.Lab.dll` would never be built. **Build
   BOTH configurations** via `build_project()`'s trailing-args seam. ⚠️ **Re-measure its line number
   — Phase 5a moved it from `:255` to `:275`, and the sole `dotnet build` from `:258` to `:278`.**
   *(NEW, from 5a)* — **`Lab/Resources/` is where the three cat assets already are**, so 5b moves a
   folder, not five scattered files.
4. ⚠️ *(NEW, from 5a)* **`DEDARMS.Lab.csproj` must copy `PlatformTarget`, `OutputPath` and
   `AppendTargetFrameworkToOutputPath` from `DEDARMS.csproj`.** They are deliberately NOT in
   `Directory.Build.props` (§3 above) and Lab needs all three.
5. ⚠️ *(NEW, from 5a)* **Do NOT write `<RootNamespace>DEDARMS.Lab</RootNamespace>` in the new csproj.**
   It looks right, it matches the assembly name, **and the child beats the props file — now measured,
   not assumed.** It would rename all three cat resources. The `<LogicalName>`s are the guard; keep
   them on the three entries when they move to the Lab csproj.
6. **Add `DEDARMS.Lab` to `DEDARMS.sln`.** It is new in 5a and nothing gates it.

**Then 5c:** T5 source-anchored (D2a) · drift (a) · FL-0013 item 4 (the two NUL bytes) · the re-bless
+ the honesty flag. **All the deferred byte-changing work is pooled there deliberately, so it costs
one re-bless instead of several.**

**Phase 6** must do the `13_addin/CLAUDE.md` path repointing as part of the split — Phase 5a left the
prose alone behind a translation banner rather than churn every line §7.3's line map depends on. And
⚠️ **the two sha anchors moved again: `:188`/`:192` → `:241`/`:245`.** Third pair of numbers for one
unmoved pair of sentences. **sync_gate checks 17/18 stayed green through all of it because they search
PROSE, not lines** — that is the technique Phase 6 should repoint them with.

## 8. The trap this phase is most likely to have set

**Everything above is a phone result.** The single most dangerous thing in this handoff is that
`14/14` reads like completion. It is not. Phase 5a moved 74 files and changed three Core signatures
that run inside a Revit transaction; the gates prove the sources still compile, the 112 tests still
run, and the five resources are still embedded *and reachable by name*. **They say nothing about the
ribbon, the panes, family placement, or whether Revit loads the DLL.** V4 and V5 in particular changed
code on the placement/view-creation path and are provable only on the Revit box.

**Add to the Phase 9 trip checklist:** a full SLD generation run, confirming placements and the
partial-failure path still behave — because `SubtxRunner`'s checkpoint/restore now round-trips through
`object`, and a rollback that silently stopped working would look exactly like a clean run.
