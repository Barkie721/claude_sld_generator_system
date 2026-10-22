# HO-0017 — Separation Phase 6 complete: the 84 KB add-in CLAUDE.md is split, and the split found a false green

| Field | Value |
|-------|-------|
| **ID** | HO-0017 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | **`consumed`** by **[HO-0018](HO-0018_phase6-reviewed-cold-three-false-greens-fixed.md)** on 2026-07-31 — the cold review Mayo asked for in §8. **Read the CORRECTIONS block below before trusting any number in this entry.** |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0016 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is the critical path** and Phase 6 added nothing to it. |
| **Exit state** | **14/14 twice, 89 check names identical to the pre-change baseline, 0 FAIL** · build-gate **15/15** · sync **24/24** full, **22/22** quick · **112** tests · shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` on all three |

---

> ## ⚠️ CORRECTIONS FROM THE COLD REVIEW (HO-0018, 2026-07-31)
>
> This entry was audited cold by five lanes. **The work held: no cited path is dead, no `file:line` is
> wrong, no link or anchor is broken, no DO-NOT-TOUCH value differs from source, and the shas are
> unmoved.** The §5 correction table is sound — eight of nine WAS claims are attested by preserved
> evidence and all nine IS values re-derived clean. What follows are the claims that did **not** hold.
> Each is corrected here in place; the reasoning is in HO-0018.
>
> | Claim in this entry | Correction |
> |---|---|
> | §3 the ledger moved **"verbatim, byte for byte, unwrapped"** | **Not verbatim.** `frag_ledger.md` vs hub `:55-79` differ on exactly one line (the disclosed `74`→`72`, +52 B), **but six further non-blank lines were APPENDED after the verbatim region** — the `docs/feature_replay.md` carry bullet and the "All three artifacts are `runtime_unverified`" closer. New prose beside the ledger is exactly what FL-0022 says must be re-mutated; "verbatim" is the word that stops the next session looking. |
> | §4 **"The 28 lines that differ are each a deliberate correction listed in §5"** | **Both halves wrong.** Re-derived: **39** non-blank fragment lines are absent from the outputs, and the largest groups (`frag_drift` 9, `frag_labwarn` 5, `frag_ribbon` 5) are rewrites and re-wraps, **not** §5 corrections. |
> | §4 **"Nothing was lost"** | Checked in **one direction only**, and the entry's own §8 concedes the circularity. The other direction is large and was never stated: fragments **83,643 B** → seven outputs **104,618 B**, so **~20,975 B (~450 non-blank lines) of the new docs is Phase-6 prose no fragment attests** — `feature_reports_and_lab.md` is ~100% new, `platform_architecture.md` ~57%. **Phase 7 must treat the new docs as new prose to review, not as relocated prose already reviewed.** |
> | §4 hub + six documents **"(~93 KB total)"** | **93,547 B is the SIX DOCS alone.** Hub + six = **104,618 B**; +the drift doc = **116,405 B**. As written the figure is ~11 KB short, and it understates the growth the same sentence explains. |
> | §2 and the register row: **"M1, which deletes the real never-run warning"** | It does **not** delete it — `mutants.sh:32-33` separates the sha from the phrase. §3's table states this correctly; the two summaries most likely to be quoted forward do not. |
> | §4 "the script **hard-errors on any unmapped path**", offered as the repointing guarantee | True of the script, **but it does not cover the whole result.** At least two feature-prefixed citations in the outputs appear in **no fragment** (`Core/UI/RibbonRegistry.cs`, `Sld/Services/SldSettingsStore.cs`) — hand-typed into new prose, never through the mapper. Both resolve on disk (Lane B checked all 63 folder-qualified citations; **zero misses**), so there is no live defect — only a guarantee narrower than it reads. |
> | "Carry these forward": **"the split fragments and the mutant script … will not survive"** | **False, and contradicted by §8 of this same file 40 lines earlier.** All 24 files exist at `Download/DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/`. A Phase 7 reader who trusts the bullet will not look for the only oracle the "nothing was lost" claim has. |
> | §5 row 1, `.cs` **74 → 72** | Correct, but **the correction never reached `03_contracts/current_state_manifest.json`**, which said 74 in two places (and invented a `Lab/` bucket that does not exist). Fixed 2026-07-31. |
> | §5 row 9, the runbook doc table | Only the table was updated. **`repo_runbook_V1_0_0.md` §7 still said "add-in ~73 KB … ~105 KB combined"** — the file contradicted itself, in the section a token-budgeting session actually reads. Fixed 2026-07-31. |
>
> 🚨 **Three false greens were found and FIXED — see FL-0023.** Two are in checks this entry declares
> mutant-proved. **FL-0022 was narrowed, not closed.**
>
> ⚠️ **Unverifiable by construction, recorded as permanent limitations, not as passes:** "84,615 B /
> 331 lines"; "`sync_gate.mjs` is byte-unchanged" (FL-0021 makes mtime useless here — the 89 identical
> names prove only that no *name* moved); "the fifth true-by-construction check" (the class is
> enumerated nowhere); and **all six mutant RESULTS** — `/root/p6shadow` is gone, so only `mutants.sh`
> survives. The review re-ran all six from scratch in a fresh shadow: **all six still go red.**

## 1. What this session was

Separation **Phase 6**, the four items from the plan's §10, worked in the order the prep briefing
(`/sdcard/Download/DEDARMS_PHASE6_PREP_2026-07-31.md`) laid out. **Docs only — no `.cs`, no
`.csproj`, no DLL, no build.** Nothing was compiled at any point except by the gate suite itself.

| Item | Result |
|---|---|
| 1. Split `13_addin/CLAUDE.md` | ✅ hub + **6** feature documents under `13_addin/docs/` |
| 2. Repoint the gate checks that read it | ✅ **zero repoints needed — option (a) taken deliberately**, then mutant-proved anyway. See §3. |
| 3. §7.2 DO-NOT-TOUCH block into the platform doc | ✅ and **corrected against source** — the plan's block had the 2023 `VendorId` wrong |
| 4. `00_Docs/drift_surfaces_V1_0_0.md` | ✅ surfaces 1–6, owning repo + change-set rule, coverage-not-equality, **plus a live coverage hole nobody had measured** |

## 2. ⭐ The headline: this session introduced a false green and its own mutant caught it — FL-0022

Four `sync_gate` checks read `13_addin/CLAUDE.md`. The new hub therefore opens with a banner
explaining them so nobody re-wraps a load-bearing line by accident. **That banner quoted the 2023
replayer's short sha beside the two phrases the honesty check greps for** — so the banner *itself*
became a satisfying line, and **mutant M1, which deletes the real honesty warning, scored a clean
24/24 GREEN.**

`replay2023_dll`'s margin was already **one line**; the prep briefing said so in bold. This defect did
not move that line — **it removed the need for it**, invisibly, inside prose whose stated purpose was
to protect it.

**Then the first fix re-created the defect**, quoting the sha again while explaining the trap. M1
survived a second time. Both occurrences are in FL-0022 because the shape is the lesson:

> **Writing about a grep target is writing the grep target. Documentation of a check must never be
> able to satisfy it.**

Rule now in the hub, and it is cheap: **shas in the ledger, artifact names in the prose.**

This is FL-0019(e)'s *true-by-construction* class, in prose rather than code, committed by the
session that had just read FL-0019 §6 about it. That makes **five** times this repo has produced a
check that could not fail.

## 3. The four consumers — decided, then proved

**Option (a) from the prep briefing was taken: all shipping-sha prose stays in `13_addin/CLAUDE.md`.**
The shas are a *platform* fact, not a feature one, and the alternative buys nothing but risk. The
ledger block (both P5 anchors, all three artifacts' never-run lines) was moved **verbatim, byte for
byte, unwrapped and unrepointed** — the only edit inside it is `74 .cs` → **72**, flagged in place.

**Zero gate edits were made. The mutants were run anyway** — a repoint you did not make fail is a
repoint you have not tested, and that logic applies just as hard to a *non*-repoint:

| Mutant | Expected | Result |
|---|---|---|
| M0 baseline, split docs in place | green | **24/24** ✅ |
| M1 replayer's sha separated from its never-run phrase | RED naming `replay2023_dll` | ✅ **after two survivals — see §2** |
| M2 `addin_dll` never-run phrase removed | RED naming `addin_dll` | ✅ |
| M3 `addin_lab_dll` loses BOTH satisfying lines, `addin_dll` left green | RED naming `addin_lab_dll` | ✅ |
| M4 `Current shipping DLL sha256` reworded | RED, P5 | ✅ |
| M5 Replay2023 anchor split across two lines (**the re-wrap hazard**) | RED, P5 | ✅ |
| M6 `13_addin/CLAUDE.md` moved into `docs/` | RED, `ADDIN_ROOT` + 3 dependants | ✅ |

Shadow repo at `/root/p6shadow`, built per the prep briefing's recipe and **confirmed to reproduce
24/24 before any mutant was believed.**

## 4. The split

`13_addin/CLAUDE.md` — **84,615 B / 331 lines** → **~11 KB hub** + six documents (~93 KB total; the
growth is the new index, the invariants block and the corrections listed in §5).

| File | Holds |
|---|---|
| `13_addin/CLAUDE.md` | the index + **the shipping-sha ledger** + the gate-consumer banner |
| `docs/platform_architecture.md` | overview · tree · Core bucket rules · D1 · ribbon structure · styling · hard rules · error philosophy · **the DO-NOT-TOUCH block** |
| `docs/feature_sld.md` | the two mega-sections — `Data architecture` + `SLD generation flow` (~50 KB of the original 84) |
| `docs/feature_electrical.md` | dashboard + the circuit CSV probe |
| `docs/feature_reports_and_lab.md` | Reports + Lab/Fun, **and the Lab-panel-vs-Lab-assembly collision** |
| `docs/feature_replay.md` | the 2023 replayer's design constraints + **the carry rules that cost two trips** |
| `docs/ops_build_and_test.md` | build commands · which gate · the two testing layers · two-machine deploy |
| `00_Docs/drift_surfaces_V1_0_0.md` | item 4 — and the *only* copy of the drift list, deliberately |

**The fake-heading trap was handled and verified, not assumed.** Both bash comments
(`# Build the add-in`, `# From the SLD repo root`) landed **inside** their fences in
`ops_build_and_test.md`, uncut. **Every output file has an EVEN fence count** — asserted
programmatically: 12 fences across the outputs vs 10 in the source, the +2 being the new invariants
block.

**Nothing was lost.** The split was done by line-range extraction from the measured section map
(the plan's §7.3 map is dead — it describes a 222-line file), then every non-blank fragment line was
checked for presence in the outputs. The 28 lines that differ are each a deliberate correction listed
in §5. The **only** prose dropped is the PATH-TRANSLATION BANNER (old L140–152), which existed solely
to defer the repointing this phase performed.

### The path repointing — an obligation the file itself assigned to Phase 6

The old banner said, in bold, *"⚠️ Phase 6 must do the path repointing as part of the split."* It was
done. A basename→feature-folder table was **derived from `find . -name '*.cs'`**, never from a
document, and applied mechanically; the script **hard-errors on any unmapped path**, so a citation
naming a file that no longer exists could not pass silently. **33 distinct prose citations** now carry
their real prefix (`Sld/Services/LayoutEngine.cs`, `Core/Services/CoordinateMath.cs`,
`Electrical/UI/DashboardPaneControl.cs`, …), plus `Sld\Resources\` for the embedded map and
`DEDARMS.Replay2023/Services/Json.cs` for the replayer's hand-rolled reader.

## 5. Measured corrections — every one re-derived by command first

HO-0016 §7 left these owed. They are now fixed, in the documents that inherited them:

| Claim | Was | Is |
|---|---|---|
| `.cs` total / partition | 74 · 25/36/7/1 | **72 · 27/37/7/1**, Lab **6** (was 5) |
| ribbon panels | "three panels" | **six** — SLD · Reports · Fun · Lab · Tools · Sandbox |
| `DEDARMS.sln` | "the three projects" | **four** (+ `DEDARMS.Tests`) |
| `DEDARMS.csproj:29` (EmbeddedResource) | `:29` | **`:66`** (and `:69`) |
| `DEDARMS\` | "the ONLY buildable shipping code" | **the CORE shipping assembly** — Lab ships too |
| post-build `DeployAddin` | described as live | **removed 2026-07-30 (Phase 5c)**, now said so |
| 2023 `VendorId` | the plan's block says `HRJ` flat | **`DEDARMS` on the 2023 side**; `HRJ` is 2025 only |
| Core→feature references | "the two structural ones … are 5b's" | **they survived 5b** — 7 named types, sites listed |
| runbook doc table | `13_addin/CLAUDE.md (~73 KB)` | hub + `docs/` + the drift doc |

Confirmed still correct, so left alone: `DEDARMS.Tests.csproj:91` (golden climb, depth **3**) and
`:54` (DashboardAnalytics link).

## 6. 🚩 A live coverage hole, found while writing item 4

D4a prescribes a **per-field coverage** gate on drift surfaces 1–3 for Phase 7. Measuring the actual
coverage to write the doc turned one up:

> **The C# fallback holds `("L2-7","")` for both `DrawnCenterXCorrPx` (4.07) and `DrawnCenterYCorrPx`
> (3.0), and the family map has NO variant-less `L2-7` entry at all** — only `spare` and `space`.

Surfaces 2 and 3 are fully covered per field; this is the one gap. It is **benign today for a reason
unrelated to the rule**: an L2-7 device with an unrecognised `kind` resolves to no map entry, so it
also resolves to no family and becomes a preflight skip before the correction is ever applied. But if
a variant-less L2-7 family is ever added, **it must carry both corr fields in the same change-set** or
the C# fallback silently becomes the live source. Written up in the drift doc as an exception Phase 7
must declare rather than work around.

> ✅⚠️ **CORRECTED BY THE HO-0018 COLD REVIEW, 2026-07-31.** The "benign today" chain above was
> asserted, never read; it has now been re-derived from source and **it holds** —
> `FamilyResolver.cs:417-420` → `GetMapEntry` `:185-192` → `DevicePlacer.cs:100-108` skips and
> `return`s before the correction at `:740-744`. **But the trigger stated above is too narrow, and
> that is the part that matters to D4a's gate.** `DevicePlacer.cs:742/744` is
> `mapEntry?.…CorrPx ?? AlignTables.…` — **the map wins, PER FIELD** — so (a) the C# rows are already
> dead for the two L2-7 entries that exist, and (b) the fallback goes live the moment **either
> existing** entry drops **one** corr field, with no new family involved. The same per-field
> fallthrough already fires on `L0-1`'s X today. See the corrected §1 of
> `00_Docs/drift_surfaces_V1_0_0.md`.

Also re-derived there: **FL-0004 is 6 files / 11 sites**, which confirms the register and corrects a
first draft of mine. ⚠️ **A bare grep returns 11 files; five of them quote the ghost path only to warn
about it.** Read the hits, do not count them.

## 7. What Phase 6 did NOT touch

- **No shipping assembly.** No `.cs`, no `.csproj`, no build, no re-bless. FL-0021's mtime trap was
  never in play because nothing was compiled outside the gate.
- **No `04_renderer/`.** Zero edits required, per plan §8.1.
- **No consumed handoffs, no FL narrative bodies.** Repointing history converts accurate history into
  a lie (the rule Phase 4 settled). FL-0002's `Component` field still cites the pre-Phase-4
  `05_revit/DEADARMS ADDIN/…` path; the drift doc records the current path beside it rather than
  editing the FL.
- **No gate code.** `sync_gate.mjs` is byte-unchanged; no check name moved, so **no gate-14 re-bless.**

## 8. Successor

> ✅ **CONSUMED 2026-07-31 by [HO-0018](HO-0018_phase6-reviewed-cold-three-false-greens-fixed.md) —
> THE COLD REVIEW BELOW WAS RUN.** Five lanes, as specified. **The documents held** — every citation
> resolves, every `file:line` is right, every link and anchor passes, the §5 correction table is
> sound. **The four `sync_gate` checks did not: three were false greens (FL-0023), two of them in
> checks this entry declares mutant-proved.** All three fixed, widened in place, 89 names unchanged.
> Both worries flagged below were answered: **(1)** "nothing was lost" is **UNPROVABLE** and is now
> recorded as a permanent limitation — and the *unmeasured* direction turned out larger, ~21 KB of
> new prose no fragment attests; **(2)** the 33 repointed paths **all resolve** — that worry is
> disproven. **Resume at Phase 7 via HO-0018, not via this entry.**

> 🚩 **MAYO ASKED FOR A COLD REVIEW OF THIS PHASE BEFORE PHASE 7 STARTS (2026-07-31). DO THAT FIRST.**
> Plan: **`/sdcard/Download/DEDARMS_PHASE6_VERIFICATION_PLAN_2026-07-31.md`** — self-contained,
> 5 read-only lanes, decided shape: **cold multi-lane · lanes read-only + main thread re-derives then
> fixes · correctness AND design.**
> Audit trail it depends on: **`Download/DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/`** (the 20 split
> fragments, `slice.py`, `mutants.sh`, both 89-name lists).
> Rollback that did not exist during Phase 6 and does now:
> **`Download/sld_snapshot_post-phase6_2026-07-31.tgz`** (70 MB, 723 entries, verified readable —
> but **post**-split, so it protects you and does not recover the original).
>
> ⚠️ **The two things that plan says are worst, stated here so they cannot be missed:**
> **(1) this entry's "nothing was lost" claim rests on a CIRCULAR check** — fragments I chose,
> compared against outputs I built from them — and **the pre-split 331-line file exists nowhere**;
> the only oracles are a **222-line pre-Phase-5 ancestor** at
> `Claude Revit SLD Generator/_snapshot_pre_split_2026-07-30/05_revit/DEADARMS ADDIN/CLAUDE.md` and
> the preserved fragments. **(2) the 33 repointed paths were never asserted to RESOLVE ON DISK** —
> the splitter hard-errors on an unmapped basename, but a basename typed into the WRONG bucket
> repoints silently, and that check was never run.

**HO-0016 is `consumed` by this entry.** Its §5 open list and §8's trip guidance carry forward
unchanged; nothing on it was closed here and nothing was added to it.

**Resume at Phase 7** — create the toolkit repo and move. Read the plan's §10 PHASE 7 (sessions 7a and
7b) and **the decision record, which outranks the plan.** Phase 6 leaves Phase 7 in a better
position than the plan assumed:

- `13_addin/` now travels as **hub + `docs/`**, which maps onto a toolkit repo's doc layout directly.
- **The four `sync_gate` consumers are mutant-proved**, so Phase 7 knows exactly which four break when
  `13_addin/` moves out of this repo — and M6 is the rehearsal for that move.
- The drift doc names, per surface, **which repo owns it after the split.**

🚩 **The REVIT TRIP is still the critical path.** Eight items wait on it (HO-0015 §8, with FL-0018
now closed on the phone but unproven on the box), and Phase 7 only adds to the pile.

### Carry these forward

- ⚠️ **FL-0022's rule applies to every future edit of `13_addin/CLAUDE.md`.** The four checks grep
  ordinary English out of a document people are expected to edit. **Any new prose there that discusses
  runtime verification must be assumed to interact with the check until a mutant says otherwise.**
- ⚠️ **Line numbers in this repo's docs go stale silently — six consecutive sessions now.** HO-0016's
  own §8 said `13_addin/CLAUDE.md` was **318 lines with three sha anchors at `:272`/`:273`/`:277`**;
  it was **331 lines with them at `:284`/`:285`/`:289`** when this session opened it. The file is now
  a hub and those numbers are void. **Re-derive the SET; never re-point the numbers.**
- ⚠️ **There is still no git and no rollback.** This phase restructured 84 KB with no undo. **FU-0002
  remains the cheapest risk reduction available** and Phase 7 is a much larger move than this one was.
- ~~The split fragments and the mutant script are in this session's scratchpad only — **they are not
  repo artifacts and will not survive.**~~ **CORRECTED 2026-07-31 (HO-0018): they DID survive.** All
  24 files are at **`Download/DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/`** — the 20 fragments, `slice.py`,
  `mutants.sh` and both 89-name lists — exactly as §8 of this file says. They are still not *repo*
  artifacts (they live under `Download/`, outside the tree, and no gate pins them), but they are the
  **only oracle the "nothing was lost" claim has**, and the review re-ran every mutant from them.
  The documents are the deliverable; the audit trail is the evidence.
