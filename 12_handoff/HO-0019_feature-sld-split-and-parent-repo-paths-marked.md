# HO-0019 — the two HO-0018 recommendations executed: `feature_sld.md` split, parent-repo paths marked

| Field | Value |
|-------|-------|
| **ID** | HO-0019 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | **`consumed`** by **[HO-0020](HO-0020_gate-banner-moved-out-of-the-hub.md)** on 2026-07-31 — which executed the §4 item this entry deferred (the gate-consumer banner move) and finished HO-0018's recommendation set. |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0018 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is still the critical path** |
| **Exit state** | **14/14 twice, 89 check names identical, 0 FAIL** · build-gate **15/15** · sync **24/24** / **22/22** · **112** tests · shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` ×3 · **no `.cs`, no `.csproj`, no DLL touched** |
| **New FL** | none |

---

## 1. What this session was

Mayo said *"let's proceed with the two things you recommended."* Those are HO-0018 §6.1 and §7.1 —
the two items that get **cheaper before Phase 7 moves the tree and more expensive after**. Docs only.

---

## 2. `feature_sld.md` split — and the content conservation is PROVED, not claimed

**52,552 B / 81 lines / 2 headings / no `###`** → two documents at the seam that already existed:

| | B | lines | `###` | `####` |
|---|---|---|---|---|
| `docs/feature_sld_contract.md` — what the generator **reads** | 24,214 | 82 | 5 | 6 |
| `docs/feature_sld_pipeline.md` — what it **writes** | 30,668 | 82 | 11 | — |

**28 navigation anchors where there were none.** The old file's problem was never its byte count —
it was that `grep -n` returned a 13 KB blob with nothing to seek to.

### The conservation proof

This repo has spent six sessions on unprovable content-survival claims, and HO-0018 had just recorded
"nothing was lost" as **UNPROVABLE**. So this split was built to be provable, and the proof was run
**twice, by two independent scripts**:

1. **At authoring time** — the splitter asserts every transformation and refuses to write on failure.
2. **Afterwards, independently** — against a preserved pre-split copy, not against the splitter's
   own intermediate state:
   - **39 of 39** non-blank body lines found verbatim in exactly one output;
   - the one exception is the 13,240-char geometry bullet, which was deliberately exploded into
     seven sub-sections — and it **reconstructs to 13,238/13,238 characters, EXACT MATCH.**

> 🚩 **The assertions earned their keep immediately.** My own reading of the cut points was wrong:
> two of the six sub-section breaks landed **mid-sentence** (`A per-node-type **drawn-center X
> correction**…`), because the bold label is not always the start of its sentence. The script refused
> to write, and the fix was to locate the sentence boundary **by search rather than by eye**. Had I
> trusted the visual inspection — which looked completely convincing — the document would have shipped
> with two sentences guillotined.

Only two edits were made to prose bytes: `- ` stripped from four bullets that became sections, and
six paragraph breaks inserted in the geometry bullet. Both asserted. **No sentence was rewritten.**

### What it cost

Five reference updates (`sync_gate.mjs` FLOOR, the hub index row → two rows, `platform_architecture.md`,
`ops_build_and_test.md`, the drift doc's FL-0004 warn-only list) and **no gate work**: no check name
moved, no re-bless. The FLOOR gained one name and lost one — **deliberately, which is the point of a
floor** — and was then proved to fire:

| mutation | result |
|---|---|
| `feature_sld_pipeline.md` deleted | **RED** — *"linked from the hub but missing"* |
| `feature_sld_contract.md` gutted to 0 B | **RED** |
| unmutated | 24/24 |

⚠️ **`docs/feature_sld.md` NO LONGER EXISTS.** Anything citing it by name is stale.

> ✅ **THE PRE-SPLIT ORIGINAL IS PRESERVED — `Download/DEDARMS_HO0019_PRESPLIT_feature_sld_2026-07-31/`**
> (moved out of the scratchpad at Mayo's instruction, 2026-07-31, and verified byte-identical after the
> move: **52,552 B / 81 lines**, sha256 `8c888a18ce1a4d30…`). It holds the document, **`split_sld.py`**
> — the assert-everything splitter, this session's analogue of Phase 6's `slice.py` — and a README.
>
> **This is the difference between HO-0019 and Phase 6.** Phase 6 kept no copy of its input, which is
> why HO-0018 had to record its "nothing was lost" claim as **permanently UNPROVABLE**. Here the input
> survives, so the claim stays checkable by anyone, at any time — and it was re-proved from the
> archived copy after the move (**39/39 lines; geometry bullet 13,238/13,238, exact**).
>
> ⚠️ **When you re-run that proof, normalise away ` (SLD repo)` first.** §3's path tags were applied
> **after** the split — 7 in `feature_sld_contract.md`, 2 in `feature_sld_pipeline.md` — so a naive
> diff reports them as differences. It is a real trap and it fired on the first re-run: the geometry
> bullet read **13,282 vs 13,238**, a delta of exactly **44 = 4 × 11** characters, the four markers
> inside that section. **The check was right and the alarm was mine.** See the README.
>
> 🚩 **Still no git (FU-0002).** This directory and `DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/` are the
> only two oracles the documentation tree has. **Keep both until Phase 7 is done.**

---

## 3. Parent-repo paths marked — and the count HO-0018 carried was wrong

HO-0018 reported *"~20 bare parent-repo paths"*, from Lane E. **Re-derived: 20 citations exist, but
only 13 were bare** — the other 7 were already qualified in prose ("the parent system's `04_renderer/…`").
Lane E counted occurrences; HO-0018 repeated it as if all 20 were bare. **Corrected here.**

All **13** now carry an inline **`(SLD repo)`** tag, and the hub gained the rule that covers the class:

> **Any numbered `NN_name/` prefix is a PARENT-REPO path** — `00_Docs/ 02_specs/ 03_contracts/
> 04_renderer/ 05_revit/ 07_data/ 08_validation/ 09_tests/` — with a table separating them from
> `Core\ Sld\ Electrical\ Reports\` (this tree) and `DEDARMS.Lab\ DEDARMS.Replay2023\` (one level up).

**These paths still resolve today** — the add-in tree still sits inside the SLD repo. The tag does not
fix them; **it makes the Phase 7 obligation visible at the point of use instead of in a handoff nobody
greps.** The hub says so explicitly: on the day `13_addin/` moves out, all 20 become cross-repo
references, and that is a change-set item, not a defect to fix by deleting the citation.

Verified after: **0 broken internal links**, fence counts even in all eight documents, and FL-0004's
`6 files / 11 sites` re-derived **unchanged** across the split (the ghost-path grep still returns 11
files; `feature_sld_contract.md` simply replaced `feature_sld.md` in the warn-only five).

---

## 4. What was NOT done, deliberately

- **`###` anchors inside `platform_architecture.md`** (22 KB, 8 `##`, 2 `###`). It is the next-worst
  document by navigability but it is nowhere near `feature_sld.md`'s 17,517 B-per-heading, and
  HO-0018 did not recommend it. Left for whoever wants it.
- ~~**The gate-consumer banner was NOT moved out of the hub** (HO-0018 §6.3).~~ ✅ **DONE the same
  day by [HO-0020](HO-0020_gate-banner-moved-out-of-the-hub.md)**, with the mutant pass this bullet
  asked for: all six original mutants plus all five FL-0023 mutations re-run against the moved layout,
  all eleven still red, no false red. **Literal shipping shas above the ledger went 3 → zero**, so the
  pre-loaded shadow FL-0023 warned about no longer exists.
- **No prose was corrected for accuracy.** The split preserved the placement prose exactly as
  inherited — which, per the plan's own §6.6, **was never verified and still has not been.**

> ⚠️ **Found while splitting, NOT fixed:** three paragraphs carry an unbalanced bold run —
> `**Variants** (…).**`, `**Companions** (…).**` (both `feature_sld_contract.md`) and
> `**Variant resolution** (…).**` (`feature_sld_pipeline.md`). A stray trailing `**` renders as
> literal asterisks. Pre-existing, inherited verbatim through both the Phase 6 split and this one.
> **Recorded rather than silently repaired**, because this session's contract was structural: every
> byte of prose accounted for. A one-line fix for whoever touches those paragraphs next.

---

## 5. Successor — resume at PHASE 7

**Nothing in HO-0018's Phase 7 list is closed by this session except its own §6.1 and §7.1.** Read
HO-0018 §6 and §7 — they remain the live guidance, and **the decision record still outranks the plan.**

Carried forward unchanged and still the highest-value items:

- 🚩 **The REVIT TRIP is the critical path.** None of the three shipping DLLs has ever run in Revit.
- ⚠️ **FU-0002 (git) is still open**, and Phase 7 moves the entire tree.
- ⚠️ **FL-0022 + FL-0023 both apply to every future edit of `13_addin/CLAUDE.md`** — and the hub now
  carries a **new** load-bearing structure, the path-convention table, on top of the index and the
  ledger. **Re-mutate after any edit to any of the three.**
- ⚠️ **Treat the seven feature documents as new prose to review** (HO-0018 §3): ~21 KB of them is
  attested by no Phase 6 fragment, and this session added structure without reviewing content.

**HO-0018 is `consumed` by this entry.**
