# FL-0018 — `App.DiscoverButtons` uses `Assembly.LoadFrom`, which loads a SECOND Core if Revit isolates add-ins

| Field | Value |
|-------|-------|
| **ID** | FL-0018 |
| **Title** | `typeof(IFeatureModule).IsAssignableFrom(t)` is identity-sensitive across AssemblyLoadContexts; `LoadFrom` always targets the Default ALC, so the Lab buttons silently vanish and the dialog blames the wrong thing |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-31 |
| **Status** | **`fixed`** — applied, re-blessed, 12 cells measured; see §4 |
| **Severity** | **S2** (S1 if Revit 2025 is confirmed to use a custom ALC) |
| **Stage** | 6 Render/Revit |
| **Component** | `13_addin/Revit Addins/DEDARMS/Core/App.cs:119` (`DiscoverButtons`) |
| **Failure class** | silent-skip |
| **Detected by** | Phase 5 verification — reasoned in the plan's §2 item 1, then **REPRODUCED headlessly** by lane B and independently by the main thread |

---

## 1. Symptom

`DiscoverButtons` does:

```csharp
var asm = Assembly.LoadFrom(path);                                   // :119
var found = asm.GetTypes()
    .Where(t => typeof(IFeatureModule).IsAssignableFrom(t) …)         // :124
```

Reproduced twice, independently, with two separately written harnesses. Main-thread matrix
(`/root/alcrepro`: `CoreLib.dll` defines the interface + the identical probe, `Sat.dll` implements
it, `Host.dll` plays Revit):

```
scenario=default mode=shipped -> found=1  coreALC=Default         satALC=Default         CoreLibInstances=1
scenario=default mode=fix     -> found=1  coreALC=Default         satALC=Default         CoreLibInstances=1
scenario=custom  mode=shipped -> found=0  coreALC=RevitPluginAlc  satALC=Default         CoreLibInstances=2
scenario=custom  mode=fix     -> found=1  coreALC=RevitPluginAlc  satALC=RevitPluginAlc  CoreLibInstances=1
```

Lane B's harness additionally showed the bug fires for `Assembly.LoadFile` and for a "strict" custom
ALC whose `Load()` returns null for everything — 3 of its 4 host modes broken, all 4 fixed.

## 2. Impact

**The two Fun-panel buttons disappear and the on-screen explanation points at the wrong cause.**

`found.Count == 0` lands on `App.cs:132-138`, which shows:

> `DEDARMS.Lab.dll is installed but exposes no feature module, so its buttons are missing from the
> ribbon.` / `The rest of the add-in is unaffected.`

Under this failure the type **is** public, **does** have a parameterless constructor, and `LoadFrom`
**succeeded** — only `IsAssignableFrom` said no. `LabFeatureModule.cs:14-17` reinforces the same dead
end ("THIS TYPE MUST STAY PUBLIC AND KEEP A PARAMETERLESS CONSTRUCTOR"). A reader on the Revit box
will re-check accessibility, rebuild, redeploy, and see the identical dialog. **That is a burned
round trip on a machine this project reaches rarely** — and the Revit trip is the critical path.

Silver lining, verified: the failure is **loud** (a `TaskDialog`), not silent. The plan asked for
that claim to be checked rather than assumed; it holds.

## 3. Root cause

`Assembly.LoadFrom` **always** loads into the Default ALC, regardless of which ALC the calling
assembly lives in. Its dependency hook then probes the loaded file's own directory, finds
`DEDARMS.dll` sitting beside `DEDARMS.Lab.dll` (they ship in the same folder by design — the
satellite is discovered "beside itself"), and loads a **second instance of Core into Default**.

`Sat`'s `IFeatureModule` then resolves to Core-instance-2's type. `typeof(IFeatureModule)` inside
`App` is Core-instance-1's. **Two `Type` objects, same name, different identity** →
`IsAssignableFrom` returns false → `found.Count == 0`.

**The one thing that decides whether this is live: does Revit 2025 load add-ins into a custom
AssemblyLoadContext?** Not measurable on this phone, and nothing in the repo records it. Revit 2025
runs on .NET 8, where add-in isolation via a custom ALC is the idiomatic host design — which is why
this is ranked S2 rather than S4, but it is **not confirmed**.

## 4. Resolution — **APPLIED 2026-07-31** (was: NOT APPLIED, deliberately)

> **Mayo's call, given 2026-07-31.** What shipped is NOT the one-liner below — that was measured to
> break the case that works today. See §4a.


Verified fix (works in all four host modes, both harnesses):

```csharp
var alc = AssemblyLoadContext.GetLoadContext(typeof(App).Assembly) ?? AssemblyLoadContext.Default;
var asm = alc.LoadFromAssemblyPath(path);   // same context as Core, by construction
```

**Why it was not applied in this session:** editing `App.cs` changes `DEDARMS.dll`, which invalidates
the blessed `d521ad30`, which cascades into the manifest, the installer pin, three living-doc sha
anchors and a re-bless. That is a deliberate act with trip-level consequences, not a "cheap and safe"
fix, and the verification session's remit was explicitly the latter. **It is Mayo's call.**

⚠️ **MEASURED REGRESSION RISK IF APPLIED** (lane B, reproduced with a `Dep.dll` beside the satellite):
`LoadFromAssemblyPath` does **not** install `LoadFrom`'s sibling-directory dependency probe.

```
mode=SHIPPED Assembly.LoadFrom     -> found.Count = 2
mode=FIX alc.LoadFromAssemblyPath  -> THREW FileNotFoundException: Could not load 'Dep, Version=1.0.0.0…'
```

Not a problem today: `DEDARMS.Lab.deps.json` lists only `DEDARMS` plus two reference-only Nice3point
packages, and `deploy/DEDARMS/` holds exactly three files. **The day Lab gains a private NuGet
dependency, this fix turns a working ribbon into a "could not be loaded" dialog.** If applied, either
add an `alc.Resolving` handler probing `coreDir`, or keep Lab dependency-free by written policy.

### Cheaper alternative that does NOT require choosing (still a rebuild, but no behaviour change)
Append the discriminator to the `found.Count == 0` message:
`AssemblyLoadContext.GetLoadContext(typeof(App).Assembly)?.Name` vs `…GetLoadContext(asm)?.Name`,
plus the count of loaded `DEDARMS` assemblies. **If those two names differ, it is this bug and
nothing else.** One line converts an ambiguous trip into a decided one.

### Cheapest of all — costs no rebuild and settles it outright
Ask anyone with a Revit 2025 box to print, from any add-in:
`AssemblyLoadContext.GetLoadContext(typeof(App).Assembly)?.Name`
**If it prints `Default`, this FL is dead and can be closed `wont-fix`.**

## 5. Regression guard

**None yet — this entry is `open` and that is the honest state.** No gate on this phone can observe
Revit's load context. What exists now:

- Two independent headless reproductions (`/root/alcrepro`, lane B's `/tmp/b2repro`) that a future
  session can re-run to confirm the mechanism and to test any candidate fix in all four host modes.
- `App.cs:98-100` already asks the Phase 9 trip to prove a corrupted satellite is distinguishable
  from an absent one. **Add this to that same trip checklist**, since both are answered by the same
  five minutes in front of Revit.

## 6. Prevention

The plan that found this ranked it **first while calling it unconfirmed**, and explicitly forbade
reporting it as a defect until it reproduced (§6.5). That discipline was right and is worth copying:
*cheap to check, expensive to miss* is a better ranking rule than *most likely to be true.*

It also came from reading the shipped code **against the runtime it will actually run in**, not
against the tests — a class of review nothing in this repo's gate suite can perform.

---

## 4a. What was actually applied, and why it is not the fix proposed above

**The proposed one-liner is a regression.** §4's own warning was re-measured with a `Dep.dll` beside
the satellite, and the matrix was extended to twelve cells (2 host designs × dep / no-dep × 3 load
modes) in the `/root/alcrepro` harness this FL created:

| host | satellite has a private dep | `Assembly.LoadFrom` (shipped) | `alc.LoadFromAssemblyPath` (§4) | + `alc.Resolving` probe |
|---|---|---|---|---|
| Default ALC | no | ✅ found=1 | ✅ found=1 | ✅ found=1 |
| Default ALC | **yes** | ✅ found=1 | ❌ **THREW `FileNotFoundException`** | ✅ found=1 |
| custom ALC | no | ❌ found=0, 2 Cores | ✅ found=1 | ✅ found=1 |
| custom ALC | **yes** | ❌ found=0, 2 Cores | ✅ found=1 | ✅ found=1 |

So §4's fix would have **introduced** a failure in the configuration that works today, the moment
`DEDARMS.Lab` gains a private dependency — trading a conditional bug for an unconditional one.
`LoadFromAssemblyPath` does not install `LoadFrom`'s sibling-directory dependency probe; the
`Resolving` handler puts it back, and is the only mode green in all twelve cells.

**Shipped (`Core/App.cs`):**

```csharp
var alc = AssemblyLoadContext.GetLoadContext(typeof(App).Assembly)
          ?? AssemblyLoadContext.Default;
InstallSiblingProbe(alc, coreDir);              // last-chance Resolving hook, installed once
var asm = alc.LoadFromAssemblyPath(path);
```

`Resolving` fires only after normal resolution has already failed, so it cannot shadow or reorder
anything that resolves correctly on its own — which is why it is safe on the Default context too.
It returns `null` for a file that is not there, deliberately: that lets the runtime produce its own
precise `FileNotFoundException` naming the assembly, instead of replacing it with a worse error.

**Also shipped: the discriminator from §4's "cheaper alternative".** The `found.Count == 0` dialog
now prints the core ALC name, the satellite ALC name and the number of loaded `DEDARMS` assemblies,
with a sentence saying that a mismatch means a load-context problem and **not** a problem with the
module type. Applying the real fix does not make that redundant — it makes any *future* variant of
this failure self-diagnosing on the first screen instead of the second trip.

**Re-bless:** `DEDARMS.dll` `d521ad30` → **`be6ae51a`**, and `DEDARMS.Lab.dll` `43805105` →
**`2e86b97d`** — the satellite moved with **zero Lab source change**, because it `ProjectReference`s
Core. `DEDARMS.Replay2023 1a3b7ead` untouched. The embedded family map re-extracted from the new
DLL and confirmed unchanged at `df7cfc4f`. Reproducibility verified **before** blessing: a
touch-forced `--no-incremental` build and a full `rm -rf bin obj` clean build both produced
`be6ae51a` / `2e86b97d`.

**Why applying it was cheap, stated plainly:** `d521ad30` had never run in Revit either. The usual
reason to protect a blessed sha — that it was proven on the box — did not exist here, so the
re-bless forfeited nothing. `runtime_unverified` remains `true` on both assemblies.

⚠️ **THE BUILD ITSELF NEARLY SHIPPED THE BUG — see FL-0021.** The first in-place build after editing
`App.cs` re-emitted `d521ad30` at `Build succeeded, 0 Error(s)`, because editing a file on this
phone does not advance its mtime and MSBuild therefore skipped `CoreCompile` entirely. The fix was
in the source and absent from the artifact, and the gate suite stayed 14/14 (gate 13 builds in a
scratchpad). Caught by FL-0020's rule — **a sha that does not move after a source edit is a
finding.** Any future blessing build must `touch` the sources and pass `--no-incremental`.

## 4b. What the Revit trip still owes this FL

The fix makes the add-in correct **under both host designs**, so the original question is no longer
blocking. It is still worth one line of curiosity on the box, because the answer tells you whether
this bug was ever live:

```csharp
AssemblyLoadContext.GetLoadContext(typeof(App).Assembly)?.Name
```

`Default` → the bug was latent and the fix is insurance. Anything else → it was live, and the two
Fun buttons would have been missing from every ribbon so far.
