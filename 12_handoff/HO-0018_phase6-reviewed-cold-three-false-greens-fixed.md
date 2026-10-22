# HO-0018 — Phase 6 reviewed cold: the documents held, three of the four checks that guard them did not

| Field | Value |
|-------|-------|
| **ID** | HO-0018 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | **`consumed`** by **[HO-0019](HO-0019_feature-sld-split-and-parent-repo-paths-marked.md)** on 2026-07-31 — §6.1 and §7.1 executed. ⚠️ **§7.1's count was wrong: 20 citations exist but only 13 were BARE.** §6.2–§6.5 and the rest of §7 still stand. |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0017 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is still the critical path**; this review added nothing to it |
| **Exit state** | **14/14 twice, 89 check names identical to the Phase 6 baseline, 0 FAIL** · build-gate **15/15** · sync **24/24** full, **22/22** quick · **112** tests · shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` on all three · **no `.cs`, no `.csproj`, no DLL touched** |
| **New FL** | **FL-0023** (S2) — three false greens, all fixed and mutant-proved |

---

## 1. What this session was

Mayo asked for a cold review of separation Phase 6 before Phase 7 starts. Executed
`Download/DEDARMS_PHASE6_VERIFICATION_PLAN_2026-07-31.md` as written: **five lanes, A/B/D cold and
read-only with their targets phrased as questions, C after A+B, E free.** No lane edited a file. The
main thread **re-derived every finding by command before writing it down**, then fixed.

**The plan's §2 was the author's own ranked list of what he least trusted. It was a good list and it
was not the boundary of the search — as its own §6 warned. The three worst findings are not on it.**

---

## 2. ⭐⭐ The headline: the documents held; the checks guarding them did not

Phase 6's own suspicions came out **clean**, and that is worth stating plainly because it is most of
the work:

| The author's ranked worry | Outcome |
|---|---|
| #2 **"the 33 repointed paths were never asserted to RESOLVE"** | ✅ **DISPROVEN as a defect source.** All **63** folder-qualified citations across the seven docs + the drift doc resolve; **104** citation/document pairs examined, **zero** dead. Every one of **35** `file:line` claims points at what the prose says, including all **18** family-map line/label pairs. **32/32** links and anchors pass. Every DO-NOT-TOUCH value matches source, including the 2023 `VendorId` correction. |
| #3 the L2-7 "benign today" **inference** | ✅ **CONFIRMED by reading the source** — but its stated trigger was wrong. See §4. |
| #1 **"nothing was lost" is circular** | ✅ Correct, and the verdict is **UNPROVABLE**. See §3. |
| #4 FL-0022 may not be closed, and there is an unrun mutant | 🚨 **The unrun mutant found a live defect. It was the single highest-value task in the plan, exactly as the plan predicted.** |

**Then the question nobody had asked:** *not* "can I make this check go red?" but **"can I construct a
WRONG state it accepts?"** Three of the four `sync_gate` checks that read `13_addin/CLAUDE.md` — the
four Phase 6 declared mutant-proved — accepted states they exist to forbid, **all at a clean 24/24**:

1. **Both P5 anchor checks were shadowable.** `String.match` takes the first hit. A restatement higher
   in the file carrying the *correct* sha held them green while the real ledger rotted to two shas
   that exist on disk nowhere — *a wrong-DLL-carried-to-the-Revit-box state*. **And the shadowing site
   was already pre-loaded in the file**: the FL-0022 banner rows, inert only because their backticks
   are escaped.
2. **Core's ledger line spoke for the Lab satellite.** `includes(short)` counts an *incidental*
   mention. Falsifying the Lab's own never-run sentence left zero honest lines for it and still scored
   24/24 — on the artifact D2c makes invisible at runtime. The same bug fires as a **FALSE RED on a
   correct trip change-set**, so it would have hit mid-trip.
3. **`13_addin/docs/` was completely ungated.** Truncating all six documents to zero bytes, or
   deleting the directory, scored 24/24.

All three fixed by **widening in place** — the FL-0016 shape, so **no check name moved, no gate-14
re-bless, 89 names still identical.** Full write-up, reproductions and mutant table in **FL-0023**.

> 🚩 **FL-0022 was narrowed, not closed.** Phase 6 hardened the P1 honesty check against
> documentation-satisfies-check and left the same shape wide open on the P5 pair. **This is the sixth
> true-by-construction check in this repo.**

### The process finding that made #2 invisible

`mutants.sh` **M3's control arm was dead.** It holds `addin_dll` green by rewriting
`HAS NEVER RUN INSIDE REVIT` → `never ran in Revit`, but `"never ran"` matches none of the `NEVER`
regex, so M3 went red on **both** artifacts and the case it advertised — Lab loses its own line while
Core keeps its, which *is* defect #2 — **was never exercised.**

> **A mutant whose control arm also dies proves nothing about the variable. Assert what stayed GREEN,
> not only what went red.** Six mutants all going red read as six independent proofs; one was
> measuring nothing.

---

## 3. Content survival: **UNPROVABLE**, and that is the honest answer

Recorded as a **permanent limitation of Phase 6, not as a pass.**

The cut ranges were re-derived from `slice.py` twice independently and agree exactly:
**307 of 331 source lines cut, zero overlap.** The uncovered set is

```
1-4, 118, 140-152, 158, 164, 187, 189, 245, 331     (24 lines)
```

— **identical to the author's from-memory list**, which his own §6 said to distrust. `1-4` is proved
byte-identical to the ancestor's header; `140-152` is the PATH-TRANSLATION BANNER, dropped on purpose
and its obligation discharged; the seven singletons are blank separators on structural grounds. Byte
arithmetic bounds everything uncovered at **≤1,175 B**, which cannot hold a section. The 222-line
ancestor reconciles fully — seven absences, each named, each superseded or relocated.

**But the evidence chain runs fragments → outputs, never source → fragments**, and the 331-line file
exists nowhere. Everything measurable is *consistent with* nothing lost and **cannot exclude it**.

> 🚩 **The direction nobody had measured is the larger one.** Fragments **83,643 B** → seven outputs
> **104,618 B**: **~20,975 B (~450 non-blank lines) of the new documents is Phase-6 prose that no
> fragment attests** — including the entire DO-NOT-TOUCH identity block.
> `feature_reports_and_lab.md` is ~100% new; `platform_architecture.md` ~57%.
> **Phase 7 must treat the new docs as NEW PROSE TO REVIEW, not as relocated prose already reviewed.**

---

## 4. The L2-7 coverage hole: inference confirmed, trigger corrected

The "benign today" chain had been asserted, never read. **It is correct** —
`FamilyResolver.cs:417-420` keeps variant-bearing entries out of `_nodeTypeMap`; `GetMapEntry`
(`:185-192`) therefore returns null for a variant-less L2-7; `DevicePlacer.cs:100-108` records the
skip and **`return`s before** the correction is read at `:740-744`.

**But the trigger both the drift doc and HO-0017 §6 stated was too narrow, and it is the part D4a's
gate depends on.** `DevicePlacer.cs:742/744` reads
`mapEntry?.DrawnCenterXCorrPx ?? AlignTables.DrawnXCorrPx(…)` — **the map wins, PER FIELD.** So:

1. **The map is the live source today, not the C# table.** For the two L2-7 entries that exist, the
   C# `("L2-7","")` rows are already dead.
2. **The fallback goes live with no new family added.** Because that `??` is per field and
   `AlignTables.Corr` falls back from an unmatched variant to the `(node,"")` row, the C# value
   becomes live the moment **either existing** L2-7 entry drops **one** corr field — a one-line map
   edit. **Not hypothetical: the same fallthrough fires today on `L0-1`'s X.**

**So the gate D4a owes must be per FIELD *and per (node, variant) key the map actually carries*** —
"is there a variant-less entry" would never see this. Corrected in both documents.

---

## 5. What was fixed

**Gate** — `08_validation/sync_gate.mjs`, three checks widened in place, no name moved:
`matchAll` + every anchor must match the manifest · never-run claims owned by the **nearest** sha ·
`ADDIN_ROOT` now asserts the hub's index resolves (set **derived** from the hub's own links, asserted
a **superset** of the six that exist — the FL-0013 relation).

**Documents** — every one re-derived by command first:

| File | Correction |
|---|---|
| `00_Docs/drift_surfaces_V1_0_0.md` | L2-7 trigger corrected (§4); D4a's gate spec widened; "six entries" listing seven → **seven, six carrying the pair**; "five consecutive sessions" → **six** |
| `00_Docs/dedarms_separation_decisions_V1_0_0.md` | **Closed the four-times-restated anchor block**, which still instructed Phase 7 as though Phase 6 were pending. **Numbers deliberately NOT repointed** — they are the record of the drift; repointing deletes the evidence. Its stale shas flagged. |
| `00_Docs/repo_runbook_V1_0_0.md` | §7's "~105 KB combined, add-in ~73 KB" (pre-split, uncorrected while the doc table was fixed) → **re-measured**; the dead "add-in `CLAUDE.md` L184/L214" citation → **located by prose** |
| `03_contracts/current_state_manifest.json` | `74 .cs` → **72** in two places (the Phase 6 correction never reached the contract file), and a `Lab/` bucket that does not exist |
| `12_handoff/HO-0017_*.md` | consolidated correction block; the false "will not survive" bullet |

**Not fixed, deliberately:** consumed handoffs and FL narrative bodies (Phase 4's rule).

---

## 6. Design judgement (Mayo asked explicitly)

1. **`feature_sld.md` is the entire deficit of the split — SPLIT IT.** 52,552 B in **81 lines** with
   **2 headings and no `###`** — **8.7× less navigable per heading** than the next-worst document, and
   **line 27 alone is 13,370 B**, larger than the hub. Measured against two real tasks: *"add a ribbon
   button"* reads **54%** of the original 84 KB — a genuine win. *"Retune the A-8 flipped-text gap"*
   reads **99.5%** — no win at all. **The cut is at the existing seam** (`## Data architecture` |
   `## SLD generation flow`) → ~23.5 KB + ~30 KB. **The higher-value half is adding `###` anchors**,
   without which you get two files you still cannot navigate. **Cost: 5 link edits, no gate work.**
2. **Keep `13_addin/docs/`.** Do not adopt `00_Docs/`. The `00_` prefix is a sort hack for 14 sibling
   pipeline folders that will not exist in the toolkit repo, and `_V1_0_0` marks versioned reference
   artifacts — these are living docs, the `CLAUDE.md` family. `docs/` travels to a standalone tool
   repo unchanged.
3. **Keep the ledger in the hub, but for the right reason, and move the banner OUT.** "A gate reads
   this path" is nearly false — the P5 checks find anchors by prose and would follow the ledger
   anywhere; it is a 3-line edit. **The real reason is that the ledger is the one item updated on
   every rebuild regardless of which feature you touched.** The gate-consumer banner is **22 of the
   hub's 86 lines** and is pure gate mechanics; moving it to `ops_build_and_test.md` makes FL-0022
   **structurally** impossible rather than a warning to be careful — the file the check greps would no
   longer contain the documentation of the check. **This repo's record says warnings did not hold.**
4. **"Read only the one you are editing" was never achievable as stated.** Every code change
   rebuilds; every rebuild re-blesses a sha; the sha lives in the hub. The honest restatement is
   **"read the hub, the ops doc, and the one you are editing"** — three, always. Say so in the docs.
5. **The drift doc stays single-copy in the SLD repo.** The no-second-copy argument is *sharpened* by
   the repo split, not weakened. **But surfaces 1–3 straddle**, so leave a **stub, not a copy**, in
   the toolkit naming the surfaces it owns, and **lift the enforceable half into the drop manifest** —
   prose cannot live in two repos, data can live in one and be read by both.

---

## 7. Successor — resume at PHASE 7

> ✅ **CONSUMED 2026-07-31 by [HO-0019](HO-0019_feature-sld-split-and-parent-repo-paths-marked.md).**
> **§6.1 executed** — `feature_sld.md` split at the named seam into `feature_sld_contract.md` +
> `feature_sld_pipeline.md`, 28 anchors added, **content conservation PROVED** (39/39 lines, the
> 13,240-char geometry bullet reconstructing exactly). **§7.1 executed** — but ⚠️ **its count was
> wrong: 20 citations exist and only 13 were BARE**; the other 7 were already qualified in prose.
> Lane E counted occurrences and this entry repeated it as if all 20 were bare.
> **Everything else below still stands** — in particular **§6.3 (move the gate-consumer banner out of
> the hub) was deliberately NOT done**: it is the structural cure for FL-0022/FL-0023 and needs its
> own mutant pass before Phase 7 moves the tree.

Read the plan's §10 PHASE 7 (sessions 7a, 7b) and **the decision record, which outranks the plan.**

### 🚩 What this review adds to Phase 7's cost, in priority order

1. **~20 bare parent-repo paths inside the add-in docs will silently stop resolving when the tree
   moves** — `07_data/`×5, `09_tests/`×4, `04_renderer/`×4, `00_Docs/`×3, `08_validation/`×2,
   `03_contracts/`×2. Phase 6's repointing pass added **feature** prefixes, never **repo** prefixes.
   In `feature_sld.md` only **one of ten** is qualified. **Fix these in Phase 7's change-set or the
   toolkit ships with ~20 dead references on day one.**
2. **Treat the six new documents as new prose to review** (§3) — ~21 KB of them is unattested by any
   fragment, and the plan's own §6.6 concedes the placement prose was inherited unread.
3. **The `sync_gate` side is genuinely ready**: `ADDIN_ROOT` is declared once with the
   `path.isAbsolute` passthrough that makes an out-of-repo root possible, and **M6 is the rehearsal**
   for the move. Four consumers break when `13_addin/` leaves; they are now five predicates, all
   mutant-proved in both directions.
4. **Decide `feature_sld.md` before the move, not after** (§6.1) — it is cheaper to split in place.
5. **FU-0002 (git) is STILL open and still the cheapest risk reduction available.** Phase 6
   restructured 84 KB with no rollback, having read a briefing that said *"Rollback: NONE"* in bold;
   the snapshot exists only because Mayo asked afterwards. **Phase 7 moves the entire tree.**

### Carry these forward

- ⚠️ **FL-0023's rule joins FL-0022's for every future edit of `13_addin/CLAUDE.md`:** prose you
  locate an anchor by **must occur once**, and a claim must be attributable to **its own** artifact.
  Re-mutate after any edit near the ledger — and now also after any edit to the hub's **index**, which
  is load-bearing for the first time.
- ⚠️ **Line numbers still go stale silently — this makes SEVEN consecutive sessions.** This review
  found dead line citations in the **decision record**, the **runbook** (twice) and the **manifest**
  — three documents Phase 6 did not sweep because it grepped for the *file path*, not for the
  *content*. **Re-derive the SET; never re-point the numbers.**
- ⚠️ **Rollback:** `Download/sld_snapshot_post-phase6_2026-07-31.tgz` (70 MB, 723 entries, verified).
  **Post-split — it protects you, it does not recover the original.**
- The audit trail at **`Download/DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/`** **survived** (HO-0017's
  last bullet said it would not; corrected). It is the only oracle "nothing was lost" has — **do not
  delete it until Phase 7 is done.**

**HO-0017 is `consumed` by this entry.** Its §5 correction table stands; its §8 trip guidance carries
forward unchanged.

🚩 **The REVIT TRIP is still the critical path.** Eight items wait on it (HO-0015 §8). **None of the
three shipping DLLs has ever run in Revit**, and this review changed no assembly — but it did remove
a state in which the doc could have named the wrong DLL to carry.
