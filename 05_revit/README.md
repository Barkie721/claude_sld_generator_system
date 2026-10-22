# `05_revit/` — the seam, and why this directory is empty

**Written 2026-07-31 by separation Phase 7b.** This directory is deliberately empty of code. It
exists to answer the question a reader arrives with: *"where did the Revit add-in go?"*

---

## What left, and where it went

| Was here | Is now |
|---|---|
| `05_revit/Revit Addins/…` (until Phase 4, 2026-07-30) | promoted to `13_addin/`, then **moved out entirely** |
| `13_addin/Revit Addins/{DEDARMS, DEDARMS.Lab, DEDARMS.Replay2023}` | `DEDARMS Revit Toolkit/src/<project>/` |
| `13_addin/Revit Addins/DEDARMS.Tests` | `DEDARMS Revit Toolkit/tests/DEDARMS.Tests/` |
| `13_addin/Revit Addins/*/deploy/` | `DEDARMS Revit Toolkit/deploy/` — **at the repo root, not nested** |
| `13_addin/CLAUDE.md` + `13_addin/docs/` | `DEDARMS Revit Toolkit/CLAUDE.md` + `docs/` |
| `05_revit/check_capture_complete.py` | `DEDARMS Revit Toolkit/tools/` |
| `05_revit/diff_replay_csv.py` | `DEDARMS Revit Toolkit/tools/` |
| `05_revit/compare_placement.py` | `DEDARMS Revit Toolkit/tools/` |
| `08_validation/build_gate.sh` (gate 13) | `DEDARMS Revit Toolkit/08_validation/toolkit_build_gate.sh` |
| `08_validation/lib/dll_embed_V1_0_0.mjs` | `DEDARMS Revit Toolkit/08_validation/lib/` |

The toolkit repo is the private GitHub repository `Barkie721/revit_dedarms_toolkit_system`. **It is
not cloned on this machine** (checked 2026-10-04): every `DEDARMS Revit Toolkit/…` path in the table
above is a path inside that repository, not a local folder.

---

## 🚩 The seam is the DROP, and it is the ONLY seam

`03_contracts/published_drop/` is the single interface between the two repos. This repo is the
**publisher**; the toolkit is the **consumer** and may never edit a dropped file.

```
07_data/normalized/…family_map    ==  published_drop copy         sync_gate check 1  (here)
published_drop                    ==  the toolkit's 01_contracts/  toolkit T1        (there)
the toolkit's import              ==  what the fresh DLL embeds    toolkit T4        (there)
```

Four files travel: the family map, the topology schema, the hospital golden, and (since
2026-10-20, for pyDEDARMS) the clinic topology. `drop_manifest.json` pins all four and carries D4a's `drift_coverage` block.

**Two staleness checks, deliberately in different repos.** The toolkit's `T1` asserts its imported
copy still hashes to the pin — that catches local tampering. `sync_gate`'s
`published_drop shas == the LIVE upstream files` asserts the drop still tracks upstream — that
catches *"upstream moved on, the consumer did not"*, and **only the publisher can see it.**

> ⚠️ **NO CHECK IN EITHER REPO READS A FILE IN THE OTHER ONE.** That is not tidiness. A check that
> reaches into a sibling repo passes vacuously on any machine where the sibling is absent — green
> because it could not look, which is FL-0009's entire lesson. `ADDIN_ROOT` was the last thing here
> that could have become such a read, and decision **D-A** deleted it rather than repoint it.

**ON A DROP MISMATCH: WARN LOUDLY, NEVER AUTO-SYNC.** Copying a family-map change into the drop
without rebuilding the DLL that embeds it is FL-0001's exact class. Re-publishing is a deliberate
act with its own change-set.

---

## What this repo can and cannot tell you now

- ✅ It still owns the family map, the topology schema, the golden
  case, the engine, the renderer and the PNG baselines. `bash run_all_gates.sh` → **13 gates**.
- ❌ **It compiles nothing.** Gate 13 was deleted with its subject. A green suite here is silent
  about the add-in in exactly the way the pre-FU-0011 "12/12 green" was — the difference being that
  the add-in now has its own suite, which must be run in its own repo:
  `bash 08_validation/run_toolkit_gates.sh`.
- ❌ It holds no DLL, no `.addin`, no installer and no shipping sha. The toolkit's
  `01_contracts/toolkit_manifest.json` is the sole authority for all of those.
- ⚠️ **The one add-in fact this repo still keeps is the map↔DLL lockstep**, at
  `artifacts.addin_dll.embeds_map_sha256` in `03_contracts/current_state_manifest.json` — kept here
  by errata E9 because this side publishes the map and is the only side that can know the map has
  moved on. Every other field on that slot was deleted rather than left behind. **On this side it
  is now maintained by hand: nothing here can catch you forgetting to re-bless it after a toolkit
  rebuild moves the embed.**

---

## Historical citations

`10_failure_log/`, `11_future_updates/` and `12_handoff/` are a log of what was true when written.
They cite `05_revit/…` and `13_addin/…` paths freely and **are not repointed** — rewriting history
to match the present turns accurate history into a lie (settled in Phase 4). Read a path in those
files as *"where it was then"*, and use the table above to find it now.

✅ **PHASE 8 IS DONE (2026-07-31): every living SLD document has been repointed.** The set was
**re-derived** on the day with `grep -ralI 13_addin`, not taken from the enumerated list in HO-0023
§6 — which was right to say "do not trust this list", because the re-derivation turned up **three
files the list did not name**, including this one.

**Every surviving `13_addin/` string in a living document is deliberate.** Re-derived 2026-08-03 with
`grep -rln 13_addin` excluding `10_/11_/12_`; the living hits fall into these kinds:

1. a **was → is** sentence, like the table above — history plus its destination (`CLAUDE.md`,
   `README.md`, `run_all_gates.sh`, `00_Docs/drift_surfaces_V1_0_0.md`, this file); or
2. a citation inside the runbook's **dead gate-13 block**, kept whole under a banner because its
   measurements are still true and were expensive, and deleting them would destroy the record of
   *why* the toolkit's build gate is shaped the way it is; or
3. **line-number corrections about `13_addin/CLAUDE.md`** inside
   `00_Docs/dedarms_separation_decisions_V1_0_0.md` (`:574`, `:602`, `:603`, `:610`) — a Phase-3
   decision record that is arguably history but lives in `00_Docs/`, not in `10_/11_/12_`; or
4. **quotations inside `00_Docs/staleness_audit_2026-08-02.md`**, a report that post-dates this
   paragraph and quotes the sites it audited.

> ⚠️ **THIS PARAGRAPH SAID "one of exactly two kinds" UNTIL 2026-08-03** (audit **B6**, swept by
> **FU-0014**). Kinds 3 and 4 fit neither, so **the enumeration asserted a completeness it did not
> have.** The finding was the word *"exactly"*, not any of the files. **An enumeration that claims to
> be complete is what a later session trusts without re-deriving** — which is the failure mode this
> whole page exists to prevent. The list above is dated and derived; **re-derive it, do not trust it.**

⚠️ **The dropped contract files are the exception, and they still cite `13_addin/` on purpose.**
`03_contracts/sld_topology_schema_V1_0_0.md` is published to the toolkit and
is pinned by sha in `published_drop/drop_manifest.json`. **Editing one moves its sha and breaks the drop
pin, the toolkit's `[T1]`, and this repo's publisher-side staleness check.** Fixing them is a
**re-publish**, not an edit — a deliberate change-set of its own.
