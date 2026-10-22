# HO-0024 — Phase 7b cold review: the three never-red checks were made to go red, and this repo has a mutant harness for the first time

| Field | Value |
|-------|-------|
| **ID** | **HO-0024 (SLD)** — ⚠️ tag the repo; the toolkit sequence is at HO-0003 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation — **the cold review of Phase 7b** |
| **Status** | `open` |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0023 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is still the critical path and this session added nothing to it.** |
| **Exit state** | **SLD 13/13 · sync-gate 14/14 · names 14 FULL / 12 QUICK · `--no-png` 9/9 (first run since `EXPECTED_GATES` changed).** Toolkit **build-gate 15/15 · toolkit-gate 16 FULL · 112 tests · `[T0.3]` 12 warnings.** **Mutants: SLD drop-staleness 12/12 (NEW) · toolkit blessed-embed 9/9 (NEW) · toolkit hub-ledger 14/14 (NEW) · drift 10/10 · .addin 10/10.** Shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` `true` ×3 |
| **New FL** | none. Next SLD FL is still **FL-0024** |
| **New FU** | **FU-0012 (SLD)** — see §6 |

---

## 0. The one line

**All three checks Phase 7b changed and never once observed RED have now been observed RED, by
construction, one wrong state at a time.** The SLD repo has its **first mutant harness of any kind**;
`sync_gate.mjs` had none before today. **No claim HO-0023 made turned out to be false**, and the two
that were weakly proved — C1's file-by-file proof and §4.3's manifest reduction — were re-established
with the evidence they actually needed rather than the evidence that had been quoted for them.

**One real defect found, in the toolkit, and fixed.** One coverage boundary discovered that nobody had
written down, and it is the one the review briefing's own suggested mutant would have walked into.

---

## 1. §0 — the rollback, and the shas

Fresh snapshots taken **before any change**, entry-count-verified against `find | wc -l` and `gzip -t`
clean:

| Tarball | `tar tzf \| wc -l` | `find \| wc -l` | |
|---|---|---|---|
| `Download/sld_snapshot_pre-review7b_2026-07-31.tgz` | 482 | 482 | ✅ |
| `Download/toolkit_snapshot_pre-review7b_2026-07-31.tgz` | 299 | 299 | ✅ |

**The three shipping shas were re-hashed at their carry-copy paths before anything else ran:
`be6ae51a` · `2e86b97d` · `1a3b7ead`, all UNMOVED**, and all three `runtime_unverified` flags are
still `true` in the toolkit manifest. **Nothing in this session touched a sha, a flag, or a `.cs`.**

Baselines captured one suite at a time, never simultaneously: **SLD 13/13 · sync-gate 14/14 ·
names 14/12**; **toolkit build-gate 15/15 · toolkit-gate 16 FULL · `[T0.4] passed=112` ·
`[T0.3] 12 warnings`.** All match HO-0023's exit state exactly.

---

## 2. 🚩 THE SESSION: three checks that had only ever gone green now have mutant arms

HO-0022 §0's lesson was that a check proved in only one direction is unverified in the other. It
found eleven checks that had only ever gone RED. **7b produced the mirror image — one new SLD check,
one new toolkit check, and four toolkit checks re-run after the hub ledger was edited, every one of
them observed only GREEN.** A green line proves the check did not fire; it does not prove the check
*can* fire.

### 2.1 `08_validation/mutants_drop_staleness.mjs` — **NEW, and the first in this repo** — 12/12

Covers `[P1] published_drop shas == the LIVE upstream files (publisher-side staleness)`.
**Ten wrong states, each going red with the right message**, plus a control that is run FIRST and
again LAST so `restore()` is proved rather than assumed:

| | State | Fires |
|---|---|---|
| M1 | the drop copy edited in place | *the published copy was edited in place* |
| M2 | upstream moved on | **UPSTREAM HAS MOVED ON** |
| M3 | a `files` entry with no `sha256` | *a file without a pin is a comment* |
| M4 | a `files` entry with no `source` | *no "source"* |
| M5 | the drop copy deleted | *MISSING from* |
| M6 | `source` pointing at a file that left | *does not exist* |
| M7 | a stray unpinned file in `published_drop/` | *named by no drop_manifest entry* |
| M8 | `drop_manifest.json` unparseable | *is not valid JSON* — **and the gate did NOT crash** |
| M9 | an empty `files` block | *declares no files* |
| M10 | **ISOLATION** — upstream of a file check 1 never sees | **UPSTREAM HAS MOVED ON**, *and check 1 stays GREEN* |

> 🚩 **M10 IS THE ARM THAT MATTERS AND THE BRIEFING WAS RIGHT TO DEMAND IT.** HO-0023 §3.1 declares a
> deliberate overlap: the family map's `source` is `family_map.copies[0]` and `copies[1]` is its drop
> copy, so check 1 and the staleness check compare the same two files. **M1 and M2 therefore prove a
> red is reachable but NOT that it belongs to this check** — check 1 would have reddened on the same
> mutation. M10 mutates the upstream of `sld_topology_schema_V1_0_0.md`, one of the three dropped
> files check 1 never looks at, and asserts the staleness check goes RED **while check 1 stays GREEN
> in the same run**. That pair of assertions is the whole proof that the addition earns its place in
> the count of 14.

**M8 also settles something HO-0023 argued but never demonstrated:** the manifest is parsed *inside*
the check specifically so a malformed one cannot throw at module scope and kill the gate with zero
check lines. M8 is the measurement — the gate printed a normal RED line, not a crash.

⚠️ **The briefing said "eight arms" and then listed nine.** Both counts were low; ten are implemented.
Nothing turns on this, but it is the kind of arithmetic that has bitten this repo before.

### 2.2 The two toolkit harnesses

Written in the toolkit repo and recorded in full in **HO-0003 (toolkit)**; named here only because
7b was one change-set across two repos and neither half is complete alone:
**`mutants_blessed_embed.mjs` 9/9** (`[T3]`) and **`mutants_hub_ledger.mjs` 14/14** (`[T7]` ×4,
every arm asserting which of the four goes red **and that the other three stay green**).

---

## 3. What the review settled, and how

**Every "nothing else changed" claim below rests on `diff -rq` against this session's pre-work
snapshot. `find -newermt` was NOT used for anything** (FL-0021's other half: editing a file here does
not advance its mtime, so it is blind in both directions).

### 3.1 ✅ C1 re-proved PATH-WISE — the review briefing's §3.3 was a real weakness and the claim survives it

HO-0023 §2 proved "198 of 202 byte-identical" by hashing every file and matching **by content against
a set**, not at an expected path. A file that failed to arrive at its destination would still have
scored "present" if its bytes matched anything already in the toolkit — and at least two pairs do
exactly that.

Re-established from `sld_snapshot_pre-phase7b`: **202 files, each mapped old path → expected new path
explicitly, then compared there.**

> **0 MISSING. 0 UNMAPPED. 192 byte-identical AT THE MAPPED PATH. 10 differ.**

**The 10 are the 4 deliberately repointed** (`DEDARMS.Tests.csproj`, `DEDARMS.sln`,
`DEDARMS.Lab.csproj`, `DEDARMS.Replay2023.csproj`) **plus `CLAUDE.md` and five `docs/*.md` — which is
EXACTLY, with nothing left over, the edit list HO-0002 §3's own table declares.** C2's "the four that
differ" was true at the instant it was measured, which is what it said; the other six are the
documentation edits 7b made afterwards and wrote down.

**This also converts C3 from an assertion into a measurement: not one `.cs` file appears among the
differences.** The strongest evidence for "no shipping source was edited" is now a hash comparison
rather than a statement of intent.

### 3.2 ✅ §4.3 — the manifest reduction confirmed by GREP, not by argument

HO-0023 §3.4 deleted `addin_lab_dll`, `replay2023_dll`, `addin_tests` and most of `addin_dll` on the
grounds that "every check that read them left" — **derived by reading the removal list.** A live
reader of a deleted field is a crash, not a red, and `sync_gate` parses the manifest at module scope.

Grepped repo-wide over **every `.mjs`, `.sh`, `.py` and `.js`** for `addin_lab_dll`,
`replay2023_dll`, `addin_tests`, `hardcoded_resource_names`, `carry_copies`, `revit_addin_ids`:

> **Two hits, both `#` comment lines in `run_all_gates.sh` explaining the deletion. Zero live
> readers. `hardcoded_resource_names` and `revit_addin_ids` have zero hits anywhere.**

### 3.3 ✅ §4.6 — `--no-png` run for the first time since `EXPECTED_GATES` changed: **9/9**

13 − 4 (G5/G6/G7/G9) = 9, and the runner agrees. A wrong arithmetic there would have been a SUITE RED
nobody had seen. It was right.

### 3.4 ✅ §4.8 — the `.cs` count settled by counting

The old SLD build gate printed **100**; the toolkit build gate prints **88**. HO-0023 reasoned the
difference was `DEDARMS.Tests`' 12 files, now counted outside `src/`, and never measured it.
**Measured: `src/` 88 · `tests/` 12 · total 100.** Exact. Nothing failed to arrive.

### 3.5 ✅ C4 — the nested `deploy/` copies

`find src -type d -name deploy` → **0**. HO-0022 §2.3's trap did not spring.

### 3.6 The three `04_renderer/snapshots_*` JSONs

`diff -rq` flags them against the snapshot; **inspected line by line, and the diff is one
`"generated"` timestamp per file and nothing else** — the known G6 side effect HO-0023 §5 named,
reproduced independently here rather than taken on trust.

---

## 4. Verified vs assumed

**Verified by running it:** everything in §1–§3, both suites at the numbers in the header, all five
mutant harnesses, and `diff -rq` on both repos showing the ONLY changes this session made are the
three new harness files plus one line in a toolkit oracle (§3 of HO-0003).

**Assumed / NOT verified — read this before trusting the green:**

- ⚠️ **No claim about Revit.** None of the three assemblies has ever run inside it. **Unchanged.**
- 🚩 **THE THREE NEW HARNESSES ARE NOT INVOKED BY EITHER GATE SUITE.** They are run by hand, exactly
  like the two that already existed. That is consistent, and it is also the shape this repo keeps
  logging — **a harness nobody runs is a harness that rots.** Wiring them in changes gate counts and
  needs a deliberate re-bless, which is not a review session's call. → **FU-0012 (SLD)**.
- ⚠️ **The harnesses prove the checks FIRE. They do not prove the checks are SUFFICIENT.** Ten arms
  is ten arms; the eleventh wrong state nobody thought of is still out there.
- ⚠️ **`sync_gate.mjs` is 291 lines by `wc -l`; HO-0023 §3.1 says 292.** Trailing-newline arithmetic,
  nothing turns on it — logged only because line numbers in this repo have gone stale silently for
  nine consecutive sessions now.

---

## 5. What this session did NOT do — the briefing's lanes B–F are largely still open

Lane A was the session, as instructed, and it is complete. **These remain, and §3.2 of the review
briefing is the one that matters:**

- 🚩 **`00_Docs/drift_surfaces_V1_0_0.md` items 2 and 3 are STILL NOT DONE.** HO-0021's carry-forward
  assigned them to 7b; 7b skipped them; this session did not pick them up either. **The document
  still cites four `13_addin/` paths and a set of `.cs` files that live in another repo**, and the
  toolkit carries only a stub that deliberately restates no values — **so if this rots, nothing else
  holds that content.** This is now a named obligation skipped by two consecutive sessions.
- **Not done:** the full `.md` sweep of both repos for broken tables and unresolved relative links
  (§4.2); the `describes_artifact` check-or-declare-uncheckable decision (§4.4); the
  `embeds_map_sha256` lockstep design question weighed against errata E9 (§4.5 — **do not just add
  the field**); `.vscode/mcp.json` placement ratification (§4.7); the two provenance rows (§4.9); the
  drift harness's hardcoded absolute import (§4.10); whether HO-0022 §7's superseded lab recipe is
  discoverably marked (§4.11); and **testing FU-0005's reasoning rather than its list (§4.12)**.

---

## 6. Successor — what is next

**Phase 8: the SLD living docs**, unchanged and still deliberate. Re-derive the set with
`grep -ral 13_addin` on the day; do not trust any list. **Then Phase 9 — THE REVIT TRIP, the critical
path.**

**Open follow-up raised here: FU-0012 (SLD)** — decide whether the five mutant harnesses should be
invoked by their suites or explicitly declared manual-only, in both repos, in one change-set.

### Carry forward

- 🚩 **THE REVIT TRIP IS THE CRITICAL PATH.** Eight items wait on it. Carry the 2023 replayer via a
  **sync client, never a browser download** — mark-of-the-web gives `HRESULT 0x80131515` on net48.
- 🚩 **NEITHER SUITE CAN SEE THE OTHER REPO.** The drop is the only seam. **"All gates green" means
  half as much unless you ran both — and never run two at once.**
- ✅ **The staleness check, `[T3]` and `[T7]`×4 can now be proved to fire.** Run the harness that
  covers a check **after any edit to it**, against a lab, never the real tree:
  `SLD_LAB=/root/sld_lab node 08_validation/mutants_drop_staleness.mjs`.
- ⚠️ **Still no git.** SLD-repo FU-0002 stays **declined** (2026-07-31) and was not re-raised.
- ⚠️ **Two ID sequences.** Next: **HO-0025 / FL-0024 / FU-0013 (SLD)**; **HO-0004 / FL-0003 /
  FU-0006 (toolkit)**. **Never write a bare number.**
- ⚠️ **`bash script.sh` never `./`** · **`grep -a` always** · **`flock --close` with `dotnet`** ·
  `DOTNET_GCHeapHardLimit=0x60000000 DOTNET_EnableWriteXorExecute=0` · **`diff -rq` against a
  snapshot, never `find -newermt`.**

**HO-0023 is `consumed` by this entry.**
