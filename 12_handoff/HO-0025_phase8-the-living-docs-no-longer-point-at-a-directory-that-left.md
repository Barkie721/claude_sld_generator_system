# HO-0025 — Phase 8: the living docs no longer point at a directory that left, and the obligation two sessions skipped is closed

| Field | Value |
|-------|-------|
| **ID** | **HO-0025 (SLD)** — ⚠️ tag the repo; the toolkit sequence is at HO-0003 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation — **Phase 8, the SLD living docs** |
| **Status** | **`consumed`** by **HO-0026 (SLD)**, 2026-08-01 |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0024 — now `consumed`** |
| **Blocked on** | nothing on the phone. **Phase 9, the Revit trip, is the critical path and is the only thing left in this stream.** |
| **Exit state** | **SLD 13/13 · sync-gate 14/14 · names 14 FULL / 12 QUICK · staleness check green on all four dropped files · drop-staleness mutants 12/12.** Toolkit untouched this session. Shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` `true` ×3 |
| **New FL** | none. Next SLD FL is still **FL-0024** |
| **New FU** | none. Next SLD FU is still **FU-0013** |

---

## 0. The one line

**No living document in this repo points at `13_addin/` as though it still existed**, and
`00_Docs/drift_surfaces_V1_0_0.md` items 2 and 3 — assigned to Phase 7b, skipped by 7b, skipped
again by 7b's cold review — **are closed.** Folding them into Phase 8 is what finally got them done,
because they were always the same job.

**Seven documents edited. No gate script, no manifest, no contract, no dropped file, no `.cs`.**

---

## 1. §0 — the rollback

`Download/sld_snapshot_pre-phase8_2026-07-31.tgz` — **485 entries, equal to `find | wc -l`**,
`gzip -t` clean, taken before any change. ⚠️ **Still no git.** SLD-repo FU-0002 stays declined.

---

## 2. 🚩 THE SET WAS RE-DERIVED, AND THE ENUMERATED LIST WAS WRONG — AS IT SAID IT WOULD BE

HO-0023 §6 listed the Phase 8 set as `CLAUDE.md`, `README.md`, `00_Docs/{repo_runbook,
project_instructions, dedarms_separation_decisions, drift_surfaces}` and
`02_specs/symbols/sld_system_model`, and told its successor **"re-derive it with `grep -ral 13_addin`
on the day; do not trust this list."**

**That instruction paid.** `grep -ralI 13_addin` returned **three files the list did not name**:

| Not in the list | What it was |
|---|---|
| `03_contracts/current_state_manifest.json` | a `copies[1]` provenance note — **correct as written, left alone** |
| `run_all_gates.sh` | a comment explaining the `--no-build` deletion — **correct, left alone** |
| **`05_revit/README.md`** | **the seam doc — and it carried the line declaring Phase 8's own scope** |

The third is the one that mattered: **the document that tells a reader where everything went was
itself outside the list of documents to check.**

---

## 3. What was edited, and the rule applied

**Every surviving `13_addin/` string in a living document is now deliberate**, and is one of exactly
two kinds: a **was → is** sentence (history plus its destination), or a citation inside the runbook's
**dead gate-13 block**, which is kept whole under a banner.

| File | What changed |
|---|---|
| `CLAUDE.md` | 6 sites — the add-in docs pointer (**and it is a REPO now, not a folder**), the `05_revit/` row, the components-table row, the pipeline sentence, the "current DLL sha" pointer, §10's header. **Corrected `six feature documents` → SEVEN** |
| `README.md` | the directory tree — `05_revit/` reduced to its README, **the `13_addin/` node removed and replaced by a gone-note**, the tree's closing branch restored, the §4 layer-name list, and the shipped-code sentence |
| `00_Docs/repo_runbook_V1_0_0.md` | the largest job — see §4 |
| `00_Docs/drift_surfaces_V1_0_0.md` | the fold — see §5 |
| `00_Docs/project_instructions_V1_0_0.md` | the downstream-add-in pointer |
| `02_specs/symbols/sld_system_model_V1_0_0.md` | the `SymbolDims.cs` mirror, now marked cross-repo and uncheckable |
| `05_revit/README.md` | the Phase 8 scope line replaced by the completion record + the dropped-file exception |

**Deliberately NOT touched:**

- ⚠️ **`03_contracts/{sld_topology_schema, sld_replay_package}_V1_0_0.md` still cite `13_addin/`, on
  purpose.** They are **DROPPED FILES**, pinned by sha in `published_drop/drop_manifest.json`.
  **Editing one moves its sha and breaks the drop pin, the toolkit's `[T1]` and this repo's
  publisher-side staleness check. Fixing them is a RE-PUBLISH, not an edit.** Proof they were not
  touched: the staleness check still reports all four dropped files at their pinned shas
  (`b72edd8b`, `259a8984`, `df7cfc4f`, `85b57c19`).
- `10_failure_log/`, `11_future_updates/`, `12_handoff/` — **history, not repointed.**
- `00_Docs/dedarms_separation_decisions_V1_0_0.md` — its four hits are past-tense measurements of
  what the add-in hub looked like during Phase 6. **A decision record describing a past state is
  accurate; repointing it would make it false.**

---

## 4. The runbook was worse than stale — it documented a gate that does not exist

`00_Docs/repo_runbook_V1_0_0.md` was not merely citing dead paths. **It described a 14-gate suite
whose gate 13 compiled C#, and offered a `--no-build` flag to skip it.** Both were deleted by 7b.

- `## 4. The 14-gate regression suite` → **13**, with a banner naming what left and why **gate 14
  kept its number** (renumbering would repoint every "gate 14" citation at a gate that never existed).
- `./run_all_gates.sh --no-build` **removed from the command block** — the flag is gone, and a
  documented flag that does not exist is worse than an undocumented one.
- `--no-png` annotated **(9/9)**, measured.
- The headline status line said **"14 gates … + sync 24/24"**. Both wrong: it is **13** and
  **14/14**. A wrong headline number in the first 40 lines of the runbook is the most expensive kind
  of staleness there is.
- The gate-13 row deleted from the gate table; the "no G2/G3/G4" note rewritten.

> 🚩 **THE DEEP GATE-13 BLOCK (~110 LINES) WAS KEPT, UNDER A BANNER, NOT DELETED.** It carries the
> structural climb depth, T0.6's lab-vs-real-golden test, the RootNamespace trap and seven mutant
> proofs — **all still true, all expensive, all now describing the toolkit's build gate.** The banner
> says plainly: *do not run any command in it against this repo*, its `SLD_ADDIN_ROOT`/`ADDIN_ROOT`
> references are dead here (`ADDIN_ROOT` was deleted outright by **D-A**), and the live procedure is
> the toolkit's `docs/ops_build_and_test.md`. **Deleting it would destroy the record of WHY the
> toolkit's gate is shaped the way it is.**

Also corrected in passing: the doc-index rows (the hub's four readers are the toolkit's `[T7]` now,
**not** `sync_gate` checks), the repo tree, the build command's `cd`, the family-map "two copies"
row (**`copies[1]` is the drop now, not the embedded resource**), the arrival-ID example, and the
token-budget section (**two repos, seven docs, not six**).

---

## 5. ✅ The fold: `drift_surfaces_V1_0_0.md` items 2 and 3 are CLOSED

**Item 2 — re-home the checks that follow the artifact (D5, D8a).** The work had happened in 7b and
**the document had never been told**, which is its own small instance of the drift it exists to
describe. Now recorded as a was→is table: checks 3/4/8/11 → toolkit `[T3]`, 5 → `[T10]`, 6/7 →
`[T6]`, 12/21/22 → `[T7]`, 10 **deleted** (D-A), gate 13 → the toolkit build gate. **And the one that
did NOT move is named with its cost**: the map↔DLL lockstep stayed here per **E9** because it compares
two manifest fields, so on this side `embeds_map_sha256` is now hand-maintained with nothing local to
check it against.

**Item 3 — re-derive every `file:line`.** Done by command, against the files at their new home.

> ✅ **ALL THIRTEEN CITATIONS WERE STILL CORRECT.** `AlignTables.cs` `:93`/`:149` ·
> `DevicePlacer.cs` `:742`/`:744`, `:100-108` · `FedEdgeExtender.cs` `:32`, `:161-167` ·
> `EquipmentLabelPlacer.cs` `:103`, `:111` · `SymbolDims.cs` `:33`, `:7` · `FamilyResolver.cs`
> `:417-420` · `sld_system_model_V1_0_0.md:10`.
>
> **That is not luck, and the document now says why: 7b moved 202 files without editing a single
> `.cs`, so the paths rotted and the line numbers did not.** The document also says not to
> generalise it — **the next rebuild is when they move.**

The four C#-side rows and two FL rows now read `DEDARMS Revit Toolkit/src/DEDARMS/…` and are marked
**(other repo)**. A banner at the top of the document states the thing that makes it the most exposed
file in either repo: **these are cross-repo, line-numbered citations and NO GATE ANYWHERE CAN CHECK
ONE OF THEM.** The toolkit carries only a value-free stub pointing here, so if this rots, nothing
else holds the content.

The section heading *"What Phase 7 owes this document"* was **kept as written** — three documents
cite it by name, and renaming it to match the phase that actually did the work would repoint those
citations at a section that never existed. A status line above it records that all three items are
closed, and that items 2 and 3 were skipped twice before Phase 8 picked them up.

---

## 6. Verified vs assumed

**Verified by running it:**
- **SLD 13/13 · sync-gate 14/14 · names 14/12**, after the edits.
- The **publisher-side staleness check green on all four dropped files at their pinned shas** — the
  positive proof that no dropped contract file was touched.
- **`mutants_drop_staleness.mjs` 12/12** re-run against a fresh lab built from the edited tree.
- **`diff -rq` against `sld_snapshot_pre-phase8`.** The complete change list is **seven documents,
  this handoff, and the three `04_renderer/snapshots_*` JSONs** — the last inspected line by line
  and differing **only** in a `generated` timestamp, the known G6 side effect.
- **`find -newermt` was NOT used for any what-changed claim** (FL-0021's other half).
- The re-derived sweep: every remaining `13_addin` string in a living document was read and
  classified, not counted. **Read the hits; do not count them.**

**Assumed / not verified:**
- ⚠️ **No claim about Revit.** Nothing here advanced the trip.
- 🚩 **NOTHING GATES ANY OF THIS.** No check in this repo asserts that a living document's paths
  resolve. Phase 8's work is prose, and **prose is exactly what this repo has watched rot nine
  sessions running.** The `13_addin` sweep is cheap and repeatable — `grep -ralI 13_addin` — but
  today it is a thing a person remembers to do, not a thing a gate does.
- ⚠️ **The runbook's dead gate-13 block is now the largest stretch of deliberately-preserved
  not-applicable-here text in the repo.** It is banner-marked, but a reader who skims into its
  middle sees confident instructions. **That risk was taken knowingly** — the alternative was
  deleting measurements that cost four sessions to obtain.
- ⚠️ **Line numbers cited in the runbook and the decision record were NOT re-derived** — only
  `drift_surfaces`' thirteen were, because item 3 named that document specifically.

---

## 7. Successor — what is next

🚩 **PHASE 9 — THE REVIT TRIP. It is the only thing left in this work stream and it is the critical
path.** Eight items wait on it; none of the three shipping assemblies has ever run inside Revit.
**Carry the 2023 replayer via a SYNC CLIENT, never a browser download** — mark-of-the-web gives
`HRESULT 0x80131515` on net48. Resume the trip itself from **HO-0005** (SLD Replay work stream).

⚠️ **On the day, run the toolkit's `mutants_hub_ledger.mjs` M3 arm.** It is the one that proves the
gate will actually catch a half-cleared `runtime_unverified` flag — the exact mistake a trip makes
possible, and the flags must clear in `CLAUDE.md` **and** `toolkit_manifest.json` in one change-set
or the gate fails by construction.

**Open follow-ups:** **FU-0012 (SLD)** / **FU-0006 (toolkit)** — the five mutant harnesses are
invoked by nothing. Decide, and record it in **both** repos.

### Carry forward

- 🚩 **NEITHER SUITE CAN SEE THE OTHER REPO.** The drop is the only seam. **"All gates green" means
  half as much unless you ran both — and never run two at once.**
- 🚩 **THIS SUITE COMPILES NOTHING.** 13 gates, all Node/Python. The add-in builds only in the
  toolkit repo.
- ⚠️ **The dropped contract files still cite `13_addin/` and must stay that way until a deliberate
  re-publish.** Editing one is not a doc fix; it moves a sha and reddens three checks.
- ⚠️ **Still no git.** SLD-repo FU-0002 declined 2026-07-31, not re-raised.
- ⚠️ **Two ID sequences.** Next: **HO-0026 / FL-0024 / FU-0013 (SLD)**; **HO-0004 / FL-0003 /
  FU-0007 (toolkit)**. **Never write a bare number.**
- ⚠️ **`bash script.sh` never `./`** · **`grep -a` always** · **`flock --close` with `dotnet`** ·
  **`diff -rq` against a snapshot, never `find -newermt`.**

**HO-0024 is `consumed` by this entry.**

---

> ### ✅ CONSUMED 2026-08-01 by **HO-0026 (SLD)**
>
> **Everything this entry left on the phone is still true and still owed** — Phase 9, the Revit
> trip, remains the critical path for the DEDARMS-separation stream, the three shipping shas are
> **unmoved** and `runtime_unverified` is still `true` ×3. **HO-0026 started a different work
> stream** (FU-0008, the engine's extent measurement) and touched no `.cs`, no dropped contract
> file and nothing in the trip bundle.
>
> ⚠️ **Two numbers in this entry's exit line MOVED under it, in the way this register keeps
> warning about.** `behavior_test.mjs` went **43 → 52 checks** and the golden's PNG baselines were
> **deliberately re-blessed** (golden refreeze batch 2). The gate COUNTS quoted here are unchanged
> — **13/13 · sync 14/14 · names 14/12** — so this line still reads as correct while two of the
> artifacts behind it are new. Read HO-0026 §2 before quoting any of it.
