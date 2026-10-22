# HO-0009 — Phase 3 done: the eight decisions are recorded. Five plan corrections, three self-corrections. Still nothing has moved.

| Field | Value |
|-------|-------|
| **ID** | HO-0009 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` — the §5 verification **was run** (2026-07-30, session 5). Superseded by **HO-0010** |
| **Tree state** | `clean` — 13/13, sync 21/21 · 19/19, shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead`, no `bin`/`obj` leftovers |
| **Blocked on** | nothing |
| **Next action** | *(was: run the session-4 verification plan in a fresh session — **done**, see HO-0010.)* **Phase 4** |

---

## 0. The one-line answer

**Phase 3 is done and its output is a file, not a conversation:
[`00_Docs/dedarms_separation_decisions_V1_0_0.md`](../00_Docs/dedarms_separation_decisions_V1_0_0.md).**
Eight decisions, each with its evidence re-derived by execution. **That file outranks the separation
plan where they disagree** — it carries five corrections to the plan and three corrections to itself.
**No code changed.** The suite was re-run green after the record landed.

## 1. Where the decisions live, and why not here

The record is the authority; this handoff is the pointer. Reading order for a Phase 4/5 session:

1. **`00_Docs/dedarms_separation_decisions_V1_0_0.md`** — the decisions, §12 for per-phase obligations
2. **HO-0008 §4** — the WILL-catch / WON'T-catch list, still the most useful page in this stream
3. the plan's §10, then only the phase you are executing

**The record's §12 is a per-phase obligation table and its §13 says out loud that §12 is not a
completion checklist.** Do not read §12 alone.

## 2. The eight, in one line each

| # | Decision |
|---|---|
| D1 | **`IFeatureModule` inversion**, not `#if LAB_FEATURES` — plus `FromEmbeddedImage` gains an `Assembly owner` parameter |
| D2 | **T5 is source-anchored**; **T4b goes per-assembly** with a must-NOT-contain pass; **absent Lab is silent** |
| D3 | Pin `<RootNamespace>` **and** declare explicit `<LogicalName>` on all five resources |
| D4 | **Coverage** gate (not equality) on drift surfaces 1-3, document 4-6; **FL-0011/0012/0013 get fixed, not owned** |
| D5 | **T8/T9 are re-homings** of three checks that pass today, not new gates |
| D6 | The product-definition session happens **after Phase 7** |
| D7 | **Commit the sync-gate check-NAME baseline; the RUNNER diffs it**, never sync_gate itself |
| D8 | **§5 Q8 = yes** (blessed-DLL name check); the other five ratified as recorded |

Plan §10 Phase 3's items **3** (deploy/ stays nested) and **5** (Replay stays a folder) fell out of
HO-0008 §9's table. Both are confirm-only and are carried in the record's §11 as **C1** and **C2**.

## 3. Five corrections to the plan — all measured

1. **§6.0 is wrong that E8's IconFactory fix is unneeded.** `IconFactory.FromEmbeddedImage` resolves
   via `Assembly.GetExecutingAssembly()` at **`UI/IconFactory.cs:230`** — *IconFactory's* assembly
   (Core), **not the caller's**. Lab's ButtonDefs calling it still query Core, which after 5b no
   longer embeds the cats → null → **no icon, per button, silently, Revit-only**. The fix survives,
   reduced to one parameter. (`CatRainOverlay.cs:140` and `VideoAsset.cs:22` are fine for a different
   reason: those *types* move to Lab, so their executing assembly moves with them.)
   > **Line numbers corrected 2026-07-30 by session 5** — read `:229`, `:141`, `:23` until then;
   > all three were one line high. **The finding itself is confirmed.** See HO-0010.
2. **§9.1's drift gate would punish correct work.** Surfaces 1-3 are **`?? fallback` pairs, not
   mirrors** — `DevicePlacer.cs:742`, `EquipmentLabelPlacer.cs:111`, and `:108` says so verbatim:
   *"(so a map without the field is unchanged)"*. An equality gate reds on every legitimate map tune.
3. **The add-in CLAUDE.md sha anchors are at `:188` and `:192`**, not the `:177`/`:181` that **E7 and
   E12.14 both cite**. Phase 6 step 2 depends on these — **re-measure, do not trust this line either.**
4. **T4b's UTF-8 technique does not extend to `<FullClassName>`** — see §4 below.
5. **§15.4 calls a later folder reorganisation "a `git mv`".** There is **no git** (0.3(a)). Plain
   `mv`, and the snapshot is the only undo.

## 4. What was measured that never had been

- **`"DEDARMS.App"` does not appear in either blessed assembly, in either encoding.** Probed
  directly: `DEDARMS.dll` (`9f16a1e7`) → **utf8 0, utf16le 0**, while `DEDARMS` alone appears **19×**
  and `App` alone **42×**. `DEDARMS.Replay2023.dll` (`1a3b7ead`) → **0 / 0**, with **7×** and **12×**.
  A `TypeDef` stores namespace and name as **two separate `#Strings` entries**, so there is no byte
  sequence to find — and it is absent from the `#US` heap too, so there is no compiled literal
  either. **This is why T5 is source-anchored**, and it is now a measurement rather than an assertion.
- **Lab needs only 2 Core types made public, not 17**: `Theme` (`UI/Theme.cs:16`) and `IconFactory`
  (`UI/IconFactory.cs:15`). `OverlayCommandBase` (`:14`) and `ButtonDef` (`RibbonRegistry.cs:11`) are
  **already public**. HO-0008 §4's "all 17 types" was the five-assembly figure.
- **No `<LogicalName>` exists anywhere** — all five resource names derive from `RootNamespace` +
  folder path. **Two levers, and Phase 5 pulls both.**
- **`Deterministic=true` is on Replay2023 only** (`:33`); **`<PathMap>` is set nowhere.**
- **`DEDARMS.Replay2023.csproj:22` declares its own RootNamespace**, so a root
  `Directory.Build.props` pin cannot damage it. ⚠️ **The converse is the trap:** a new
  `DEDARMS.Lab.csproj` writing `<RootNamespace>DEDARMS.Lab</RootNamespace>` — which matches the
  assembly name and looks correct — **silently renames all three cat resources.** D2b's per-assembly
  T4b is what catches that.
- **`build_gate.sh:166` builds `-c Release` and only Release.** See §6.

## 5. Resume here — VERIFY BEFORE PHASE 4

**The plan:
`/storage/emulated/0/Download/DEDARMS_SESSION4_VERIFICATION_PLAN_2026-07-30.md`**

Tier 0 (three defects already found, listed there) → Tier A (24 measured claims, re-derived **cold,
before reading the record**) → Tier B (predictions) → Tier C (claims reasoned, never run) → Tier D
(staleness) → Tier E (adversarial).

**Two of the three Tier 0 defects came from Tier C — claims that sounded right and were written down
anyway. Give Tier C and Tier E real time, and prefer a fresh session:** this handoff and that plan
were both written by the session they describe, so their blind spots are that session's blind spots.

**Two soft spots declared up front:**

- **A6 is the weakest measurement in the record.** "Only 2 types go public" came from grepping a
  **hand-written list of 15 candidate type names** — it finds only what the author thought to look
  for, the same class as FL-0013's `NRES==0` guard. §2.1 of the plan redoes it inverted, and adds the
  direction session 4 never checked at all: **does Core reference a Lab type anywhere outside
  `RibbonRegistry.cs:93,100`?**
- **D2b has no instrument yet** — see §6.

**Predicted snapshot diff shape**, falsifiable in one command
(`diff -rq "$SNAP" "$REPO" | awk '{print $1}' | sort | uniq -c`): **22 `differ` · 14 `Only in REPO`
· 1 `Only in SNAP`.** The `differ` count is unchanged because session 4 modified no pre-existing
file; `Only in REPO` rose by **2** — the decision record and this handoff. **Three of the 22 remain
generated timestamps** that move on every gate run. Any other shape means §7 is wrong.

## 6. ⚠️ The one thing Phase 5 must resolve that Phase 3 could not

**D2b is a decision without an instrument.** The record first claimed *"gate 13 builds the
Lab-included configuration, so both assemblies exist when T4b runs."* **False.**
`build_gate.sh:166` builds **`-c Release` only**, and §6.6 defaults Lab's `IncludeLabFeatures` **OFF
for Release** — so after 5b the gate would **never build `DEDARMS.Lab.dll`**, and per-assembly T4b's
Lab half would have no artifact to read.

Phase 5 must pick one and write it down:

| | |
|---|---|
| **(a) gate 13 builds BOTH configurations** — recommended | ~2× the ~22 s; asserts **both** halves — Release excludes the cats, Lab-included embeds them |
| (b) build with `IncludeLabFeatures=true` | one build, but **nothing gates the Release exclusion** — which is the entire 9 MB benefit |
| (c) T4b's Lab half skips when the artifact is absent | **Reject on sight — FL-0001's soft-skip class exactly** |

## 7. Files changed this session

**Created (3):** `00_Docs/dedarms_separation_decisions_V1_0_0.md` · this file ·
`Download/DEDARMS_SESSION4_VERIFICATION_PLAN_2026-07-30.md` (outside the repo).

**Modified (1):** `12_handoff/handoff_register_V1_0_0.md` (Next ID → `HO-0010`, one row, and the
two-open-streams note).

**Moved: none. Deleted: none. No gate, no contract, no source file was touched. No sha moved.**

**Final state, re-run after the record landed:** `run_all_gates.sh` **13/13** (green on run #1 — that
is luck, not a rule; FL-0006 still applies) · sync-gate **21/21 full · 19/19 quick** · shas
`9f16a1e7` / `9f16a1e7` / `1a3b7ead` unmoved.

## 8. Traps (HO-0008 §6 still applies in full; these are additions)

1. **The decision record corrects itself three times, in place.** Each correction is marked
   `CORRECTED 2026-07-30, same session`. **Read those blocks — two of them invert a rationale that
   HO-0008 §9 still states the old way.**
2. **HO-0008 §9's phrasing on `#if` is wrong** — "the build you SHIP is not the build you TESTED" has
   the direction backwards, because the gate builds Release. **The decision was still right**; the
   reason is that under `#if` the five Lab files are compiled by **no gate at any time**.
3. **HO-0008 §9 row 5 attaches a `build_gate` correction to a `sync_gate` item.** Its *"the count is
   9, not 8"* is about **build_gate's nine checks**; E7's *"3 of 9"* is about the **nine add-in
   sync_gate checks**. **Two different nines** — do not let the annotation propagate as if it
   modified E7's arithmetic.
4. **Every `file:line` in the record is a future stale citation.** It corrects two of E7's and then
   hands forty-odd of its own to Phases 5, 6 and 7. **Re-run the plan's Tier A immediately before
   Phase 5 starts**, not only during verification.
5. **`_snapshot_pre_split_2026-07-30/` is still the only undo. Do not delete it.**

## 9. The other stream is untouched

**HO-0005, SLD Replay, remains open and blocked on a Revit trip.** `1a3b7ead` has still never run
inside Revit, and the 10 unexplained replay failures are still unexplained. **Nothing on the phone
unblocks it.** Phase 9 of the separation folds that trip in (plan §10 Phase 9 item 4), so if a trip
happens sooner it is worth carrying both. Carry rules are unchanged: **a SYNC CLIENT, never a browser
download** — mark-of-the-web gives `HRESULT 0x80131515` on net48.
