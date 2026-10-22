# DEDARMS Separation — Phase 3 Decision Record V1.0.0

> **What this file is.** The output of Phase 3 of the DEDARMS separation (plan §10 Phase 3). It
> records eight decisions and the evidence behind them. **No code was changed producing it.**
>
> **Authority.** Where this file and the separation plan
> (`/storage/emulated/0/Download/DEDARMS_SEPARATION_HANDOFF_2026-07-30.txt`) disagree, **this file
> wins** — it was written after the plan's §0.6 errata and after Phase 2's verification (HO-0008),
> and several of its decisions correct the plan. Corrections to the plan are called out inline as
> **PLAN CORRECTION**.
>
> **Standing rule this file obeys.** Every file:line and every count below was re-derived by
> execution on 2026-07-30, not copied from a prior document. HO-0008 FL-0014 exists because four
> living docs asserted facts measured once and never re-checked. Where a number here is *predicted*
> rather than measured, it says so.
>
> Written 2026-07-30. Supersedes nothing; consumed by Phase 5 (all eight), Phase 6 (D5), and
> Phase 7 (D2, D4, D5, D7, D8).
>
> **VERIFIED 2026-07-30 by a fresh session (session 5), Tier A re-derived cold. See §14 for the
> result and for what remains a prediction.** Seven defects were found and corrected in place — five
> line-number citations, D1's four-type table, and **D2c's rationale, which cited the wrong
> subsystem and leaves a new Phase 5b obligation.** All eight decisions stand. Corrections carry a
> `CORRECTED … session 5` marker.

---

## 0. The list, and why it is not the plan's list

Plan §10 Phase 3 lists eight items. HO-0008 §9 lists eight rows. **They are not the same eight.**
This record follows HO-0008 §9 (the resume authority) and carries the two orphans explicitly.

| This record | Plan §10 Phase 3 | HO-0008 §9 |
|---|---|---|
| D1 Lab exclusion mechanism | 1 | 1 |
| D2 T5 / T4b deploy completeness | 2 | 2 |
| D3 Resource-name pinning | 4 | 3 |
| D4 Owners for drift surfaces + FLs | 6 | 4 |
| D5 T8 / T9 | 7 | 5 |
| D6 Product session timing | 8 | 6 |
| D7 sync-gate check-NAME baseline | — | 7 |
| D8 The settled open questions | — | 8 |
| **C1** deploy/ stays nested (E6) | 3 | *dropped* |
| **C2** Replay stays a folder (§6.2) | 5 | *dropped* |

Plan items 3 and 5 fell out of HO-0008's table. Both are confirm-and-record with no live
alternative; they are recorded as **C1** and **C2** in §11 rather than as decisions.

**Item 1 of the plan's own list — two assemblies, not five — was already decided (§6.0, 2026-07-30)
and was re-read this session. It still reads correctly.** `DEDARMS.dll` + `DEDARMS.Lab.dll`.

---

## D1 — Lab exclusion mechanism

**DECIDED: the `IFeatureModule` inversion. Not `#if LAB_FEATURES`.**
**Plus: `IconFactory.FromEmbeddedImage` gains an explicit owning-assembly parameter.**

### Evidence

`RibbonRegistry.cs:93,100` do `typeof(MakeItRainCommand)` / `typeof(CatCinemaCommand)` inside a
static list initialiser. With `DEDARMS.Lab.dll` absent, those `typeof`s throw while JIT'ing the
registry *itself*, taking down all 16 ButtonDefs — not just the two Lab ones. The per-button
try/catch at `RibbonBuilder.cs:41-62` is downstream of the list and cannot save it.

**Both candidate mechanisms solve that.** They differ in what gets *compiled by a gate*.

> **CORRECTED 2026-07-30, same session.** This paragraph first read *"gate 13 compiles exactly one
> configuration, so `#if` means the build you SHIP is not the build you TESTED."* That was inherited
> from HO-0008 §9 and repeated without measurement, and **it has the direction backwards**.
> **Measured: `08_validation/build_gate.sh` builds `-c Release` and only Release** (the sole
> `dotnet build` was `:258` when this was written, `:278` after Phase 5a; **`:294` as of the Phase 5
> verification — see the re-measurement table under D2b, and re-measure rather than quoting any of
> them**). With
> `LAB_FEATURES` defined in Debug only, Release *is* the shipped configuration — the gate would test
> exactly what ships. **HO-0008 §9 carries the same wrong phrasing.**

**The real argument is stronger than the one that was wrong.** Under `#if`, the five Lab source
files are **compiled by no gate at any time** — not "tested in a different configuration", never
compiled at all. `MakeItRainCommand`, `CatCinemaCommand`, `CatRainOverlay`, `CatCinemaOverlay` and
`VideoAsset` would drop out of T0.1 / T0.2 / T0.3 permanently. HO-0008 §4's WILL-NOT-catch table
already records that the gate is blind to accessibility and folder structure; handing it five files
it never compiles is a strictly larger blind spot than either.

**The inversion's cost, measured this session — not estimated.** HO-0008 §4 warns that
"`internal` → `public` on all 17 types" is the biggest mechanical diff and is invisible to the gate.
Under two assemblies it is **2 types, not 17**. The Core types Lab depends on:

| Type | Declared | Edge exists | Status |
|---|---|---|---|
| `OverlayCommandBase` | `OverlayCommandBase.cs:14` | **today** — base of both commands (`MakeItRainCommand.cs:13`, `CatCinemaCommand.cs:13`) | **already `public`** — no change |
| `Theme` | `UI/Theme.cs:16` | **today** — `CatCinemaOverlay.cs:67,79` | `internal` → **must go public** |
| `ButtonDef` | `RibbonRegistry.cs:11` | **after 5b only** | **already `public sealed record`** — no change |
| `IconFactory` | `UI/IconFactory.cs:15` | **after 5b only** | `internal` → **must go public** |

> **CORRECTED 2026-07-30, session 5 (verification).** This table first read *"Every Core type the
> five Lab files touch"*. **Two of the four rows are not edges today.** Re-derived the other way
> round — enumerate every type declared in the add-in, then intersect with every identifier in the
> five Lab files (the original method grepped a hand-written candidate list, which finds only what
> the author thought to look for):
>
> ```
> comm -12 <all 175 declared types> <all identifiers in the 5 Lab files>
>   → OverlayCommandBase · Theme        (+ the 5 Lab types themselves)
> ```
>
> **`ButtonDef` and `IconFactory` appear in ZERO Lab files.** Both are named only by Core's
> `RibbonRegistry.cs` — the declaration at `:11` and the two Lab `ButtonDef` literals at `:92-104`,
> which are Core-side today and become Lab edges only when 5b moves them. The **decision and the
> "2 types, not 17" figure both stand**; the claim of measurement did not.
>
> **Reverse direction, never checked before this session:** the only Core→Lab references in the
> whole add-in are `RibbonRegistry.cs:93` and `:100`. D1's inversion scope is exactly as described,
> and is now measured rather than assumed.

### PLAN CORRECTION 7 (new, session 5) — §6.4(3)'s "TWELVE internal types" undercounts by five

§6.4(3) states *"TWELVE Core types are `internal` today"* and calls it *"the largest mechanical diff
in the split."* **Measured 2026-07-30: there are 18 `internal` type declarations in the add-in —
17 of them Core** (the 18th is Lab's `VideoAsset`). HO-0008 §4's "**17**" is the correct figure and
this record's use of it above is right.

§6.4(3) omits **`PaneFeatureRegistry`, `RibbonBuilder`, `SymbolGeometry`, `SymbolDims`,
`SldTextTypes`**. Under the two-assembly decision this costs nothing — the figure that governs is
2. **It matters only if the five-way split is ever revisited** (§6.0: *"Revisit at ~tool 10"*), at
which point the plan's cost estimate for its own #1 mechanical risk is understated by ~42%.

### PLAN CORRECTION — §6.0 is wrong that E8's IconFactory fix is unnecessary

§6.0 states: *"E8's IconFactory fix is no longer needed — once Lab owns its own ButtonDefs it loads
its own icons."* **That does not follow.**

`IconFactory.FromEmbeddedImage` resolves its stream with `Assembly.GetExecutingAssembly()` at
**`UI/IconFactory.cs:230`**. That is *IconFactory's* assembly — Core — regardless of who calls it.
Lab's ButtonDefs calling it still query Core, which after 5b no longer embeds `Hell_Cat.png` or
`Cat1.png`. Result: null stream → `return null` (`:231`) → **the button renders with no icon at
all, per button, silently, provable only inside Revit.** That is the §6.4(2) class exactly.

> **CORRECTED 2026-07-30, session 5 (verification).** Three things in this paragraph were wrong.
> **(i) Line numbers, both off by one:** `GetExecutingAssembly()` is at `:230`, not `:229` (which is
> an opening brace); the `return null` is at `:231`, not `:230`. **(ii) The failure mechanism.** It
> first read *"caught by the caller's fallback → the button renders with the wrong icon or none"*.
> Measured: **nothing is caught.** `FromEmbeddedImage` returns `null` without throwing, so
> `RibbonBuilder.ApplyIcon`'s `catch` (`:95`) never fires — `data.LargeImage = null` is simply
> assigned. And **the two Lab buttons have no fallback chain**: only the brand icon at
> `RibbonRegistry.cs:47-48` writes `?? IconFactory.Create(size)`; `:97` and `:104` do not. So the
> outcome is **Revit's default button image**, not a wrong icon. **PLAN CORRECTION 6 (new):**
> §6.4(2)'s *"falls back to IconFactory.Create (you get a wrong icon, no error)"* is true of
> `:47` only, and false of the two sites §6.0 and this decision are actually about.
> **The correction makes D1's case stronger, not weaker** — a default-looking button is less
> noticeable on a Revit box than a visibly wrong one.

The other two Lab resource sites are correct **by construction and for a different reason**:
`CatRainOverlay.cs:140` and `VideoAsset.cs:22` also call `GetExecutingAssembly()`, but *those types
move to Lab*, so their executing assembly becomes Lab. **Only `IconFactory` stays behind in Core.**

> **CORRECTED 2026-07-30, session 5.** These read `:141` and `:23`. Those are the *next* lines —
> the `GetManifestResourceStream` calls — and they were copied from root `CLAUDE.md:247-248`, where
> they correctly denote the null-swallow / `?? throw` sites, then re-labelled here as
> `GetExecutingAssembly()` sites. **This file's own preamble forbids exactly that** ("re-derived by
> execution … not copied from a prior document"). Measured: `:140` and `:22`.

E8's fix therefore survives §6.0 — in reduced form: one parameter on one method, not the six-site
landmine E8 originally described.

### What Phase 5b implements

```
Core   IconFactory.FromEmbeddedImage(string resourceName, int size,
                                     Assembly owner, double horizAnchor = 0.18)
       Theme, IconFactory → public
       RibbonRegistry drops to 14 ButtonDefs
       App.OnStartup probes for Lab and concatenates if present

Lab    LabFeatureModule : IFeatureModule
       static readonly Assembly Me = typeof(LabFeatureModule).Assembly;
       its 2 ButtonDefs pass Me to FromEmbeddedImage
```

**Not provable on the phone.** Gate 13 proves this compiles. Only Revit proves the buttons fire —
Phase 9 trip checklist.

---

## D2 — Deploy completeness: what T5 asserts, what T4b becomes, and absent-Lab behaviour

### D2a — T5 is SOURCE-ANCHORED

**DECIDED: T5 composes `<FullClassName>` from `App.cs`'s declared namespace + class and compares to
the `.addin`. It does not read the built assembly's type table.**

**Why not the binary.** HO-0008 §4 asks for `<FullClassName>` "against the freshly built assembly",
and T4b's technique looks like it should generalise. **It does not.**
`findMissingResourceNames` (`lib/dll_embed_V1_0_0.mjs:89`) works because a manifest-resource name is
**one contiguous UTF-8 string** in the `#Strings` heap — the lib's own comment calls that
discriminator load-bearing. A **type** is not stored that way: the CLI `TypeDef` table holds
namespace and name as **two separate** `#Strings` entries, so the byte sequence `DEDARMS.App` never
appears in the metadata at all. Searching for `DEDARMS` and `App` separately is vacuous — `DEDARMS`
is already inside every resource name and `App` is three bytes.

**MEASURED 2026-07-30, same session, against the blessed assemblies themselves.** This was first
asserted from the metadata format and not executed; it is now a measurement:

| Assembly | `<FullClassName>` as UTF-8 | as UTF-16LE | namespace alone | `App` alone |
|---|---|---|---|---|
| `DEDARMS.dll` — `9f16a1e7` | **0** | **0** | `DEDARMS` ×19 | ×42 |
| `DEDARMS.Replay2023.dll` — `1a3b7ead` | **0** | **0** | `DEDARMS.Replay2023` ×7 | ×12 |

**Stronger than claimed: it is absent from the `#US` heap too**, so there is no compiled literal to
find either. And the vacuity is confirmed rather than assumed — a containment search for the two
halves returns 19 and 42 hits in one assembly. **T4b's technique cannot be borrowed here.**

The only stronger options were a full PE/COR `TypeDef` walk — which `lib/dll_embed_V1_0_0.mjs`
declines twice, at `:33-35` (*"a full PE/COR reader is far more code than this gate can justify"*)
and again at `:82-83` (*"would need a full PE/COR reader; the UTF-8 heap search gets the same
answer for a fraction of the code"*) — or `MetadataLoadContext`
inside `DEDARMS.Tests`, which cuts against §5 Q4 (*"one pin, in a contract"*), is untested on this
aarch64 PRoot host, and cannot run when T0.3 is red.

**This is a deliberate downgrade from "the built assembly" to "the source that produces it", and it
is recorded as one.** It catches the Phase 5 namespace rename at the moment it is typed. It would
miss a source/binary divergence — reachable only via conditional compilation, which **D1 rejected**.

```
T5  App.cs   namespace DEDARMS;  →  public class App
             compose "DEDARMS.App"  ==  <FullClassName> in all 4 .addin manifests
    <Assembly>  ==  built <AssemblyName> + ".dll"  AND present in bin/Release/
```

The `<Assembly>` half also fixes a live misdiagnosis: HO-0008 FL-0011 measured that changing
`<AssemblyName>` today reports *"no freshly built DLL … (T0.1 must pass first)"* when T0.1 **passed**.
T5 names the real cause.

### D2b — T4b becomes a PER-ASSEMBLY expectation

**DECIDED: T4b pins which resource names live in WHICH assembly, with a must-NOT-contain pass.**

HO-0008 §9 says *"extend T4b"* without saying how. After 5b, `DEDARMS.dll` embeds 2 names and
`DEDARMS.Lab.dll` embeds 3, so **today's flat 5-name list over one DLL goes red by design** — right
reason, wrong place.

```
DEDARMS.dll       MUST contain  DEDARMS.Resources.DEDARMS_Icon.png
                                DEDARMS.Resources.revit_SLD_family_map_V1_0_0.json
                  MUST NOT      Hell_Cat.png · Cat1.png · catvideo.mp4
DEDARMS.Lab.dll   MUST contain  Hell_Cat.png · Cat1.png · catvideo.mp4
```

Cost is `findMissingResourceNames(buf, names)` twice plus a negative pass — the lib already takes a
buffer. **This is the only static check that catches a resource landing in the wrong assembly**,
which is precisely the hazard D1's owning-assembly parameter creates. A flat list is structurally
blind to it: cats in Core instead of Lab would score 5/5 green while every Lab icon silently
resolves to null.

### ⚠️ CORRECTED 2026-07-30, same session — this decision carries an unresolved Phase 5 obligation

This section first read *"Gate 13 builds the Lab-included configuration, so both assemblies exist
when T4b runs."* **That premise is false.** `build_gate.sh` builds **`-c Release` only** (sole
`dotnet build` at **`:294`** as of the Phase 5 verification; re-measure before quoting), and
§6.6 makes Lab's `IncludeLabFeatures` property **default OFF for Release**. After 5b, gate 13 would
therefore **never build `DEDARMS.Lab.dll` at all**, and per-assembly T4b's Lab half would have no
artifact to read.

**The decision stands; the plumbing to make it true does not exist yet.** Phase 5 must resolve this
explicitly and record which way:

| Option | Consequence |
|---|---|
| **(a) gate 13 builds BOTH configurations** — RECOMMENDED | roughly doubles the ~22 s. T4b then asserts **both** halves: Release excludes the cats, Lab-included embeds them. The only option that gates the 9 MB benefit *and* the Lab resources |
| (b) gate 13 builds with `IncludeLabFeatures=true` | one build, but **nothing gates the Release exclusion** — the exclusion is the whole dollar-value benefit of the satellite |
| (c) T4b's Lab half skips when the artifact is absent | **Reject on sight.** This is FL-0001's soft-skip class exactly: a check that goes green by proving nothing, with a reassuring reason |

### ✅ RESOLVED 2026-07-30 BY PHASE 5b — AND NONE OF THE THREE OPTIONS WAS TAKEN

**The question dissolved rather than being answered, and the reason is worth recording: this
whole section presumed Lab would be conditionally COMPILED INTO `DEDARMS.dll` behind an
`IncludeLabFeatures` property.** Phase 5b made Lab a separate **project**, so the 9 MB leaves
the client assembly *structurally* — `DEDARMS.csproj` can no longer embed the cats even
deliberately. There is nothing left for a second configuration to prove.

**What shipped instead:** gate 13 builds both **PROJECTS** (new check **T0.5**), unconditionally.
That is option (a)'s coverage at option (b)'s cost, and it is strictly better than either
because there is **no `IncludeLabFeatures` property at all** — deliberately. Adding one would
re-introduce precisely the hazard this section identified: a switch that can make the build
silently not happen. **Whether Lab SHIPS is a deploy decision (which DLLs get carried), not a
build-time one.**

**T4b went per-assembly as decided, and split into two checks:**

| Check | Asserts |
|---|---|
| **T4b** | `DEDARMS.dll` contains its **2** names **AND does NOT contain Lab's 3** |
| **T4c** | `DEDARMS.Lab.dll` really does carry those **3** |

**T4c is not redundant.** The must-NOT-contain pass alone is also satisfied by the cats existing
**nowhere**, which is a different silent Revit failure (every Lab icon null, the video extraction
throwing) wearing the same green badge.

**MUTANT-PROVED, and one mutant corrected a claim in this record.** Leaving a cat
`<EmbeddedResource>` in `DEDARMS.csproj` → **T4b RED**, naming the leaked resource. ⚠️ **That
mutant would have scored GREEN under the old flat list** — the name still exists in *a* DLL —
which is the concrete demonstration that ownership, not existence, was the thing worth checking.

**B4 IS NOW MEASURED, NOT ASSUMED** (§14 required this): the split is **2 / 3**, verified against
both freshly built assemblies, with all five names unchanged.

> ### ⚠️ EVERY `build_gate.sh` LINE NUMBER IN THIS FILE WAS STALE BY ~92 LINES — re-measured 2026-07-30
> The session that closed FL-0011/0012/0013 and shipped D7 + D8a (HO-0011) **added ~92 lines of gate
> code** — `flock`, `EXPECTED_CHECKS`, the shortfall banner, T4b's superset pass — **and then cited
> the pre-edit line numbers.** That is FL-0014's class, committed by the very session that closed it.
>
> **Corrected 2026-07-30 (session 6, separation Phase 5a) — AND ALREADY STALE ONCE SINCE.**
> The numbers this block first carried (`-c Release` `:258`, `build_project()` `:255`, call sites
> `:298`/`:304`/`:319`) were correct when written and were themselves a correction of
> `:166`/`:163`/`:206,:208,:223`. **Phase 5a then added ~20 lines to `build_gate.sh`** — a fourth
> T0.0 precondition asserting `Directory.Build.props` exists, the two scratchpad copy blocks, and the
> `EXPECTED_CHECKS` 9→10 note.
>
> **RE-MEASURED 2026-07-30 by execution, after that edit:**
>
> | Claim | Line |
> |---|---|
> | `build_project()` — the trailing-msbuild-args seam | ~~`:275`~~ → **`:291`** |
> | the **sole** `dotnet build -c Release "$@"` in the whole script | ~~`:278`~~ → **`:294`** |
> | the ~~three~~ **FOUR** `build_project` call sites | ~~`:331`/`:337`/`:352`~~ → **`:347` (T0.1) / `:353` (T0.2) / `:377` (T0.5) / `:396` (T0.3)** |
>
> ### ⚠️ STALE AGAIN — RE-MEASURED A THIRD TIME 2026-07-30 (Phase 5 VERIFICATION, session 7)
> **This is the FIFTH consecutive session in which these citations were wrong when read.** Phases 5b
> and 5c added ~16 more lines. The struck-through numbers above are what this block claimed; the bold
> ones are what `grep -n` returns today (`build_gate.sh` is **844** lines).
>
> **THE COUNT WAS WRONG, NOT JUST THE POINTERS — and that is the new failure.** Both this block and
> the D1 row said "**three** call sites (T0.1 / T0.2 / T0.3)". **Phase 5b's T0.5 made it FOUR** and
> neither was updated, so the doc under-reported the gate's own coverage. A drifting line number is
> noise; a drifting *count* silently misstates what is gated. When re-measuring, re-derive the SET,
> never just re-point the numbers.
>
> **Every conclusion still survived** — re-read `:291`–`:398` in full: the only trailing argument any
> call site passes is `-p:EnableWindowsTargeting=true`, so it is still the sole `dotnet build`, still
> Release-only, still unoverridden by any call site. **D2b's obligation is unchanged and re-confirmed
> a fourth time. D1 is NOT reopened — only its citation and its count were defective.**
>
> **HOW PHASE 5b ADDED THE SECOND CONFIGURATION — SETTLED, AND NOT THE WAY THIS PARAGRAPH EXPECTED:**
> `build_project()` forwards trailing args (`"$@"` on **`:294`**), and the seam is live today —
> **`:348`, `:354`, `:378`** pass `-p:EnableWindowsTargeting=true` through it. But Phase 5b did NOT
> add a second *configuration*: it made Lab a separate **project** and added a fourth call site
> (**T0.5**, `:377`), so the gate builds both PROJECTS at `-c Release` rather than one project twice.
> `build_gate.sh:356`–`:376` records why, and no `IncludeLabFeatures` property exists, deliberately.
> **Do not edit the `-c Release` literal.**
>
> ⚠️ **This block has now gone stale TWICE, in consecutive sessions, both times because a session
> edited `build_gate.sh` and a different document quoted it.** That is the strongest available
> evidence for the standing rule: **re-measure before you use these, and expect Phase 5b — which
> edits this same file again to add the Lab configuration — to invalidate the table above.** The
> claims are durable; the pointers have a half-life of about one session.

### D2c — Absent Lab is SILENT

**DECIDED: `DEDARMS.Lab.dll` absent → ribbon renders 14 buttons, no dialog, no log line, no
exception.**

§6.0 excludes Lab from Release deliberately, so **absence is the normal client state** and
announcing it would report a non-event on every client startup.

### ⚠️ CORRECTED 2026-07-30, session 5 — the distinguishability argument was false, and this leaves a Phase 5b obligation

This section first read: *"A Lab that is present but throws still hits the existing per-item
try/catch at `App.cs:44-54`, so the two cases stay distinguishable where it matters."* **Measured,
and it is wrong on both halves.**

**`App.cs:44-54` is the DOCKABLE-PANE registration loop.** It iterates
`PaneFeatureRegistry.Features` and calls `RegisterDockablePane`; its catch does
`TaskDialog.Show` (`:52-53`) — loud and reachable on a Revit box, but **it is the wrong
subsystem**. `PaneFeatureRegistry.Features` holds exactly two entries (`:29,30` — SLD Generator and
Electrical Dashboard). **Lab contributes no panes**; it ships two `OverlayCommandBase` ribbon
commands. That catch can never fire for Lab.

**The catch that would actually fire is silent.** A present-but-broken Lab fails in the ribbon
path, whose per-button handler is `RibbonBuilder.cs:62` — `catch { /* skip this button; keep
building the rest */ }`. No dialog, no log, no exception surfaced. **So absent-Lab and
present-but-broken-Lab produce the identical observable: 14 buttons and silence.** The two cases
are *not* distinguishable, which is the opposite of what this section claimed.

**The decision stands** — silence on absence is still right, for the reason given above (absence is
the normal client state). **What does not stand is the claim that this costs nothing.** Phase 5b
introduces the Lab probe (`App.OnStartup` probes for Lab and concatenates if present, per D1); that
probe is new code and **nothing yet says what it does when Lab is present and throws.** Phase 5b
must decide and record it. The cheap answer: probe failure — as distinct from probe finding
nothing — is the one Lab condition worth a `TaskDialog`, since it means a shipped file is broken
rather than deliberately absent.

**Phase 9 trip checklist:** confirm the tab loads with 14 buttons and no exception. **And confirm
the two cases are distinguishable** — a deliberately corrupted `DEDARMS.Lab.dll` must not look
identical to an absent one.

### ✅ RESOLVED 2026-07-30 BY PHASE 5b — the probe reports on FAILURE, never on ABSENCE

`App.DiscoverButtons` splits the two cases on `File.Exists`, and that single line is the whole
decision:

| Satellite state | Behaviour | Why |
|---|---|---|
| **absent** | silent — 14 buttons, no dialog, no log line | the Release deploy deliberately omits Lab, so absence is the **normal client state**. Announcing it would report a non-event on every startup |
| **present but fails to load** | **`TaskDialog`** naming the file | a file that shipped and does not work is a **defect**, not a deployment choice |
| **present, loads, exposes no `IFeatureModule`** | **`TaskDialog`** | same class — the DLL shipped without the type that makes it useful |

**The distinction that matters is not "are the Lab buttons here" but "is a file we shipped
broken".** That is what makes absence cheap and breakage loud, and it is why the probe reports
only in the branch `File.Exists` already answered yes to.

**Two implementation details that are load-bearing, not incidental:**
1. **The module's `Buttons` are materialised INSIDE the `try`** (`.ToList()`). A lazily
   enumerated property would otherwise throw later, during ribbon construction, outside this
   catch — and land back in `RibbonBuilder`'s silent per-button `catch { }`, restoring exactly
   the indistinguishability this decision exists to remove.
2. **The probe never rethrows.** `OnStartup` throwing makes Revit disable the add-in for the
   whole session, so a broken satellite must report itself and let Core continue with its 14.

⚠️ **Still only provable on the Revit box.** Gate 13 proves this compiles; it cannot press a
button. The Phase 9 checklist item above is unchanged and is now the *only* remaining
verification of D2c.

---

## D3 — Resource names are pinned TWICE

**DECIDED: pin `<RootNamespace>DEDARMS</RootNamespace>` in `Directory.Build.props` **and** declare
explicit `<LogicalName>` on all five `<EmbeddedResource>` entries.**

### Evidence

**No `<LogicalName>` exists anywhere today** (`DEDARMS.csproj:29-33`). All five names are *derived*
from `$(RootNamespace)` + folder path + filename — **two levers, and Phase 5 pulls both**: it
retargets namespaces *and* moves files into folders.

**Replay2023 is already safe and needs nothing.** `DEDARMS.Replay2023.csproj:22` declares its own
`<RootNamespace>DEDARMS.Replay2023</RootNamespace>`, and a child csproj property overrides
`Directory.Build.props` (which imports at the top). It also declares zero embedded resources.

**The pin alone does not close the trap.** `DEDARMS.Lab.csproj` is new in 5b. Inheriting `DEDARMS`
is correct — but writing `<RootNamespace>DEDARMS.Lab</RootNamespace>` in it is the natural-looking
thing to do, it matches the assembly name, **and the child wins over the props file**. All three cat
resources then rename silently. **D2b's per-assembly T4b is what catches that.**

`<LogicalName>` removes both levers by declaring the name outright — independent of RootNamespace,
AssemblyName and folder path — so the csproj string and the C# literal become the same string in
one place.

**The pin is still required regardless:** §7.2 freezes *"Root namespace: DEDARMS"* as an **identity**,
not merely as resource plumbing.

### Verification plan — and its one constraint

Adding `<LogicalName>` set to the names the resources already have is **predicted sha-neutral**
(identical name → identical `#Strings` entry). **This is a prediction, not a measurement.** Verify it,
and note the constraint from D8/§5 Q6: **both assemblies are build-location-dependent**, so the test
is valid only A/B at a fixed path:

```
build in the fixed scratchpad → record sha
add <LogicalName> → rebuild at the SAME path → compare
```

This never touches blessed `9f16a1e7`, which was not built on this host and cannot be reproduced here.

---

## D4 — Drift-surface gating and the disposition of the new FLs

### D4a — Coverage gate on surfaces 1-3; document 4-6

**DECIDED. And this CORRECTS §9.1's prescription.**

All three surfaces re-verified present on both sides this session:

| # | C# side | Map side |
|---|---|---|
| 1 | `AlignTables.cs:93,149` `DrawnCenterXCorrPx` / `YCorrPx` | `revit_SLD_family_map_V1_0_0.json:68,69` |
| 2 | `FedEdgeExtender.cs:32` `VisibleEdgeInsetPx` | `…:121,122` |
| 3 | `EquipmentLabelPlacer.cs:103` `A8FlippedTextRightGapPx = 5.3` | `…:225` |

### PLAN CORRECTION — §9.1's "make 1-3 drop-manifest-checked" would gate the wrong relation

§9.1 reads as an **equality** gate. The code is not a mirror — it is a **`?? fallback` pair**:

```
DevicePlacer.cs:742        mapEntry?.DrawnCenterXCorrPx ?? AlignTables.DrawnXCorrPx(...)
EquipmentLabelPlacer:111   _resolver.GetMapEntry(NodeType)?.FlippedTextRightGapPx
                                                          ?? A8FlippedTextRightGapPx
```

**The map value wins; the C# constant is the default for entries the map does not carry.**
`EquipmentLabelPlacer.cs:108` says so verbatim: *"(so a map without the field is unchanged)"*.
**An equality gate would go red every time the map is legitimately tuned** — a gate that punishes
correct work, and one that would be disabled within a week.

**The relation that IS assertable is coverage — and it must be PER-FIELD, not per-key:**

> For every key the C# static fallback table holds, **and for every field that table supplies for
> that key**, the published map must carry the corresponding field. Then the fallback is unreachable
> and drift cannot bite.

Same JSON, same drop manifest, no false reds.

> **CORRECTED 2026-07-30, same session.** This first said *"for every key … the corresponding
> field"*, which is too coarse. Measured at surface 2 — `Services/FedEdgeExtender.cs:161-167` is a
> **union with per-field fallback**, not an override:
>
> ```csharp
> bool hasTable = VisibleEdgeInsetPx.TryGetValue(nodeType, out var tableInset);
> if (!hasTable && mTop is null && mBot is null) return false;
> var inset = (TopInsetPx: mTop ?? tableInset.TopInsetPx,
>              BotInsetPx: mBot ?? tableInset.BotInsetPx);
> ```
>
> The comment at `:158-160` states the intent: *"A node type reaches fed-edge extension when EITHER
> source names it — so the map can opt a new family in without a code change."* **A key present in
> the map carrying only `visible_edge_top_inset_px` still reads `tableInset.BotInsetPx` from C#**, so
> key-level coverage does not make the fallback unreachable. The granularity was wrong; the relation
> was right.

**Surfaces 4, 5 and 6 get a documented cross-repo pointer only**, per §9.1 — 4 and 5 straddle C#/JS
and a third language, and 6 spans five sites in two languages with only `SLDPipeline.cs`'s runtime
check as an indirect guard.

### D4b — "Owner" means owning REPO, and FL-0011/0012/0013 get FIXED, not owned

**There is one developer.** Naming a person makes the record decorative. What has teeth is *which
repo owns the surface* and *what the change-set rule is* — that is what a later session can check.
`00_Docs/drift_surfaces_V1_0_0.md` (Phase 6 item 4) records owning repo + change-set rule for
surfaces 1-6 and for the straddling FL-0001 / FL-0002 / FL-0004.

**FL-0011, FL-0012 and FL-0013 are a different animal and get no owner.** All three are defects in
`build_gate.sh` and `lib/`. **Phase 7 step 2 says "port them, do not rewrite them"** — so porting
them unfixed **copies three defects into a second repo**, where each then needs fixing twice, and the
toolkit copy is the one Phase 5 leans on.

**DECIDED: close all three in the SLD repo BEFORE Phase 7.** HO-0008 §9 already proposes pairing
Phase 3 with the FL-0011 + FL-0012 fixes; adding FL-0013's remaining guard makes it one small
session. Fixing FL-0011 also removes the two live misdiagnoses in HO-0008 §2 and absorbs §5 Q7's
`node` precondition.

---

## D5 — T8 and T9 are RE-HOMINGS, not new gates

**DECIDED: do both.**

### PLAN CORRECTION — E7 frames these as new work; all three checks exist and pass today

| Check | Lives at | Verified this session |
|---|---|---|
| 6 | `sync_gate.mjs` — `[P1] install_replay2023.ps1 pinned sha == manifest replay2023_dll` | green, `pinned @ 1a3b7ead` |
| 17 | `sync_gate.mjs:370` — add-in CLAUDE.md `"Current shipping DLL sha256"` | anchor at **`CLAUDE.md:188`** |
| 18 | `sync_gate.mjs:381` — add-in CLAUDE.md `"Current shipping Replay2023 DLL sha256"` | anchor at **`CLAUDE.md:192`** |

They do not lose their gate because nobody wrote a replacement. **They lose it because the doc, the
installer and the sha authority all move to the toolkit while the checks stay behind in the SLD
repo.** T8 and T9 are ports with a repoint — which makes "accept the coverage drop" a decision to
**delete three checks that pass today**, a materially different proposition from declining to write
three new ones. §7.1's "Total coverage preserved" becomes true rather than false.

### PLAN CORRECTION — the anchor line numbers are stale (and have moved AGAIN since)

E7 and E12.14 both cite **CLAUDE.md:177,181**. Measured 2026-07-30: **`:177` and `:181` are ribbon
and naming prose.** The anchors were then at **`:188` and `:192`**.

⚠️ **RE-MEASURED 2026-07-30 after separation Phase 5a: they were then `:241` and `:245`.** Phase 5a
rewrote the project-structure diagram for the feature folders and added a path-translation banner
above them, ~53 lines in total. **This is the third distinct pair of numbers for one unmoved pair of
sentences.**

⚠️ **STALE AGAIN — RE-MEASURED BY THE PHASE 5 VERIFICATION (session 7, 2026-07-30): the anchors are
now `:272` and `:277`, and there are THREE of them, not two.** `13_addin/CLAUDE.md` is **318** lines.
Phase 5b/5c inserted the Lab satellite's own shipping-sha bullet at **`:273`**, between the pair this
paragraph tracks:

| anchor | line |
|---|---|
| `**Current shipping DLL sha256: …**` (`d521ad30`) | **`:272`** |
| `**Current shipping Lab satellite sha256: …**` (`43805105`) | **`:273`** ← NEW, unlisted until now |
| `**Current shipping Replay2023 DLL sha256: …**` (`1a3b7ead`) | **`:277`** |

**FOURTH distinct set of numbers for the same sentences, and the SET grew** — the same failure the
D2b block just recorded for `build_project`'s call sites. A stale number misleads; an unlisted THIRD
anchor means a Phase 6 repoint that walks this list silently leaves one behind.
**Stop citing these by line. Locate them by prose, as checks 17/18 already do.**

**Note what did NOT break: sync_gate checks 17 and 18 stayed green through the shift**, because they
locate the anchors by PROSE, not by line. That is the durable technique, and it is the argument for
Phase 6 repointing them the same way. **Phase 6 step 2 depends on these numbers — re-measure them
when it runs; do not trust this line either.** (FL-0014's class, three times over.)

**Sequencing:** Phase 6 repoints 17/18 after the CLAUDE.md split (still SLD-side), **then** Phase 7
re-homes them. Same two checks touched twice, in that order.

> ✅ **CLOSED 2026-07-31 — PHASE 6 HAS RUN, AND THE TABLE ABOVE IS NOW VOID.** Recorded by the
> HO-0018 cold review, which found this block still instructing Phase 7 as though Phase 6 were
> pending. **The numbers above are kept deliberately** — they are the record of the drift, not a
> citation, and repointing them would delete the very evidence the block exists to carry.
>
> What actually happened: `13_addin/CLAUDE.md` was split into an **86-line / 11,071 B hub** plus six
> documents in `13_addin/docs/`. So the **fifth** distinct set of numbers for these sentences is
> "there are no line numbers" — the anchors now sit at hub `:55` (Core), `:56` (Lab), `:60`
> (Replay2023), and **that triple will rot too.** ⚠️ **The shas in the table above are also stale**:
> `d521ad30` → `be6ae51a` and `43805105` → `2e86b97d` at the 2026-07-31 FL-0018 re-bless
> (`1a3b7ead` unmoved). Read the table as history; read the ledger in the hub for truth.
>
> **Step 2 needed no repoint at all.** Option (a) was taken — all shipping-sha prose stays in
> `13_addin/CLAUDE.md`, so the four consumers still find their anchors **by prose**, exactly as this
> block argued they should. `sync_gate.mjs` was byte-unchanged by Phase 6 and all 89 check names held.
>
> ⚠️ **But two of those four checks were shadowable, and this review fixed them** — see FL-0023. The
> conclusion above ("locate by prose, not by line") is right and stands; what it did not say is that
> **prose-located anchors must also be UNIQUE.** `String.match` takes the first hit, so a restatement
> earlier in the file silently stood in for the real ledger below it.

### Bookkeeping flag

HO-0008 §9 row 5 annotates this item *"the count is 9, not 8 — the registers were stale (FL-0014)."*
That correction is about **`build_gate.sh`'s 9 checks**. E7's "3 of 9" is about **the 9 add-in-related
sync_gate checks**. **Two different nines.** Harmless, but it must not be copied forward as if it
modified E7's arithmetic.

---

## D6 — The product-definition session happens AFTER Phase 7

**DECIDED: after the separation is complete — after Phase 7, before or after Phase 8.**

§15.4 recommends "after the separation" and §15.2's verification holds: the panel set is a plain
string array (`RibbonRegistry.cs:32`) and `RibbonBuilder.cs:43-44` already skips unknown panels, so
renaming, reordering, adding or dropping panels stays a one-line edit forever.

**The stronger argument is §15.5's**, which §15.4 does not draw out: product output lives in the
toolkit's `06_future_updates/`, `feature_authoring_guide.md` and `addin_architecture_V1_0_0.md`, and
*"Do NOT put product decisions in the SLD repo."* **Phase 7 creates those registers.** A session held
before Phase 5 has nowhere legitimate to file its own output.

**Cost of deciding late is bounded and gated.** If the product session splits a panel, Phase 5's
folders get reorganised: a `mv`, a csproj glob, and rewriting the 21 `<Compile Include>` links (E4).
HO-0008 §4 measured that case — *"moving a source-linked file into a subfolder → T0.3, legible,
diagnosable."* Tedious, not dangerous.

**PLAN CORRECTION (minor):** §15.4 calls the later reorganisation *"a `git mv` and a csproj glob"*.
**There is no git** (0.3(a)). It is a plain `mv`, and the Phase 0 snapshot is the only undo.

### Provisional panel set — non-binding, per §15.4

Recorded as **the live scaffold, not a stated intent** (measured 2026-07-30):

> Six panels — `SLD`, `Reports`, `Fun`, `Lab`, `Tools`, `Sandbox` (`RibbonRegistry.cs:32`).
> **16 ButtonDefs**, of which 9 are Dummy placeholders. `ButtonDef.Group` is declared at
> `RibbonRegistry.cs:19` and **set by nothing** — the `GetOrCreatePulldown` path
> (`RibbonBuilder.cs:59,66-84`) has never executed.

**Phase 5 may treat this as the expected shape. It carries no product authority.**

---

## D7 — Commit a sync-gate check-NAME baseline; the RUNNER diffs it

**DECIDED: commit `08_validation/sync_gate_checknames_V1_0_0.txt`. `run_all_gates.sh` (or a small
script beside it) captures and diffs. The check does NOT live inside sync_gate.**

### Why the guard must be outside sync_gate

§5 Q1's failure mode is that a missing `lib/dll_embed_V1_0_0.mjs` makes sync_gate die on a raw ESM
stack with **zero check lines and no `SYNC-GATE:` authority line** (HO-0008 §3, measured). **A
self-check inside sync_gate dies with everything else** and cannot see the one case the guard exists
for. Per §5 Q1, the capture must assert **a non-zero line count AND the presence of `SYNC-GATE:`**
before it writes — otherwise you bless an empty baseline that diffs clean forever.

### Why a committed file rather than §11.2's ad-hoc capture

§11.2 says dump names before and after each phase. **There is no git.** A "before" capture that is
skipped is **unrecoverable** — only the whole-repo snapshot can recover it. §0.4(2) records that this
exact trap **already bit the SLD Replay work**, and Phases 4, 5 and 7 each need it: three chances to
forget, under exactly the pressure that causes forgetting.

### Format — the detail must be stripped

```
  ok    [P1] add-in DLL carry copies match manifest sha — 2/2 present @ 9f16a1e7
             └────────── STABLE: baseline this ──────────┘  └── VOLATILE: strip it
```

The text after `" — "` carries shas and counts and **churns on every legitimate re-bless**. Baseline
`[phase] name` only.

**Scope:** baseline the **full** run. `--quick` is that set minus the two `baselineCheck`s inside
`if (!QUICK)` — 21 vs 19 today, **22 vs 20 once D8a lands**. **The diff must be mode-aware or it reds
every quick run** (see D8, Q5 interaction).

**Standing rule this file re-states because HO-0008 §3 proved it twice: diff the NAMES, never the
totals.**

---

## D8 — The settled open questions

### D8a — §5 Q8 is NOT covered by HO-0008 §9's five, and is DECIDED YES

**DECIDED: add a T4b-equivalent to sync_gate against the BLESSED carry-copy DLL. Append at the end
of its phase per E1's placement rule — never insert. Re-home to the toolkit at Phase 7, alongside
T8/T9.**

HO-0008 §9 row 8 lists five questions. §5 answered eight. Q1 became **D7**; Q7 (a `node`
precondition) folded into FL-0011's fix, which **D4b** schedules pre-port. **Q8 was covered by
neither** — D2b addresses T4b against *freshly built* DLLs in build_gate; Q8 is a different check
against a different artifact: *"Today nothing checks that `9f16a1e7` still answers to
`DEDARMS.Resources.…`"* It would have dropped silently.

It has immediate value: **HO-0005's Revit trip is still owed against `9f16a1e7` and `1a3b7ead`**, and
the carry copy is the DLL that actually reaches Revit. Zero new parsing — the lib already exports
`findMissingResourceNames`. **Consequence for D7: the baseline gains one line, 21 → 22.**

### D8b — the five ratified as recorded

| Q | Decision | Interaction with this record |
|---|---|---|
| 2 | **No `BUILD_GATE_MANIFEST`** — the shadow-repo technique drives every pin branch end-to-end. Document the technique | none |
| 3 | **`flock`** for concurrency (FL-0012) | **D4b** schedules the fix pre-port |
| 4 | **`Program.cs` stays unasserted** — one pin, in a contract | **D2a** rejected `MetadataLoadContext` in the test host for the same reason |
| 5 | **Gate 13 stays out of `--quick`** — `--quick` earns its name by being Node-only and dotnet-free | **D7's diff must be mode-aware: 22 names full, 20 quick** |
| 6 | **`<PathMap>`/`<Deterministic>` stays Phase 5**, where a re-bless is already owed | **D3's sha-neutrality test is A/B at a fixed path only** |

**Measured this session:** `<Deterministic>true</Deterministic>` is set on **Replay2023 only**
(`DEDARMS.Replay2023.csproj:33`); the main DEDARMS assembly does not set it, and **`<PathMap>` is set
nowhere**. §6.7 lists both among the properties to hoist.

**Why Q6 is not pulled forward.** Doing it now changes compiled output and **forces a re-bless of
`9f16a1e7` and `1a3b7ead` — the exact shas HO-0005's owed trip exists to validate.** That invalidates
the evidence before it is collected. Phase 5 already owes a re-bless: doing it there costs one
instead of two.

---

## 11. C1 and C2 — the two plan items HO-0008's table dropped

**C1 — `deploy/` stays NESTED per project (E6). CONFIRMED, not re-opened.**
The four `.addin` manifests are **two identical pairs** (source + deploy copy, byte-identical within
each pair); a flat folder holds 2, not 4, and `ADDIN_MANIFESTS` has no valid 4-path shape flat.
E6 also corrects §3.4(c)'s direction: flattening makes `'/deploy/'` match **all four** paths
(tested), including the two source manifests whose DLL sits under `bin/Release` — **2 new hard reds,
not a silent stop**. `install_replay2023.ps1:210-215`'s subfolder + flat-fallback logic must be
re-read against this at Phase 5c (E12.12).

**C2 — Replay stays a FOLDER inside Sld (§6.2). CONFIRMED. Written down so nobody "fixes" it.**
There is a genuine cycle: `ReplayCapture.cs` reads the SLD machinery (CoordinateTransform ×7,
DetailLinePlacer ×4, SLDPipeline ×3, …) while `SLDRequestHandler.cs:15` declares
`SLDRequest.ExportReplay`, dispatching at `:72` and calling `ReplayCapture.Capture` at `:122`. The
comment at `:65` records that the two entry points are **not redundant** — the ribbon's Export Replay
button captures an arbitrary view and cannot do the post-run provenance capture. **With the
two-assembly decision this is automatic**, which is exactly why it needs recording: nothing would
stop a later session from "tidying" Replay into its own assembly and re-creating the cycle. §9.3: if
you ever do want it, `ExportReplay` must move out of `SLDRequestHandler` behind an interface the pane
calls — a real refactor, not a file move.

---

## 12. What this record obliges each later phase to do

| Phase | Obligation |
|---|---|
| **pre-Phase 7 (pairs with this session)** | Fix **FL-0011, FL-0012, FL-0013** before the gate machinery is ported (D4b) |
| **Phase 5a** | Pin `<RootNamespace>` + add five `<LogicalName>`s; verify sha-neutrality A/B at a fixed path (D3) |
| **Phase 5b** | `IFeatureModule` inversion; `Theme` + `IconFactory` → public; **`FromEmbeddedImage` gains an `Assembly owner` parameter** (D1); T4b → per-assembly (D2b). **NEW (session 5): decide and record what the Lab probe does when Lab is PRESENT AND THROWS** — the existing catches do not cover it (D2c) |
| **Phase 5c** | T5, source-anchored (D2a). Re-read `install_replay2023.ps1:210-215` against C1 |
| **Phase 6** | **Re-measure** the CLAUDE.md anchor lines — `:188`/`:192`, not `:177`/`:181` (D5). Write `drift_surfaces_V1_0_0.md` with owning repo + change-set rule (D4b) |
| **Phase 7** | Re-home T8/T9 and D8a's blessed-DLL check to the toolkit (D5, D8a). Coverage gate on surfaces 1-3 in the drop manifest (D4a) |
| **after Phase 7** | The product-definition session (D6) |
| **Phase 9 (trip)** | ✅ **DONE 2026-08-05 — AND WITH IT THE SEPARATION IS COMPLETE.** 14 buttons + no exception with Lab absent (D2c); **a corrupted `DEDARMS.Lab.dll` must NOT look identical to an absent one** (D2c, session 5) — 🚩 **ANSWERED: corruption raised a VISIBLE ERROR**; every Lab button fires with the right icon (D1). All confirmed in Revit 2025, plus a full generation run and a package that replayed into 2023. `runtime_unverified` is now **false on all three** shipping assemblies (`be6ae51a` · `2e86b97d` · `1a3b7ead`), the 2023 half having cleared 2026-08-03. ⚠️ **Verification binds to a SHA — FU-0008's rebuild re-raises both 2025 flags.** ⚠️ **Only the CORRUPTION half of D2c is answered; an ABSENT satellite is still silent by design.** Toolkit `07_handoff/HO-0008` |
| **any phase** | The name-baseline diff runs from the runner, mode-aware, guarded (D7) |

---

## 13. The one thing this record cannot do

**Every decision here is a phone decision.** HO-0008 §4 states it and it is repeated here because
this record's §12 reads like a completion checklist and is not one:

> A green 13/13 must never be read as "the restructure worked." It means the sources still compile,
> the tests still all run and still number 112, and the resources are still embedded *and reachable
> by name*. It says nothing about the ribbon, the panes, family placement, or whether Revit loads
> the DLL.

**D1's inversion, D1's owning-assembly parameter and D2c's silent absence are all provable only on
the Revit box.** They belong on the Phase 9 checklist and they are the reason Phase 9 is not optional.

---

## 14. Session-5 verification result (2026-07-30, fresh session)

Executed `Download/DEDARMS_SESSION4_VERIFICATION_PLAN_2026-07-30.md`. **Tier A was re-derived cold —
every command run and every answer written down before this file was opened.**

**Exit state re-measured:** suite **13/13** (twice, FL-0006), build-gate **9/9**, **112** tests,
sync **21/21** full · **19/19** quick, shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead` unmoved.

> **Superseded 2026-07-30 by the session that fixed FL-0011/0012/0013 and landed D7 + D8a.** Those
> numbers were correct when §14 was written. The suite is now **14/14** (gate 14 = D7's check-name
> baseline) and sync is **22/22 full · 20/20 quick** (D8a added one check). **B5 is therefore no
> longer a prediction — it is measured**, and it landed exactly as D7 predicted: 21→22 and 19→20.
> See HO-0011.

**24 Tier A claims: 19 verified, 5 wrong** — all five citation defects, all now corrected above:
`IconFactory.cs:229`→`:230`, its `return null` `:230`→`:231`, `CatRainOverlay.cs:141`→`:140`,
`VideoAsset.cs:23`→`:22`, `dll_embed_V1_0_0.mjs:80`→ the quote lives at `:33-35`. **No count, no
name, no gate result and no decision was wrong.**

**Two substantive findings beyond line numbers**, both corrected in place: D1's four-type table
described a measurement that had not been made (A6, above), and **D2c's distinguishability argument
cited the wrong subsystem entirely** — the largest defect this verification found, and the only one
that leaves a new obligation on Phase 5b.

**The three "CORRECTED 2026-07-30, same session" blocks were themselves verified**, since they had
never been checked by anyone but their author:

| Block | Re-derived cold | Verdict |
|---|---|---|
| D1 — gate builds Release only | `build_gate.sh:294` is the **sole** `dotnet build` in the script; `-c Release` hardcoded in `build_project()` (`:291`); **FOUR** call sites (`:347` T0.1, `:353` T0.2, `:377` T0.5, `:396` T0.3), none override configuration — the only trailing arg any of them passes is `-p:EnableWindowsTargeting=true` | **CONFIRMED** — re-measured 2026-07-30 by the Phase 5 verification (session 7). ⚠️ This row previously read `:258`/`:255`/`:298`,`:304`,`:319` and said **three** call sites; T0.5 made it four in Phase 5b. See the line-number warning above |
| D2b — no artifact for T4b's Lab half | same line, **plus** §6.6 confirmed to default `IncludeLabFeatures` OFF for Release | **CONFIRMED** — the obligation is real |
| D4a — per-FIELD, not per-key | `FedEdgeExtender.cs:161-167` is a per-field union (`mTop ?? tableInset.TopInsetPx`); comment at `:158-160` | **CONFIRMED** |

**D2a's B1 measurement reproduces exactly** against both blessed assemblies: `DEDARMS.App` 0 as
UTF-8 and 0 as UTF-16LE, `DEDARMS` ×19, `App` ×42; Replay2023 0/0, ×7, ×12. **D2a's stated reason
holds.**

### What remains a PREDICTION, carried into Phase 5

Unchanged by this session — none of these were provable here:

1. **B2 — `<LogicalName>` is sha-neutral** (D3). Still predicted. A/B at a fixed path only.
2. **B3 — a child csproj property beats `Directory.Build.props`** (D3's reason Replay2023 is safe).
   Asserted from MSBuild import semantics; still never executed.
3. **B4 — the post-5b resource split is 2 / 3** (D2b). Unverifiable until 5b exists; **5b must
   assert it, not assume it.**
4. **B5 — the baseline goes 21→22 and quick 19→20** (D7/D8a). Verifiable only after D8a lands.
5. **Everything inside Revit** — D1's inversion, D1's owning-assembly parameter, D2c's silence
   *and its new distinguishability obligation*. Phase 9.

### Corrections owed to documents this record does not own

- **Plan §6.4(2)** — *"FamilyResolver.cs:382 is the ONLY one that actually throws"* is stale.
  `CatRainOverlay.cs:142` also `?? throw`s. Root `CLAUDE.md:248-249` already carries the fix under
  FL-0014; the plan never received it. (Also: the throw is at `:384`; `:382` is the `const`.)
- **HO-0008 §9 row 1** still states the ship-vs-test direction backwards. The record flags this;
  the handoff itself is `consumed` and was not edited.
