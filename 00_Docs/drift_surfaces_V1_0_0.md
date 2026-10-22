# Drift surfaces — the duplications no gate proves equal

**V1.0.0 · written 2026-07-31 · separation Phase 6, item 4 · decisions D4a + D4b**

Cross-language / cross-file duplications that **cannot** share a source and have **no gate** proving
the copies agree. `sync_gate.mjs` covers the byte-identical artifacts (family-map ×2 + DLL embed,
engine↔viewer↔golden, living-doc anchors); everything below is outside it.

**This is a map, not a TODO.** It exists so an editor changing one side knows to change the other,
and so Phase 7 knows which relation to gate. It was the `## Known ungated drift surfaces` section of
the add-in's hub until Phase 6 moved it here — that hub was `13_addin/CLAUDE.md` then and is
`DEDARMS Revit Toolkit/CLAUDE.md` now — **there is deliberately only one copy, because a second copy
of the drift-surface list would itself be a drift surface.**

> 🚩 **THE C# SIDE OF EVERY SURFACE BELOW NOW LIVES IN ANOTHER REPO** (separation Phase 7b,
> 2026-07-31). All `.cs` paths were rewritten on **2026-07-31 by Phase 8** from
> `13_addin/Revit Addins/DEDARMS/…` to **`DEDARMS Revit Toolkit/src/DEDARMS/…`**.
>
> ⚠️ **AND NOTHING CAN CHECK THEM FROM HERE.** No gate in this repo reads a file in the toolkit and
> none there reads one here — the contract drop is the only seam, deliberately, because a cross-repo
> read soft-skips on any machine missing the sibling (FL-0009). **So this document is the single most
> exposed set of citations in either repo: cross-repo, line-numbered, and ungated by construction.**
> The toolkit carries only a value-free stub pointing here, so **if this rots, nothing else holds the
> content.**

Every `file:line` below was **re-derived by command on 2026-07-31, twice** — once by Phase 7a and
again by Phase 8 after the move, against the files at their new home. Line numbers in this repo have
gone stale silently for nine consecutive sessions; re-derive the SET before trusting any of them.

> ⚠️ **SECTIONS 7 AND 8 ARRIVED LATER — 2026-08-01, with FU-0008 — and their citations were derived
> THEN, not by either 2026-07-31 pass.** Section 7's engine line number moved inside that same
> change-set (`measureMarkupExtent` L16448 → L16604, because the replacement is longer than the
> heuristic it replaced): the ninth consecutive session in which a line number here went stale the
> moment someone edited a file. **Everything in the paragraph above is about sections 1–6.**

> ✅ **THE PHASE 8 RE-DERIVATION FOUND EVERY NUMBER STILL CORRECT — all thirteen of them.** That is
> not luck and it is worth knowing why: **7b moved 202 files without editing a single `.cs`**, so the
> paths rotted and the line numbers did not. **Do not generalise this into trust.** The next event
> that touches these files will be a *rebuild*, and that is exactly when they move.

---

## 0. What "owner" means here, and what to gate

Per **D4b**: there is one developer, so naming a person makes the record decorative. What has teeth
is **which repo owns the surface** and **what the change-set rule is** — both are checkable by a
later session. After Phase 7 there will be two repos (this one, and the DEDARMS toolkit), and the
"owning repo" column is what tells you where a fix lands.

Per **D4a**, and this **corrects plan §9.1**: surfaces 1–3 are **not mirrors**. They are
`?? fallback` pairs — **the map value WINS**, and the C# constant is the default for entries the map
does not carry:

```csharp
Sld/Services/DevicePlacer.cs:742    mapEntry?.DrawnCenterXCorrPx ?? AlignTables.DrawnXCorrPx(...)
Sld/Services/EquipmentLabelPlacer.cs:111
                                    _resolver.GetMapEntry(NodeType)?.FlippedTextRightGapPx
                                                                    ?? A8FlippedTextRightGapPx
```

> **An equality gate would go red every time the map is legitimately tuned** — a gate that punishes
> correct work is a gate that gets disabled within a week.

**The relation that IS assertable is COVERAGE, and it must be PER FIELD, not per key:**

> For every key the C# static fallback table holds, **and for every field that table supplies for
> that key**, the published map must carry the corresponding field. Then the fallback is unreachable
> and drift cannot bite.

Per-key is too coarse, measured at surface 2: `Sld/Services/FedEdgeExtender.cs:161-167` is a **union
with per-field fallback**, not an override —

```csharp
bool hasTable = VisibleEdgeInsetPx.TryGetValue(nodeType, out var tableInset);
if (!hasTable && mTop is null && mBot is null) return false;
var inset = (TopInsetPx: mTop ?? tableInset.TopInsetPx,
             BotInsetPx: mBot ?? tableInset.BotInsetPx);
```

— so a key present in the map carrying only `visible_edge_top_inset_px` **still reads
`tableInset.BotInsetPx` from C#**. Key-level coverage does not make the fallback unreachable.

**Surfaces 4, 5 and 6 get a documented cross-repo pointer only.** 4 and 5 straddle C#/JS and a third
language; 6 spans five sites in two languages with only `SLDPipeline.cs`'s runtime check as an
indirect guard.

---

## 1. Per-family placement corrections — `AlignTables.cs` ↔ family map

| | |
|---|---|
| **C# side** | `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/AlignTables.cs` **(other repo)** — `DrawnCenterXCorrPx` **:93**, `DrawnCenterYCorrPx` **:149** |
| **Map side** | `07_data/normalized/revit_SLD_family_map_V1_0_0.json` — `drawn_center_x_corr_px` / `drawn_center_y_corr_px` on **seven** entries — six carry the pair, L0-1 carries y only (this line said "six" while listing seven; corrected 2026-07-31, HO-0018). In file order: L2-7 `spare` **:68/:69** · L2-7 `space` **:85/:86** · L2-1 `spare` **:102/:103** · L2-1 **:119/:120** · L1-1 **:319/:320** · L2-2 **:518/:519** · L0-1 y-only **:533**. (D4a cites only `:68,69`; that is one entry of six, not the pair.) |
| **Third side** | the comments derive these from the engine's `DIM` constants (`04_renderer/sld_viewer_engine_V1_0_0.html`) |
| **Owning repo** | **toolkit** (C#) + **SLD repo** (map + engine) — a genuine straddle |
| **Change-set rule** | Map, xlsx and JSON ship **together in one change-set** (Mayo's ruling). Touching the C# fallback alone is almost always wrong — tune the map. |
| **Gate to build (Phase 7)** | per-field coverage, in the drop manifest |

**Measured coverage today (2026-07-31):**

| C# key | X corr | Y corr | Map carries it? |
|---|---|---|---|
| `("L0-1","")` | — | 48.0 | ✅ L0-1 |
| `("L1-1","")` | 30.0 | 18.055 | ✅ L1-1 |
| `("L2-1","")` | 4.07 | 3.0 | ✅ L2-1 (unvariant row) |
| `("L2-2","")` | 11.7 | 4.15 | ✅ L2-2 |
| `("L2-7","space")` | 0.0 | — | ✅ L2-7 `space` |
| **`("L2-7","")`** | **4.07** | **3.0** | 🚩 **NO — the map has no variant-less L2-7 entry at all** |

> 🚩 **The `("L2-7","")` rows are the one live coverage hole, and it is subtler than a missing field.**
> The map carries L2-7 **only** as `spare` and `space`. An L2-7 device whose `data_fields.kind` is
> neither resolves to no map entry — so the C# fallback IS reached — but it also resolves to no
> family, so it becomes a preflight skip and is never placed. **The fallback row is therefore live
> but currently unreachable-in-practice, for a reason that has nothing to do with the coverage rule.**
>
> ✅ **That chain was re-derived from source 2026-07-31** (it had been asserted, not checked):
> `FamilyResolver.cs:417-420` puts variant-BEARING entries only in `_variantMap`, so `_nodeTypeMap`
> has no `L2-7` key at all; `GetMapEntry` (`:185-192`) therefore returns null for a null or unmatched
> variant; and `DevicePlacer.cs:100-108` records the skip and **`return`s before** the correction is
> read at `:740-744`. The inference holds.
>
> ⚠️ **But the trigger stated below was too narrow, and the correction matters to the gate D4a asks
> for.** Two things the first draft of this section got wrong:
>
> 1. **The map is the live source today, not the C# table.** `DevicePlacer.cs:742/744` reads
>    `mapEntry?.DrawnCenterXCorrPx ?? AlignTables.DrawnXCorrPx(…)` — **the map wins, per field.** For
>    the two L2-7 entries that exist, the C# `("L2-7","")` rows are already dead. Read the table above
>    as "which side would answer if the map went quiet", not as "which side answers".
> 2. **The fallback goes live without any new family being added.** Because that `??` is per FIELD and
>    `AlignTables.Corr` falls back from an unmatched variant to the `(node,"")` row, the C# value
>    becomes the live source the moment **either existing** L2-7 entry drops **one** corr field — a
>    one-line map edit, no new family, no new variant, no code change. Drop `drawn_center_y_corr_px`
>    from the `space` entry (`:86`) and every placed Space device silently takes `("L2-7","") = 3.0`
>    from C#. **This is not hypothetical: the same per-field fallthrough fires today on `L0-1`'s X**
>    (map `x` is absent → `AlignTables` has no `("L0-1","")` X row → the `0.0` default), harmless only
>    because 0.0 is the no-op.
>
> So the gate D4a owes must be **per field, per (node, variant) key that the map actually carries** —
> not merely "is there a variant-less entry". If a variant-less L2-7 family is ever added it **must
> carry both corr fields in the same change-set**, but so must any change that touches the `spare` or
> `space` entries. A coverage gate written per-field would flag the `("L2-7","")` row today; that is
> correct, and the right response is to declare the exception, not to delete the C# row.

## 2. Fed-edge visible insets — `FedEdgeExtender.cs` ↔ family map

| | |
|---|---|
| **C# side** | `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/FedEdgeExtender.cs` **(other repo)** — `VisibleEdgeInsetPx` **:32** (`L2-2` = −1.5/8.3, `L2-1` = −0.5/0.0) |
| **Map side** | `visible_edge_top_inset_px` / `visible_edge_bot_inset_px` (**:121/:122** for L2-1, **:520/:521** for L2-2) |
| **Owning repo** | **toolkit** + **SLD repo** |
| **Change-set rule** | Same as surface 1 — and note this one is a **union**, not an override: the map can opt a new family in without a code change (`:158-160`). |
| **Coverage today** | ✅ **complete, per field** — both keys, both fields, present on both sides |

## 3. A-8 flipped-text gap — `EquipmentLabelPlacer.cs` ↔ family map

| | |
|---|---|
| **C# side** | `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/EquipmentLabelPlacer.cs` **(other repo)** — `A8FlippedTextRightGapPx = 5.3` **:103**, consumed at **:111** |
| **Map side** | `flipped_text_right_gap_px` **:225** (A-8) |
| **Owning repo** | **toolkit** + **SLD repo** |
| **Change-set rule** | Same as surface 1. ⚠️ The 5.3 is **screenshot-derived**; refine it by measuring origin→text-start in the family, never by iterating screenshots. |
| **Coverage today** | ✅ **complete** |

## 4. Symbol box table — `SymbolDims.cs` ↔ the engine's `BOX` / `ANCHOR_MODE`

| | |
|---|---|
| **C# side** | `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/SymbolDims.cs` **(other repo)** — `ByNodeType` **:33**, plus the anchor-mode classification |
| **Engine side** | `04_renderer/sld_viewer_engine_V1_0_0.html` — `BOX` / `ANCHOR_MODE` (and its generated `sld_engine.mjs`) |
| **Owning repo** | **toolkit** + **SLD repo** — straddles C# and JS, so no shared source is possible |
| **Change-set rule** | **Retune the C# table together with the engine BOX table until it is retired.** It survives only as the fallback for older JSONs and the runtime-`LayoutEngine` path; the geometry block now exports `w`/`h`/`anchor_mode` per device and `DevicePlacer` prefers those. |
| **Gate** | **documented pointer only** (D4a) |
| **Related** | **FL-0002** (open, S3) — the engine `BOX` carries *unmeasured* sizes for L1-5 and L3-2 that the family measurements disprove. Its `Component` field still cites the pre-Phase-4 path `05_revit/DEADARMS ADDIN/…/Services/SymbolDims.cs`; the file is now `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/SymbolDims.cs` (other repo), and **FU-0005 (toolkit) owns that stale comment — it must ride along with a rebuild, never alone.** |

## 5. `compare_placement.py` re-implements placeability in a third language

| | |
|---|---|
| **Python side** | `05_revit/compare_placement.py` — `PLACEABLE_ANNOTATIONS` **:42**, `_gs_placeable` **:154**, `_tag_expected` **:186**, `_label_placeable` **:219**, plus the edge-type sets |
| **Other sides** | the C# placers (`DeviceTagPlacer`'s per-node-type "would the engine draw a tag" logic) and the engine renderers |
| **Owning repo** | **SLD repo** today; **moves to the toolkit in Phase 7** (plan §5 — the two Python oracles travel with the add-in) |
| **Change-set rule** | **If the add-in's placement decisions change, this audit tool must be updated by hand.** Nothing will tell you: a stale oracle reports MISSING/ORPHAN rows that read like placement bugs. |
| **Gate** | documented pointer only. ⚠️ `compare_placement.py` has **no `--selftest`**, and **no gate runs any of the three Python oracles** (HO-0016 §5). |

## 6. `px_per_inch = 96` and the content-area / gutter literals

| | |
|---|---|
| **Sites** | the engine (`04_renderer/sld_viewer_engine_V1_0_0.html`), the title-block HTML/template, `Sld/Services/CoordinateTransform.cs`, `Core/Services/DraftingViewCreator.cs`, and topology JSON `metadata` |
| **Owning repo** | **both** — five sites, two repos after Phase 7, three languages (JSON vs JS vs C#) |
| **Change-set rule** | They cannot share a source. Change one and you must sweep all five. |
| **Guard** | **indirect only** — `SLDPipeline.cs` runtime-errors if `geometry.effective_px_per_inch` ≠ the view scale. That catches a mismatch at run time on the Revit box, not at gate time on the phone. |

---

## 7. `measureMarkupExtent` — the engine ↔ the title-block template (**a fixed copy and a dormant one**)

**ADDED 2026-08-01 by FU-0008.** This is the surface this document exists for, arriving in its
sharpest form: **the same defect in two files, fixed in one, on purpose.**

| | |
|---|---|
| **Sites** | `04_renderer/sld_viewer_engine_V1_0_0.html` → `function measureMarkupExtent(markup, opts) {` (**FIXED** at rev 1.0.15; **note the `opts` param — that is the anchor**) · `01_inputs/templates/titleblock_template_30x42_V1_0_0.html:456` → `function measureMarkupExtent(markup) {` (**STILL CARRIES THE OLD HEURISTIC**; no `opts`) · `09_tests/Hospital Example (Golden Case)/hospital_titleblock_30x42_V1_0_0.html:458` (byte-copy of the template's) |
| **Owning repo** | **SLD repo only** — no C# side |
| **Relation** | Not a mirror and never was: the template's copy has a different signature (`measureMarkupExtent(markup)`, no `opts`, no G[] anchor step) because the demo has no layout globals. What was byte-identical was the **defect** — the number-scrape with the same `< 10000` clamp. |
| **Change-set rule** | **They are now DELIBERATELY DIVERGENT. Do not "sync" them.** |
| **Guard** | **none, and none is cheaply possible** — G7 renders the template and would catch a change in its OUTPUT, but the defect produces no output difference today. |

> 🚩 **THE VIEWER CITATION WAS A LINE NUMBER (`:16604`) AND IT WENT STALE IN ONE DAY.** The
> 2026-08-02 staleness audit re-derived all 12 of this file's citations and found **all 12 held**.
> **Engine rev 1.0.16 shipped 2026-08-03** (the cross-sheet bus-tap incoming renderer, FL-0026) and
> inserted 59 lines above this function: `measureMarkupExtent` moved **16604 → 16663**, and `:16604`
> now points at a bare `});`. **Nothing went red**, because no gate in this repo asserts that a
> documented line number resolves. Re-derived 2026-08-03: this was the **only** one of the 12 that
> broke; the other 11 still resolve.
>
> **This is the audit's §5 recommendation proving itself inside 24 hours, so it is applied here:**
> the viewer site is now anchored to a **unique string**, not a number. That string was already
> sitting on the cited line and carries strictly more information than the number — the `opts`
> parameter is exactly what distinguishes the fixed engine copy from the dormant title-block twin
> (**FL-0024**). The two title-block citations keep their numbers only because those files are
> frozen; **re-derive them anyway.**

**Why the template was left alone, and the measurement that decided it.** The heuristic only
engages on `<g transform="translate(…)">` groups. The template contains **exactly one occurrence of
the string `transform="translate` in the entire file — and it is the regex itself.** No emitter in
it can produce a translate-rooted group, and it declares one sheet (S1); both rendered snapshots
carry zero such groups. **The twin is dormant BY CONSTRUCTION, not merely dormant today** — a
stronger result than the two-snapshot check that opened the question. Fixing it would have moved
`04_renderer/snapshots_titleblock/` and G7 for no behavioural gain, and widening a re-bless past
the blast radius FU-0008 §5 predicted is exactly what makes a re-bless indefensible.

> ⚠️ **THE DAY SOMEONE ADDS A TRANSFORMED GROUP TO A TITLE BLOCK, THIS WAKES UP** — as a title
> block whose extent is set by whatever digits its metadata happens to contain. That is the whole
> reason it is written down. Logged as **FL-0024**, open by choice.

---

## 8. `09_tests/*/4_checks/` — the per-project checker folder, ×3 and growing

**ADDED 2026-08-01 by FU-0008 §2.3**, which asked where the new viewBox-vs-ink guard's truth should
live and observed that "a guard in three places is itself a drift surface".

| | |
|---|---|
| **Sites** | `09_tests/_PROJECT_TEMPLATE/4_checks/` (**TRUTH — the copy that propagates via `cp -r`**) · `09_tests/01_Default 2500 kVA Service/4_checks/` · `09_tests/02_Sprouts Office Building - 2000A/4_checks/` |
| **Owning repo** | **SLD repo only** |
| **Relation** | `check_lib.mjs` and the shared checkers are meant to be byte-identical across all three; a project may legitimately ADD a checker (Sprouts has `check_tag_spec.mjs`; the other two do not). |
| **Change-set rule** | **Edit `_PROJECT_TEMPLATE` first, then copy outward.** Editing a live project's copy is how the next `cp -r` starts blind. |
| **Guard** | **none.** Verified by hand 2026-08-01: `sha256sum 09_tests/*/4_checks/check_lib.mjs` → one hash, three times (`8c7a4d58`), and the same for `check_page_scale.mjs` (`948eb692`). They were identical before that session's edits too. |

**What FU-0008 did about it, and what it deliberately did not.** The new frame-honesty measurement
was **not** copied into three files. It lives once, in `08_validation/lib/ink_extent_V1_0_0.mjs`,
and `check_lib.mjs` — the only file in `4_checks/` allowed to know a path — re-exports it. The same
module is imported by the golden's `behavior_test.mjs`. So the *new* code has a single source; what
remains ungated is the *existing* triplication of the folder itself.

> A gate for this would be cheap (a sha equality check across the three copies) but it would change
> `sync_gate`'s check-NAME baseline, which gate 14 pins at 14 names / 12 quick. That is a deliberate
> act for its own change-set, not a rider on an engine fix.

---

## Straddling failure-log entries

These are not duplications but **cross-repo pointers that break at a move**, which is the same
maintenance hazard. Listed here per D4b so the split does not lose them.

| FL | Status | Straddle | Owning repo after Phase 7 |
|---|---|---|---|
| **FL-0001** | `fixed` 2026-07-25 | `sync_gate.mjs` P1 tested *containment*, not identity, and sat green on a stale DLL. The check now extracts the embedded resource and hashes it. | **SLD repo** (the gate) — but the artifact it checks is the toolkit's DLL, so the check must be **re-homed** with the artifact (D5). |
| **FL-0002** | **open**, S3 | Engine `BOX` ↔ `SymbolDims.cs` — surface 4 above. | **both**; the fix is a map/engine retune, so the SLD repo leads. |
| **FL-0004** | **open**, S4 | Nine files cited `09_tests/SLD family dimensions.csv`, which has never existed. The real path is `09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hospital - SLD family dimensions.csv` (the folder is `Revit Tests Docs` — a third wrong spelling was corrected 2026-07-30). | **both**. Re-derived 2026-07-31 and it **confirms the register's count: 6 files / 11 sites still dangle** — `04_renderer/sld_viewer_engine_V1_0_0.html` (×2) and its generated `sld_engine.mjs` (×2), the hospital viewer, the two `2_build/` viewers, and `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/SymbolDims.cs:7` (other repo). ⚠️ **A bare grep returns 11 files: five of them quote the ghost path only to warn about it** (`FL-0004` itself, the register, `02_specs/symbols/sld_system_model_V1_0_0.md:10`, this document, and `DEDARMS Revit Toolkit/docs/feature_sld_contract.md`). **Read the hits; do not count them.** The engine hits are in GENERATED output — fix `sld_viewer_engine_V1_0_0.html` and regenerate, never edit `sld_engine.mjs` in place. |

---

## What Phase 7 owes this document

> ✅ **ALL THREE ITEMS ARE CLOSED as of 2026-07-31.** Item 1 landed with Phase 7a; **items 2 and 3
> were assigned to 7b, skipped by 7b, and skipped again by 7b's cold review** — they were finally
> done by Phase 8, which is where they belonged all along, because both are the same job Phase 8
> exists to do. **The heading is kept as written**: three documents cite this section by name, and
> renaming it to match the phase that actually did the work would repoint those citations at a
> section that never existed.

1. ✅ **DONE 2026-07-31 BY PHASE 7a — coverage gate on surfaces 1–3, per FIELD *and per
   (node, variant) key the map carries*, in the drop manifest** (D4a).
   Lives at `03_contracts/published_drop/drop_manifest.json` → `drift_coverage`, derived and
   asserted by `08_validation/lib/drift_coverage_V1_0_0.mjs` in the toolkit repo (gate T9).
   **Every value there was derived BY COMMAND from the C# and the map, not transcribed from this
   document** — deliberately, so the two cannot agree merely because one was copied from the other.
   `("L2-7","")` is declared as waiver **W1**, with a machine-checkable `premise`.

   > 🚩 **TWO CORRECTIONS THIS DOCUMENT OWES ITSELF, both found by building that gate:**
   >
   > **(a) `("L0-1","")`'s X is NOT a coverage hole.** §1's note calls the L0-1 X fallthrough
   > "the same per-field fallthrough", and it is — but a *waiver* exempts a key the **C# table
   > holds**, and `DrawnCenterXCorrPx` holds no L0-1 row at all. It was written into the drop as a
   > waiver and **the gate rejected it on its first run.** It is a note, not an exemption.
   >
   > **(b) SURFACES 2 AND 3 CARRY A SILENT-UNREACHABILITY TRAP THIS DOCUMENT DOES NOT MENTION.**
   > Both consult the map with **no variant** — `DetailLinePlacer` builds `insetOverrides` with
   > `GetMapEntry(nt)`, `EquipmentLabelPlacer` calls `GetMapEntry(NodeType)` — and `FamilyResolver`
   > files variant-BEARING entries in the variant map only. **So a `visible_edge_*` inset or a
   > `flipped_text_right_gap_px` written onto a variant-bearing entry is silently unreachable: it
   > looks like a correct map tuning, changes nothing, and errors nowhere.** No such entry exists
   > today; the drop's `variant_bearing_must_be_empty` now asserts it stays that way.
   >
   > ⚠️ **And the granularity cuts both ways.** `(L2-1,"spare")` was provisionally flagged as an
   > uncovered surface-2 key and **it is not** — that surface never consults the variant, so §2's
   > "✅ complete, per field" is right as written. **Determined by reading the call sites, not by
   > inferring from the table shapes.** ⚠️ **Per-field is not enough on its own** — see surface 1's corrected §2: the C# fallback
   goes live when an EXISTING variant entry drops one field, which a gate keyed only on "does a
   variant-less entry exist" would never see.
2. ✅ **DONE 2026-07-31 BY PHASE 7b, DESCRIBED HERE BY PHASE 8 — the checks that follow the artifact
   re-homed to the toolkit (D5, D8a).**

   This item was written as work to be done. **By the time anyone read it again the work had happened
   and this document had not been told** — which is its own small instance of the drift it exists to
   describe. What moved, and where:

   | Was, in `sync_gate.mjs` | Is now |
   |---|---|
   | checks 3, 4 — the DLL carry copies | toolkit **`[T3]`** |
   | check 11 — blessed carry-copy **resource names** (D8a) | toolkit **`[T3]`** |
   | check 8 — DLL embed == manifest `embeds_map_sha256` (honesty) | toolkit **`[T3]`**, rewritten against the BLESSED copy |
   | check 5 — Revit `.addin` manifests well-formed | toolkit **`[T10]`** |
   | checks 6, 7 — the two installer sha pins | toolkit **`[T6]`** |
   | checks 12, 21, 22 — `runtime_unverified` prose + the two sha anchors | toolkit **`[T7]`** |
   | check 10 — `ADDIN_ROOT resolves` | **deleted, not re-homed** — decision **D-A** |
   | gate 13 — `build_gate.sh`, which compiled `13_addin/` | toolkit `08_validation/toolkit_build_gate.sh` |

   ⚠️ **ONE DID NOT MOVE, AND THAT IS THE POINT OF D5.** The **map↔DLL lockstep** (check 9) stayed in
   this repo per errata **E9**: it compares two *manifest fields* and never opens a DLL, so its
   subject never left. **Its cost is recorded where it bites** — this repo can no longer re-extract a
   real embed to measure `embeds_map_sha256` against, so on this side the field is now maintained by
   hand and nothing here can catch you forgetting to re-bless it. The toolkit's `[T3]` asserts the
   other half.

   > 🚩 **BOTH HALVES ARE NOW MUTANT-PROVED, WHICH THEY WERE NOT WHEN THIS ITEM WAS WRITTEN.**
   > `[T3]`'s embed leg has `mutants_blessed_embed.mjs` **9/9** in the toolkit, and `[T7]`'s four
   > checks have `mutants_hub_ledger.mjs` **14/14**. **A re-homed check is only as good as the proof
   > that it still fires after the port**, and the port changed every path it reads.

3. ✅ **DONE 2026-07-31 BY PHASE 8 — every `file:line` re-derived, at the new paths.**

   **All thirteen line-numbered citations were re-derived by command against the files at their new
   home, and every number was still correct.** The paths were not: four C#-side rows and two FL rows
   now read `DEDARMS Revit Toolkit/src/DEDARMS/…` and are marked **(other repo)**.

   Verified this pass: `AlignTables.cs` `:93`/`:149` · `DevicePlacer.cs` `:742`/`:744` and `:100-108` ·
   `FedEdgeExtender.cs` `:32` and `:161-167` · `EquipmentLabelPlacer.cs` `:103` and `:111` ·
   `SymbolDims.cs` `:33` and `:7` · `FamilyResolver.cs` `:417-420` ·
   `02_specs/symbols/sld_system_model_V1_0_0.md:10`.

   ⚠️ **A CORRECT NUMBER TODAY IS NOT A GATED NUMBER.** See the banner at the top: these are
   cross-repo citations and **no gate in either repo can check one of them.** They survived 7b only
   because 7b edited no `.cs`. **The next rebuild is when they move** — and the four stale path
   comments inside those very files (**FU-0005, toolkit**) are already queued to ride along with it.
