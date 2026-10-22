# HO-0014 — Phase 5b done: `DEDARMS.Lab.dll` exists, Core is 9 MB lighter, D2b and D2c are both closed. Phase 5c is next.

| Field | Value |
|-------|-------|
| **ID** | HO-0014 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` — superseded by **HO-0015**, which executed its next action (Phase 5c) in full and COMPLETED Phase 5. **Its Phase 5b record stands unchanged.** ⚠️ Its §7 `build_gate.sh` numbers are stale again: `build_project()` **`:291`**, sole `dotnet build -c Release` **`:294`**, call sites **`:347`/`:353`/`:377`/`:396`** |
| **Tree state** | `clean` — **14/14** (twice, identical by gate name) · `--no-build` **13/13** · `--quick` **6/6** · build-gate **12/12 of 12** (was 10 — T0.5 + T4c added) · sync **22/22 full · 20/20 quick** · **112** tests · shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead` **unmoved** |
| **Blocked on** | nothing — Phase 5c is startable now, on the phone |
| **Next action** | **Phase 5c** — deploy shape, T5, and the re-bless. **Read `00_Docs/dedarms_separation_decisions_V1_0_0.md` first; it OUTRANKS the plan.** §7 lists what 5c now owes, including two items 5b created |

---

## 0. The one-line answer

**There are now TWO shipping assemblies.** `DEDARMS.dll` **16,824,832 → 7,802,880 bytes**; the
9.0 MB of Lab media lives in `DEDARMS.Lab.dll`, which a client deploy can simply omit. Core names
**zero** Lab types — verified by grep — so the satellite is genuinely optional rather than
nominally optional.

Both of the obligations the record left open are closed: **D2b has an instrument** and **D2c has
a decision**. Both of Phase 5b's Revit-only landmines are fixed.

---

## 1. D2b resolved — and none of its three options was taken

§D2b offered (a) build both configurations, (b) build with the flag on, (c) skip if absent
(rejected on sight). **The question dissolved instead of being answered**, and that is worth
recording because the reasoning generalises.

D2b presumed Lab would be conditionally **compiled into** `DEDARMS.dll` behind an
`IncludeLabFeatures` property defaulting OFF for Release. Phase 5b made Lab a separate
**project**, so the 9 MB leaves the client assembly *structurally* — `DEDARMS.csproj` can no
longer embed the cats even deliberately. **There is nothing left for a second configuration to
prove.**

What shipped: **gate 13 builds both PROJECTS** (new check **T0.5**), unconditionally.
⚠️ **There is no `IncludeLabFeatures` property at all, deliberately** — adding one would
re-introduce exactly the hazard D2b identified, a switch that can make a build silently not
happen. Whether Lab **ships** is a deploy decision, not a build-time one.

**T4b went per-assembly and split in two:**

| Check | Asserts |
|---|---|
| **T4b** | `DEDARMS.dll` contains its 2 names **AND does NOT contain Lab's 3** |
| **T4c** | `DEDARMS.Lab.dll` really carries those 3 |

**T4c is not redundant:** the must-NOT-contain pass alone is also satisfied by the cats existing
**nowhere** — a different silent Revit failure wearing the same green badge.

**B4 is now MEASURED, not assumed** (§14 required this): the split is **2 / 3**, against both
freshly built assemblies, all five names unchanged. That is the fourth of §14's five predictions
closed; only "everything inside Revit" remains.

## 2. D2c resolved — the probe reports on FAILURE, never on ABSENCE

`App.DiscoverButtons` splits the cases on `File.Exists`, and that line is the decision:

| Satellite state | Behaviour |
|---|---|
| **absent** | silent — 14 buttons, no dialog, no log line |
| **present, fails to load** | **`TaskDialog`** naming the file |
| **present, loads, exposes no `IFeatureModule`** | **`TaskDialog`** |

**The distinction is not "are the Lab buttons here" but "is a file we shipped broken".** Absence
is the normal client state; a shipped file that does not work is a defect.

Two details that are load-bearing rather than incidental:
1. **`Buttons` is materialised inside the `try`** (`.ToList()`). A lazily enumerated property
   would throw later, during ribbon construction, **outside** this catch — landing back in
   `RibbonBuilder`'s silent `catch { }` and restoring the exact indistinguishability D2c exists
   to remove.
2. **The probe never rethrows.** `OnStartup` throwing makes Revit disable the add-in for the
   whole session.

## 3. The two Revit-only landmines, both fixed

- **`RibbonBuilder`** — `Assembly.GetExecutingAssembly().Location` was hoisted **out of the loop**,
  i.e. always Core's path. Now `def.CommandType.Assembly.Location`, **per button**. With a
  satellite, Revit was otherwise handed Core's DLL and told to find a type not in it: fails at
  **click** time, per button, swallowed by the `catch` at the bottom of the loop.
- **`IconFactory.FromEmbeddedImage`** gained a **required** `Assembly owner`. It resolved with
  `GetExecutingAssembly()` = **IconFactory's own assembly, Core**, regardless of caller. ⚠️ Plan
  §6.0 claims this fix became unnecessary once Lab owns its ButtonDefs; **it does not follow, and
  the parameter has no default so the bug cannot be restored by omission.** The failure mode is
  `null` returned without throwing → `ApplyIcon`'s catch never fires → the two Lab buttons (which
  have no `?? IconFactory.Create` chain) get **Revit's default button image**, silently.

**D1's "2 types, not 17" held exactly:** only `Theme` and `IconFactory` needed to go public.

## 4. Mutant-proved — and one mutant corrected a claim I had just written

| Mutant | Result |
|---|---|
| cat `<EmbeddedResource>` left in `DEDARMS.csproj` | **T4b RED**, naming the leaked resource |
| `<RootNamespace>DEDARMS.Lab</RootNamespace>` in the satellite csproj | **GREEN — inert** |
| same, **plus** the `<LogicalName>`s removed | **T4c RED**, all three renamed |
| `<LogicalName>`s removed, RootNamespace inherited | green — but only by **coincidence** |

⚠️ **Mutant 1 would have scored GREEN under the old flat list** — the name still exists in *a*
DLL. That is the concrete demonstration that **ownership, not existence**, was the thing worth
checking, which is precisely what D2b argued.

⚠️ **Mutant 2 falsified a comment this session had just written.** The Lab csproj banner said a
`<RootNamespace>DEDARMS.Lab</RootNamespace>` "would silently rename all three cat resources". **It
would not** — the `<LogicalName>`s neutralise it. Corrected in the csproj and in T4c's failure
text. The accurate statement: **the two guards are AND-ed and `<LogicalName>` is the load-bearing
one**; the property is still forbidden because it arms a trap for whoever later deletes the
LogicalNames as "redundant". **Row 4 is the real fragility** — with the LogicalNames gone the
names are merely *derived* correctly today, and any folder move inside the Lab project would
rename them again with 0 build errors.

## 5. A consumer I missed, and the gate caught it

Splitting the manifest pin to a per-assembly object broke **D8a's sync_gate check**, which reads
the same field. It went **RED** — *"missing or empty — Restore the field rather than dropping the
check"* — which is exactly the FL-0009 behaviour it was built with. Fixed to read the union.

⚠️ **That check is now correct only until Phase 5c re-blesses.** The blessed carry copy
`9f16a1e7` **predates the split** and still embeds all five names, so the union is right today.
The moment 5c re-blesses, the carried `DEDARMS.dll` owns 2 and the cats move to a new
`DEDARMS.Lab.dll` carry copy — **the check will go red naming the three cats, and that red is
correct, not a regression.** Its failure text says so on the day, and says the fix is to assert
per-artifact, not to delete the assertion.

## 6. Numbers

**14/14 twice, identical by gate name** (FL-0006) · `--no-build` 13/13 · `--quick` 6/6 ·
build-gate **12/12 of 12** · sync **22/22 · 20/20** · **112 tests** · Core ButtonDefs **14**,
Lab **2**. `.cs` 98 → **100**. Gate 14 needed no re-bless: no sync_gate check *name* changed.

**Files:** new — `Core/IFeatureModule.cs`, `DEDARMS.Lab/` (csproj + `LabFeatureModule.cs` + 5
moved `.cs` + 3 moved resources), this file. Modified — `App.cs`, `RibbonBuilder.cs`,
`RibbonRegistry.cs`, `IconFactory.cs`, `Theme.cs`, `DEDARMS.csproj`, `DEDARMS.sln`,
`build_gate.sh`, `sync_gate.mjs`, the manifest, the decision record, both `CLAUDE.md`s, the runbook.

## 7. What Phase 5c owes — including two items 5b created

1. **T5, source-anchored** (D2a) — compose `DEDARMS.App` from `App.cs` and compare to all four
   `.addin` manifests; assert `<Assembly>` == built `<AssemblyName>` + `.dll`.
2. **Deploy shape** — `builds/r2025` + `builds/r2023` + nested `deploy/` (C1). ⚠️ *(NEW, from 5b)*
   **the deploy must now carry `DEDARMS.Lab.dll` too**, and E5's unstated consequence finally
   bites: a missing satellite is no longer a TypeLoadException — D2c's probe turns it into 14
   buttons and silence, which is the *designed* behaviour and therefore invisible. **Decide
   deliberately whether the client deploy ships Lab.**
3. **Drift (a)** — `Nullable`/`ImplicitUsings` onto Replay2023. ⚠️ *(NEW, from 5b)* until it lands,
   **every new project must declare both explicitly** — `DEDARMS.Lab.csproj` does, and omitting
   them cost ~30 `CS0246`s for `IEnumerable`, `EventArgs`, `IntPtr` and `Random`.
4. **FL-0013 item 4** — the two stray NUL bytes.
5. **The re-bless + the honesty flag.** ⚠️ Record LOUDLY that the re-blessed DLLs have never run in
   Revit. And see §5: D8a's check goes red on re-bless **by design** — make it per-artifact.
6. **Re-read `install_replay2023.ps1:210-215`** against C1.

⚠️ **`build_gate.sh` line numbers moved AGAIN** (Phase 5b added ~30): `build_project()` **`:282`**,
sole `dotnet build -c Release` **`:285`**, call sites **`:338` / `:344` / `:368` / `:387`**.
**Third consecutive session.** Re-measure; do not quote this line either.

## 8. What none of this proves

**Every result above is a phone result, and 5b is the phase where that matters most.** Gate 13
proves two assemblies compile, 112 tests still pass, and the resources are embedded *and reachable
by name in the right DLL*. It cannot press a button.

**Provable only on the Revit box, all four new:**
- the ribbon renders **14 buttons with Lab absent, and no exception** (D2c);
- a **deliberately corrupted** `DEDARMS.Lab.dll` does **not** look identical to an absent one
  (D2c — this is the one that has never been true before, so it is the one most worth checking);
- both Lab buttons **fire**, from the satellite's own path (`RibbonBuilder`);
- both Lab buttons show their **correct icons**, not Revit's default (`IconFactory` owner).

Plus, still owed from 5a: a full SLD generation run, because `SubtxRunner`'s checkpoint now
round-trips through `object` and a rollback that quietly stopped working looks exactly like a
clean run.

`_snapshot_pre_split_2026-07-30/` remains the only undo, and now predates two structural phases.
