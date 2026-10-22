# FL-0004 — nine files cite `09_tests/SLD family dimensions.csv`, a path that has never existed (six still do)

| Field | Value |
|-------|-------|
| **ID** | FL-0004 |
| **Opened** | 2026-07-25 |
| **Closed** | — |
| **Status** | `open` |
| **Severity** | S4 |
| **Stage** | process |
| **Component** | 9 files / 14 sites — see §1 (was stated as "6 files / 10 sites"; recounted 2026-07-30) |
| **Failure class** | other (dangling cross-reference) |
| **Detected by** | manual review during the 2026-07-25 results pass |

---

## 1. Symptom

The engine's `BOX` table, its C# mirror and the other files below cite the measured-family CSV by a
path that resolves to nothing:

| File | Lines |
|------|-------|
| `04_renderer/sld_engine.mjs` | 9747, 9751 |
| `04_renderer/sld_viewer_engine_V1_0_0.html` | 9989, 9993 |
| `09_tests/Hospital Example (Golden Case)/hospital_sld_viewer_V1_0_0.html` | 9989, 9993 |
| `08_validation/lib/geometry_V1_0_0.mjs` | 45 |
| `05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS/Services/SymbolDims.cs` | 7 |
| `02_specs/symbols/sld_system_model_V1_0_0.md` | 7 |
| `05_revit/DEADARMS ADDIN/CLAUDE.md` | 64 |
| `09_tests/Default 2500 kVA Service/2_build/default2500_sld_viewer_V1_0_0.html` | 2609, 2613 |
| `09_tests/Sprouts Office Building - 2000A/2_build/sprouts_sld_viewer_V1_0_0.html` | 3910, 3914 |

All say `09_tests/SLD family dimensions.csv`. **As of 2026-07-25 the file finally exists in the repo** —
but at `09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hospital - SLD family dimensions.csv`.

### ⚠️ Count errata + line drift, recounted from scratch 2026-07-30

Three different counts were in circulation — this entry's title said **six files**, this very table has
always listed **seven**, and an independent survey said *"9 citation sites in 7 files."* The measured
original scope is **9 files / 14 sites**: the seven above plus the **last two rows, which no earlier
count included at all.** Those two are the per-project *built* viewers; they inherit the comment from
the engine, so they need no separate fix and will self-correct the moment the engine site is fixed and
each project is rebuilt. They are listed anyway, because "the remaining sites" must mean every place a
reader can actually encounter the ghost path.

**THREE DIFFERENT NUMBERS ARE ALL CORRECT AT ONCE — know which one you are asking for**, because a
bare grep agrees with none of the headline figures:

| Question | Answer |
|---|---|
| How many files ever carried a dangling citation? | **9 files / 14 sites** (this table) |
| How many still point at nothing? | **6 files / 11 sites** — the byte-locked trio (6), `SymbolDims.cs` (1), the two `2_build/` viewers (4) |
| What does `grep -ral 'SLD family dimensions.csv'` return today? | **8 files / 13 sites** |

The grep is the confusing one, and here is why it is not evidence of a mistake. `geometry_V1_0_0.mjs`
dropped out entirely — its citation was replaced by the real path, so the ghost string is simply gone.
But `02_specs/symbols/sld_system_model_V1_0_0.md` and add-in `CLAUDE.md` **still contain the ghost
string on purpose**: both now cite the correct path and then quote the wrong one to warn that other
files carry it. So 8 = 6 genuinely dangling + 2 deliberate warnings. **A future "is FL-0004 clean yet?"
check must grep for the ghost path and then read each hit**, not count lines — the fix deliberately
increases the number of files mentioning the bad path before it decreases it.

**The line numbers above are the 2026-07-25 originals and have since drifted** (the engine grew).
Measured 2026-07-30: `sld_engine.mjs` **9936, 9940** · `sld_viewer_engine_V1_0_0.html` **10178, 10182** ·
`hospital_sld_viewer_V1_0_0.html` **10178, 10182** · `geometry_V1_0_0.mjs` **46** ·
`sld_system_model_V1_0_0.md` **10** · `SymbolDims.cs` **7**. Grep for the string, never the line number —
and use **`grep -a`**, because **three** files here contain NUL bytes and grep as binary, silently
dropping matches: `04_renderer/strip_compare.mjs`, `…/DEDARMS/UI/RibbonBuilder.cs` and
`…/DEDARMS.Replay2023/Services/ReplayPreflight.cs`. (This named only the first until 2026-07-30 —
FL-0013. Use `-a` unconditionally rather than consulting the list.)

## 2. Impact

Documentation-only; no code reads the path (it appears exclusively in comments and prose). The cost is
that the single most authoritative statement in the engine — *"the families are the dimension master;
the engine box = family drawn bbox exactly"* — points at nothing, so nobody can check the claim
without knowing where the CSV actually lives. That is precisely what let FL-0002 sit unnoticed.

Note the add-in `CLAUDE.md:64` also warns that an earlier CSV vintage predates a column and *"the two
vintages are not column-comparable by index"* — so the pointer needs to name **which** CSV, not just a
folder.

## 3. Root cause

The path was written aspirationally, describing where the measurement output was *expected* to be
committed, at a time when no `Measure Families` CSV had ever been committed to the repo. No gate
checks cross-references, so it was never contradicted.

## 4. Resolution

**PARTIAL, 2026-07-30** (DEDARMS-separation Phase 1). The cheap sites are fixed; the expensive ones
are not, and the split is deliberate.

**FIXED — 3 sites, all free (no sha moves, no rebuild, gates green across):**

| File | What it now says |
|---|---|
| `02_specs/symbols/sld_system_model_V1_0_0.md:7` | real path, plus a pointer to this FL for the rest |
| `08_validation/lib/geometry_V1_0_0.mjs:45` | real path + `FL-0004` |
| `05_revit/DEADARMS ADDIN/CLAUDE.md` (the `SymbolDims` gloss) | real path + the note that other files still carry the ghost |

**A THIRD WRONG SPELLING was found and fixed in the same pass**, which no earlier count included:
add-in `CLAUDE.md:138` cited `09_tests/Hospital Example (Golden Case)/Revit tests/…`. The folder is
**`Revit Tests Docs`**. So the repo carried the ghost path, the correct path, *and* a near-miss that
looks right at a glance — the near-miss is the worst of the three, because a reader who checks it
concludes the pointer is fine.

**STILL OPEN — 4 sites to fix, each blocked on something real:**

| File | Why not fixed |
|---|---|
| `04_renderer/sld_viewer_engine_V1_0_0.html:10178,10182` | byte-locked; sync_gate check 11 + 2 manifest shas. Editing forces a re-bless and a G5/G6 re-run |
| `04_renderer/sld_engine.mjs:9936,9940` | **generated** — never hand-edit; it must equal `regenerate(viewer)` |
| `09_tests/…/hospital_sld_viewer_V1_0_0.html:10178,10182` | frozen golden, byte-copy of the viewer |
| `…/DEDARMS/Services/SymbolDims.cs:7` | editing C# source without rebuilding creates silent source↔blessed-DLL drift; `DEDARMS.dll 9f16a1e7` is the build that actually ran in Revit and a rebuild would forfeit that |

**PLUS 2 files that need NO fix of their own** (found 2026-07-30, in no earlier count — see the §1
errata). They are downstream copies, so fixing the engine site fixes them on the next project rebuild:

| File | Disposition |
|---|---|
| `09_tests/Default 2500 kVA Service/2_build/default2500_sld_viewer_V1_0_0.html:2609,2613` | generated per-project viewer — self-heals on rebuild |
| `09_tests/Sprouts Office Building - 2000A/2_build/sprouts_sld_viewer_V1_0_0.html:3910,3914` | generated per-project viewer — self-heals on rebuild |

So the honest tally is **3 of 9 files corrected, 4 left to edit, 2 that follow for free.** Any future
"is FL-0004 done?" grep will keep hitting those last two until the projects are rebuilt — that is
expected, not a regression.

⚠️ **Not a trivial find-and-replace.** Three of the remaining four are the **byte-locked trio**
(`sld_viewer_engine_V1_0_0.html` → `gen_engine.mjs` → `sld_engine.mjs` → byte-copied golden viewer).
Editing those comments moves three load-bearing shas even though output is byte-identical, so the fix
needs the standard procedure: edit the viewer, prove comment-only with a `sed 's://.*::'` diff,
regenerate the engine, byte-copy the golden viewer, re-bless **both** manifest sha entries
(`sha256` + `short`) for each, then run the gates. Best done folded into the FL-0002 retune, which has
to touch the same lines anyway. The `SymbolDims.cs` site should ride the next legitimate DLL rebuild.

**Status stays `open`** on purpose. Closing it while **six files / 11 sites** still point at nothing —
four of them needing a real edit — would be the same category of error the entry documents.

### (superseded) original resolution note

`TBD` — deferred by Mayo 2026-07-25.

⚠️ **Not a trivial find-and-replace.** Three of the six files are the **byte-locked trio**
(`sld_viewer_engine_V1_0_0.html` → `gen_engine.mjs` → `sld_engine.mjs` → byte-copied golden viewer).
Editing those comments moves three load-bearing shas even though output is byte-identical, so the fix
needs the standard procedure: edit the viewer, prove comment-only with a `sed 's://.*::'` diff,
regenerate the engine, byte-copy the golden viewer, re-bless **both** manifest sha entries
(`sha256` + `short`) for each, then run the gates. Best done folded into the FL-0002 retune, which has
to touch the same lines anyway.

## 5. Regression guard

None today. Candidate, if it ever recurs: a link-checker over repo-relative paths cited in comments and
prose. Not proposed as work — the FL-0002 cross-check preflight is the higher-value guard and it makes
the CSV's real location load-bearing, which is a stronger fix than a pointer that merely reads correctly.

## 6. Detection gap

n/a.

## 7. Links

- Related failures: **FL-0002** (fix these together — same lines, same trio procedure)
- Specs / contracts touched: `02_specs/symbols/sld_system_model_V1_0_0.md`
- Gates involved: none
- Memory / session: the 2026-07-25 Revit run
