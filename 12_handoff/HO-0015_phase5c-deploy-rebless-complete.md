# HO-0015 — Phase 5c done: PHASE 5 IS COMPLETE. Re-blessed, deploy converged, T5 shipped. Phase 6 is next — but read §8 first.

| Field | Value |
|-------|-------|
| **ID** | HO-0015 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` 2026-07-30 — superseded by **[HO-0016](HO-0016_phase5-verified-three-false-greens-closed-alc-bug-open.md)**, which verified this phase COLD and is now the resume point. **This record STANDS**: every Phase 5 claim in it was re-derived and held, and its shipping shas are unmoved. Three corrections against it — (1) its `13_addin/CLAUDE.md` anchors moved again, now **`:272`/`:273`/`:277`** in a **318**-line file; (2) **three false greens it shipped are now FL-0015 / FL-0016 / FL-0017**, all fixed and mutant-proved; (3) **FL-0018** (`App.DiscoverButtons` crosses AssemblyLoadContexts) is open and is now **item 0 on its §8 trip list**, which otherwise remains required reading |
| **Tree state** | `clean` — **14/14** (twice, identical by gate name) · `--no-build` **13/13** · `--quick` **6/6** · build-gate **14/14 of 14** (was 12 — T5 + T5b) · sync **24/24 full · 22/22 quick** (was 22/20) · **112** tests |
| **Shipping shas** | ⚠️ **`DEDARMS d521ad30` (was `9f16a1e7`) · `DEDARMS.Lab 43805105` (NEW) — NEITHER HAS EVER RUN IN REVIT.** `Replay2023 1a3b7ead` **deliberately unmoved** |
| **Blocked on** | nothing on the phone — but see §8: the Revit trip is now the critical path |
| **Next action** | **Phase 6** (split the 73 KB add-in `CLAUDE.md`) — *or* take the trip first. §8 argues for the trip |

---

## 0. The one-line answer

**Phase 5 — the restructure, the riskiest phase and "the first point of no easy return" — is done.**
The add-in is two assemblies organised into feature folders, the deploy carries both DLLs and is
installed by a verified script instead of an xcopy that never copied the DLL, and the `.addin`
manifests are now gated against the source that produces them.

**The shipping build was re-blessed and is honestly marked as never having run in Revit** — and
that marking is itself now gated, so it cannot be cleared in one place only.

---

## 1. FL-0013 item 4 — set out to do it, measured, and DID NOT. That is the finding.

The item said: *"strip the two stray NUL bytes from `RibbonBuilder.cs` and `ReplayPreflight.cs`.
Cheap, but it touches shipping `.cs`, so it is Phase 5 work."* It had read that way for two
revisions.

⚠️ **Not one of the five NUL bytes in this repo is stray. Every one is a deliberate
composite-key delimiter**, chosen precisely because a NUL cannot occur in the strings being joined:

| Site | Code | Keys |
|---|---|---|
| `RibbonBuilder.cs:79` | `panelName + "\0" + group` | the shared-pulldown cache |
| `ReplayPreflight.cs:61` | `family + "\0" + type` | `SymbolKey`, the 2023 replayer's symbol resolution |
| `strip_compare.mjs:106` | `ka.join('\0') !== kb.join('\0')` | gate **G8**'s key-ORDER comparison |

`ReplayPreflight.cs:30` even **documents** it: *"Key: `family\0type`."* One of the two "stray" bytes
was described in the file carrying it.

**Stripping them would have introduced collision bugs into a blessed assembly** — panel `"AB"` +
group `""` collides with panel `"A"` + group `"B"`, and the same reaches `SymbolKey` on the 2023
side. Closed **WILL-NOT-FIX** with the evidence in FL-0013, and the `grep -a` ground rule is now
recorded as **permanent** rather than as a workaround for an accident.

## 2. The re-bless, and the scope decision behind it

**Mayo's call: re-bless the 2025 side only.** Phase 5 never touched `DEDARMS.Replay2023`'s source
— drift (a) was deferred in 5a for exactly this reason — so **`1a3b7ead` still corresponds
byte-for-byte to its source, and HO-0005's owed Revit 2023 trip keeps the evidence it was collected
for.** Drift (a) is therefore deferred a third time, deliberately, to after that trip.

| Artifact | Before | After |
|---|---|---|
| `DEDARMS.dll` | `9f16a1e7` | **`d521ad30`** (7,803,392 B — was 16,824,832) |
| `DEDARMS.Lab.dll` | — | **`43805105`** (9,030,144 B, new slot `artifacts.addin_lab_dll`) |
| `DEDARMS.Replay2023.dll` | `1a3b7ead` | **`1a3b7ead` — untouched, on purpose** |

Built **in place** (how `9f16a1e7` was made), and **reproducibility verified before blessing**: two
clean rebuilds at the same path agreed exactly. `embeds_map_sha256` re-extracted from the new DLL is
still `df7cfc4f` — the map bytes never moved, only the file's folder and its `<LogicalName>`, which
is the clearest possible confirmation that 5a's LogicalName work did what it claimed.

### ⚠️ The gate caught me misusing its own honesty flag

I first set `stale_pending_rebuild: true` as a general "this is unverified" marker. sync_gate went
red: *"in lockstep, but `stale_pending_rebuild` is still true — clear it."* **That flag has a narrow
meaning — "the embed is knowingly out of step with the map" — and it WAIVES the lockstep assertion
to a warning.** Using it for a different meaning would have silently disabled a real check.
Reverted to `false`, and the note beside it now says what it is and is not for.

The honesty flag is a separate new field, **`runtime_unverified`**, and it is not decorative: a new
sync_gate check asserts it **agrees with the add-in `CLAUDE.md` prose**, in both directions. The
flag cannot be set without the doc saying so, or cleared without clearing the doc in the same
change-set. It deliberately does **not** fail merely because the build is unverified — that would
make 14/14 unreachable until a Revit trip and turn the whole suite into a dead signal.

## 3. Deploy converged on one philosophy (§6.7(d))

**The `DeployAddin` xcopy target is gone.** It ran on every build and copied the **manifest but not
the DLL**, with `<Assembly>` pointing back into `bin\Release` — so it worked on the build machine
and produced a Revit that knew the add-in's name and could not load it anywhere else. It also raised
MSB3073 on every Linux build.

Replaced by **`deploy/install_dedarms.ps1`**, modelled on the 2023 installer: sha256 verification of
both DLLs, mark-of-the-web clearing, nested-then-flat source resolution, `-Diagnose`, and `-SkipLab`.
⚠️ It **hard-stops** if the satellite is missing rather than quietly installing 14 buttons — silently
degrading is precisely the invisible outcome D2c creates.

**Side effect worth noting: `DEDARMS` now builds 0 errors / 0 WARNINGS.** The gate's own header said
*"0 warnings can never pass on this phone"* because of that xcopy. That reason has expired and the
comment now says so — **but the policy is unchanged**, because it never rested on that one warning.

**E12.12 discharged by inspection:** `install_replay2023.ps1`'s nested-then-flat resolution
(now `:213-215`) is compatible with C1 — the nested form is its primary path.

## 4. T5 and T5b — D2a's check, and E5's consequence which got worse

**T5 is SOURCE-anchored**, per D2a, and the reason is measured rather than argued: a CLI `TypeDef`
stores namespace and name as **two separate `#Strings` entries**, so `DEDARMS.App` never appears as
a byte sequence in the assembly at all (0 hits as UTF-8 *and* UTF-16LE, against both blessed DLLs).
T4b's heap-search trick cannot be borrowed. It composes the name from `App.cs` and compares to all
**4** manifests, handles file-scoped *and* block-scoped namespaces, checks every `<Assembly>` against
the built `<AssemblyName>`, and verifies that non-App `<FullClassName>`s still name real classes.

**T5b is E5's "unstated consequence" — and D2c made it worse, not better.** E5 warned that a missing
satellite would be a `TypeLoadException` at button-click that no gate could see. D2c fixed the
crash, so a missing `DEDARMS.Lab.dll` no longer throws at all: **the ribbon renders 14 buttons and
says nothing.** The failure mode went from *loud on the Revit box* to *invisible on the Revit box*,
which makes T5b the only thing standing between "forgot one file" and "the cats quietly vanished".

## 5. What I deliberately did NOT do, and why

**The plan's item 12 — restructure to `builds/r2025/` + `builds/r2023/` — was skipped.** It appears
once in the Phase 5c list and once as a *conditional* warning (*"if you restructure … these four
paths change shape too"*). **Nothing decides it**: the decision record's **C1** settles only that
`deploy/` stays nested, which is already the shape. Doing it would re-break `DEDARMS.Tests.csproj:91`'s
climb depth — structural, cited by number in ~10 places, and specifically protected through 5a — and
**Phase 7 re-homes this whole tree anyway**, which is the right moment to choose the toolkit's
layout. Deferred to Phase 7 with this reasoning, not forgotten.

**`nuget.config`** stays skipped (5a's reasoning: no stated content, and inventing one risks the
offline restore every gate depends on).

## 6. Numbers

**14/14 twice, identical by gate name** · `--no-build` 13/13 · `--quick` 6/6 · build-gate **14/14** ·
sync **24/24 full · 22/22 quick** · **112 tests** · `.cs` **100**.

**Gate 14 was re-blessed DELIBERATELY**, per HO-0011 trap 3: the diff was inspected first and showed
**only `>` lines** — the two checks I added — and no `<` line, i.e. nothing silently stopped running.
22→24 full, 20→22 quick.

**New/changed:** `deploy/install_dedarms.ps1` (new) · `DEDARMS.csproj` (xcopy target removed) ·
`build_gate.sh` (T5, T5b, `EXPECTED_CHECKS` 12→14, stale-warning note) · `sync_gate.mjs` (D8a
per-artifact, installer-pin check, runtime_unverified consistency check) · the manifest (re-bless +
`addin_lab_dll` + honesty flags) · `FL-0013` · runbook · both `CLAUDE.md`s · this file.

⚠️ **`build_gate.sh` line numbers moved AGAIN** (fourth consecutive session): `build_project()`
**`:291`**, sole `dotnet build -c Release` **`:294`**, call sites **`:347`/`:353`/`:377`/`:396`**.
⚠️ **The add-in `CLAUDE.md` sha anchors are now `:272` (Core), `:273` (Lab, NEW) and `:277`
(Replay2023).** Phase 6 splits that file and must re-measure — and note sync_gate finds them by
**prose**, which is why they survived four moves.

## 7. Phase 6 (docs) — unchanged obligations

Split per §7.3's line map (watch the L26 fake-heading trap); **repoint sync_gate checks 17/18** to
wherever the two sha anchors land — there are now **three** anchors, not two; write
`00_Docs/drift_surfaces_V1_0_0.md`; do the `13_addin/CLAUDE.md` path repointing that 5a left behind
a translation banner.

## 8. ⚠️ READ THIS BEFORE PICKING THE NEXT PHASE — the trip is now the critical path

**Every phone-side thing Phase 5 could prove is proven, and the pile of things only Revit can prove
has grown to seven.** Nothing further on the phone reduces it, and Phases 6 and 7 add to it.

| # | Must be verified in Revit 2025 | From |
|---|---|---|
| 1 | the tab loads with **16 buttons**, no exception | 5b/D2c |
| 2 | a **corrupted** `DEDARMS.Lab.dll` does NOT look identical to an absent one | 5b/D2c — **never been true before** |
| 3 | both Lab buttons **fire**, resolved from the satellite's own path | 5b, `RibbonBuilder` |
| 4 | both Lab buttons show **their own icons**, not Revit's default | 5b, `IconFactory` owner |
| 5 | a full **SLD generation run**, including a partial-failure skip | 5a, `SubtxRunner`'s `object` round-trip |
| 6 | both **dockable panes** open with the layout intact | §7.2 |
| 7 | `install_dedarms.ps1` actually installs on a real box | 5c |

Plus the separate, still-owed 2023 stream: **`1a3b7ead` has never run in Revit** either, and it is
the one artifact this phase deliberately preserved so that trip stays meaningful.

**The honest reading:** `d521ad30` is a large, unverified delta on the last build that did work
(folders moved, three Core signatures changed on the placement path, the ribbon registry inverted,
the icon loader re-pointed, an assembly split out). **A green 14/14 means it compiles and 112 tests
pass. It does not mean the add-in works.** Phase 6 is docs and Phase 7 is a repo move — neither
reduces this risk, and both make the eventual debugging session larger by putting more change
between the last known-good runtime and the next one.

**Recommendation: take the Revit trip next, not Phase 6.** One trip can discharge all seven items
plus the 2023 replay. `_snapshot_pre_split_2026-07-30/` remains the only undo and now predates all
of Phase 5.
