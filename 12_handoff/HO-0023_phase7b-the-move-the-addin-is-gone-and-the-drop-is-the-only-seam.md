# HO-0023 — Phase 7b: the move. The add-in is gone from this repo, the drop is the only seam, and the irreversible half is done

| Field | Value |
|-------|-------|
| **ID** | HO-0023 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | `open` |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0022 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is the critical path and Phase 7 added nothing to it.** |
| **Exit state** | **SLD repo 13/13 · sync-gate 14/14 · check names 14 FULL / 12 QUICK · 0 FAIL · compiles nothing, by design.** Toolkit **build-gate 15/15 · toolkit-gate 16 FULL / 15 QUICK · 112 tests · mutants 10/10 + 10/10.** Shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` ×3 |
| **New FL** | none. Next SLD FL is still **FL-0024** |
| **New FU** | **FU-0005 (toolkit)** — see §6 |

---

## 0. The one line

**`13_addin/` no longer exists in this repo.** The three shipping projects, the test project, both
installers, the four `.addin` manifests, the hub, the seven feature docs, the three Python oracles,
`build_gate.sh` and `lib/dll_embed_V1_0_0.mjs` are all in
`Mayo_Claude_Workspace/DEDARMS Revit Toolkit`. **Eleven `sync_gate` checks and gate 13 were deleted
here in the same change-set that landed them there**, so no fact has two homes.

**Both suites are green and neither one reports on the other. That is the whole point and it is also
the whole risk.**

---

## 1. §0 — the rollback that exists

Gates were run **first** so `bin/obj` settled, then both snapshots, entry-count-verified:

| Tarball | Entries | `find \| wc -l` | |
|---|---|---|---|
| `Download/sld_snapshot_pre-phase7b_2026-07-31.tgz` | 736 | 736 | ✅ `gzip -t` OK |
| `Download/toolkit_snapshot_pre-phase7b_2026-07-31.tgz` | 46 | 46 | ✅ `gzip -t` OK |
| `Download/sld_snapshot_post-phase7b_2026-07-31.tgz` | 482 | 482 | ✅ `gzip -t` OK |
| `Download/toolkit_snapshot_post-phase7b_2026-07-31.tgz` | 299 | 299 | ✅ `gzip -t` OK |

Baseline before any change: **SLD 14/14 · build-gate 15/15 · 112 tests · D7 24 FULL / 22 QUICK**, the
three shas re-hashed and unmoved. ⚠️ **There is still no git. These four files are the entire
rollback.** SLD-repo FU-0002 (git) was **not** re-raised — declined by Mayo 2026-07-31.

---

## 2. What moved, proved file by file

**`cp -a` → verify → `rm -rf`, never `mv`.** Before a single deletion:

> **202 files under `13_addin/`. 198 have a BYTE-IDENTICAL twin in the toolkit. The four that do not
> are exactly the four I deliberately repointed** — `DEDARMS.Tests.csproj`, `DEDARMS.sln`,
> `DEDARMS.Lab.csproj`, `DEDARMS.Replay2023.csproj`. Proved by hashing every file on both sides and
> matching by content, not by path — the layout changed, so a path-wise diff could not have said it.

| Was | Is |
|---|---|
| `13_addin/Revit Addins/{DEDARMS, DEDARMS.Lab, DEDARMS.Replay2023}` | `src/<project>/` |
| `13_addin/Revit Addins/DEDARMS.Tests` | `tests/DEDARMS.Tests/` |
| `13_addin/Revit Addins/*/deploy/` | **`deploy/` at the toolkit ROOT** |
| `13_addin/Revit Addins/Directory.Build.props` | **the toolkit ROOT** |
| `13_addin/Revit Addins/{DEDARMS.sln, .editorconfig, .vscode/}` | `src/` |
| `13_addin/{CLAUDE.md, docs/}` | the toolkit root + `docs/` |
| `05_revit/{check_capture_complete, diff_replay_csv, compare_placement}.py` | `tools/` |
| `08_validation/build_gate.sh` | `08_validation/toolkit_build_gate.sh` (ported by 7a) |
| `08_validation/lib/dll_embed_V1_0_0.mjs` | the toolkit's `08_validation/lib/` |

**The nested `src/<proj>/deploy/` copies did NOT survive** — HO-0022 §2.3's trap, verified by `find`
after the move: zero hits. **`[T0.3]` reads `12 warnings`**, which is the props-file tell; 24 would
have meant it was misplaced.

### 2.1 The four repointed files, and the one that mattered

`DEDARMS.Tests.csproj` — 21 source links repointed `..\<proj>\` → `..\..\src\<proj>\`, and **the
golden climb is GONE**: `..\..\..\09_tests\Hospital Example (Golden Case)\…__WITH_GEOMETRY.json`
became `..\fixtures\hospital_golden.json`. **The rewrite was deliberately line-for-line and the file
is still 95 lines**, as Phase 5a's was. The climb's depth was STRUCTURAL — wrong depth was `MSB3030`
except in a mutant lab, where it **silently read the REAL golden and scored a full green**
(FL-0019 e). That failure mode is now unreachable; what replaces it is three sha pins.

`DEDARMS.sln` — the Tests project path became `..\tests\…`. The other three are unchanged, because
`src/` reproduces the old `Revit Addins/` layout exactly for them.

The two shipping csprojs — **comments only**, `../Directory.Build.props` → `../../`. MSBuild finds
the file by walking up regardless; the citations would have been false.

> ⚠️ **NO `.cs` FILE WAS EDITED. NOT ONE.** Four of them cite SLD-repo paths that no longer resolve
> and it was tempting. **Editing a shipping source decouples the blessed DLLs from the tree they were
> built from, and NOTHING in either gate would catch it** — both assemblies are build-location
> dependent, so no gate compares a built sha to a pinned one. The three shas are exactly what the
> owed Revit trip exists to validate. Filed as **FU-0005 (toolkit)**, to ride along with the next
> legitimate rebuild.

---

## 3. The gate surgery — 11 removals + 1 addition, and gate 13

### 3.1 `sync_gate.mjs`: 878 lines → 292

Deleted, and **the diff printed exactly this before the re-bless**, in both modes:

| # | Check removed | Its home now |
|---|---|---|
| 3 | add-in DLL carry copies | toolkit `[T3]` |
| 4 | Replay2023 DLL carry copies | toolkit `[T3]` |
| 5 | Revit `.addin` manifests well-formed | toolkit **`[T10]`** (FU-0002 toolkit — **not** T5) |
| 6 | `install_replay2023.ps1` pin | toolkit `[T6]` |
| 7 | `install_dedarms.ps1` pins | toolkit `[T6]` |
| 8 | DLL embed == manifest `embeds_map_sha256` (honesty) | toolkit **`[T3]`, new — see §3.3** |
| **10** | **`ADDIN_ROOT` resolves** | **DELETED, not re-homed — decision D-A** |
| 11 | blessed carry-copy resource names (D8a) | toolkit `[T3]` |
| 12 | `runtime_unverified` prose | toolkit `[T7]` |
| 21 | add-in CLAUDE.md shipping DLL sha anchor | toolkit `[T7]` |
| 22 | add-in CLAUDE.md Replay2023 sha anchor | toolkit `[T7]` |

**The eleventh removal — the one D-A adds on top of HO-0021 §7.1's ten — is check 10,
`[P1] ADDIN_ROOT resolves to a real add-in directory`.** Named here because the re-bless demands it.
`ADDIN_ROOT` and `ADDIN_CLAUDE_MD` were deleted with it; the `path.isAbsolute` passthrough in `abs()`
was **kept and is now inert**, with its comment rewritten to say so — removing it would be a
behaviour change to every path this gate resolves, not a cleanup.

**KEPT: check 9, the map↔DLL lockstep.** It compares two manifest fields and never opens a DLL, so
its subject did not leave (E9). **Check 1 keeps its `×2`** — `copies[1]` now points at the drop copy
per §7.2, not at the moved tree, so there is no cross-repo filesystem read.

**ADDED, at the end of phase 1 (E1's placement rule):
`[P1] published_drop shas == the LIVE upstream files (publisher-side staleness)`.** It asserts each
dropped file still hashes to its pin **and** that its live upstream `source` still hashes to the
same, plus a stray-file sweep of `published_drop/`. **It reads only local files, so there is no
machine on which it can soft-skip** — which was E9's whole objection to the drafted alternative.

**Arithmetic: 24 − 11 + 1 = 14 FULL, 22 − 11 + 1 = 12 QUICK.** Both baselines re-blessed
deliberately, in this change-set. **This is D-A's number, not HO-0021 §7.1's 15/13**, which assumed
check 10 stayed and said so.

### 3.2 🚩 GATE 13 WAS DELETED, AND NO PLAN DOCUMENT SAID TO

`08_validation/build_gate.sh` compiled `13_addin/`. Its subject left entirely, so it was deleted,
together with `--no-build`, the `addin_tests` manifest slot, and `lib/dll_embed_V1_0_0.mjs` (whose
only two consumers were gate 13 and the two sync_gate checks that went).

**The separation plan is silent on this because it predates the gate.** Its Part 2 says *"the 12-gate
suite does not compile C# at all"* — true when written; FU-0011 added gate 13 on 2026-07-30, five
sessions later. **Same class of staleness as the removal list**, which is why HO-0021 §7.1 re-derived
that list against today's 24 checks rather than trusting the plan's 20-check numbering. Derive, do
not inherit.

- `run_all_gates.sh` is now **13 gates** full / **6** quick. `EXPECTED_GATES` updated — without it a
  deleted gate reads as a smaller green (FL-0017).
- **`--no-build` was REMOVED, not kept as a no-op.** A flag that silently does nothing is the exact
  shape this repo keeps logging.
- **Gate 14 KEEPS ITS NUMBER.** Sliding the check-name baseline down to 13 to close the hole would
  repoint every "gate 14" citation at a gate that never existed — the identical failure the
  arrival-ID rule exists to prevent.

> 🚩 **THIS SUITE NOW COMPILES NOTHING, and a green run here is silent about the add-in in exactly
> the way "12/12 green" was before FU-0011.** The difference is that the add-in has its own suite in
> its own repo. **Two repos, two suites, neither reports on the other.** Written into
> `run_all_gates.sh`'s header, into `05_revit/README.md`, and into the toolkit's ops doc, because a
> reader who runs one suite and reads "ALL GATES GREEN" has been told something narrower than it looks.

### 3.3 HO-0021 §7.3's gap — closed, and it deviates from the brief's expected count

Removing check 8 left **nothing asserting that the BLESSED carry copy embeds the map it claims to.**
Toolkit `[T4]` reads the *freshly built* DLL; `[T3]` checked the blessed copy's *sha and resource
names* but never opened its embed. Different artifacts — the distinction D8a exists for, and the
blessed one cannot even be rebuilt on this host.

Added: **`[T3] blessed carry-copy DLL embeds the map its manifest claims`**, three-way — the extracted
embed == the manifest pin == the dropped map.

> ⚠️ **THIS MAKES THE TOOLKIT COUNTS 16 FULL / 15 QUICK, NOT THE 15/14 THE SESSION BRIEF PREDICTED.**
> The brief's figure came from HO-0001 and did not include §7.3, which HO-0021 §7 asks 7b to close and
> HO-0022 §3.5 independently sharpened. **The deviation is deliberate and is named here rather than
> absorbed silently.** T8's two check NAMES also changed (§4), so the toolkit re-bless covers **one
> addition and two renames**.

### 3.4 The manifest — the pin was DUPLICATED, and now it is not

- **`revit_addin_ids` DELETED.** It was byte-identical to the toolkit's copy from the moment FU-0002
  (toolkit) landed; two live homes for one fact is the shape four false greens came from.
- **`addin_lab_dll`, `replay2023_dll`, `addin_tests` slots DELETED outright.** Every check that read
  them left. *A manifest slot no check reads is a comment* (HO-0002 §6 trap 7).
- **`addin_dll` REDUCED to its lockstep fields** — `embeds_map_sha256`, `embeds_map_short`,
  `install_on_trip`, `stale_pending_rebuild` and their notes. `carry_copies`,
  `hardcoded_resource_names`, `runtime_unverified`, `known_stale`, `sha256`/`short` all deleted; a
  `describes_artifact` **pointer** names the toolkit slot without restating its sha.
- **`family_map.copies[1]`** → `03_contracts/published_drop/revit_SLD_family_map_V1_0_0.json`.

> ⚠️ **THE COST OF KEEPING THE LOCKSTEP HERE, STATED PLAINLY AND WRITTEN INTO THE FIELD ITSELF.**
> Until today a sibling check re-extracted the real embed from a DLL on disk, so
> `embeds_map_sha256` could not lie about an artifact this repo held. **That DLL is gone. On this side
> the field is now maintained by hand, and nothing here can catch you forgetting to re-bless it after
> a toolkit rebuild moves the embed.** The toolkit's new `[T3]` catches the other half. Both notes say
> so, in both repos.

### 3.5 Stale citations, re-derived rather than re-pointed

`run_all_gates.sh:29` → `:50` (the `GOLD` const), the P4×G6 pair → `sync_gate.mjs:219` ×
`run_all_gates.sh:133`, and the NUL-bearing file list: **two of its three files left**, so this repo
now holds **one** NUL-bearing file and **2** NUL bytes — re-measured by `tr -d` differencing (8826 B
raw, 8824 B stripped), not assumed. **The `grep -a` rule is unchanged and permanent in both repos:
one NUL-bearing file empties a sweep exactly as silently as three.**

---

## 4. What landed on the toolkit side

- **T8 widened to all three oracles** (decision D-B). `compare_placement.py` has **no `--selftest`** —
  0 occurrences against 10 and 18 in its siblings — so it joins PRESENCE and not SELFTEST. **Both
  check names changed so the 2-of-3 gap is readable off the gate's own output**, not only in a
  handoff: `all three Python oracles are present` and `the two Python oracles that have a --selftest
  pass it`. **FU-0003 (toolkit)** updated with what landed and what remains.
- **The hub's path banner rewritten** for the post-move reality, and a live false claim fixed: it
  said *four `sync_gate.mjs` checks read this file*. They are `[T7]` in the toolkit gate now, and
  `sync_gate` reads nothing there. Same correction in `docs/ops_build_and_test.md`, whose whole
  section was titled after the wrong gate.
- **~20 cross-repo citations resolved** across the hub and six feature docs. The FOUR CORRECTIONS box
  in the ops doc was **annotated, not rewritten** — three of its four items were overtaken by this
  phase, and repointing history turns accurate history into a lie.
- **Both mutant harnesses re-run against a fresh lab: 10/10 and 10/10, controls green**, including the
  addin harness's `M0'` re-run that proves `restore()` left the lab clean. `[T7]` re-run after every
  hub edit.

> ⚠️ **THE HUB LEDGER WAS EDITED, DELIBERATELY, AND THEN THE GATE WAS RUN.** HO-0021 §7 says
> "byte-preserving through the sha ledger". Two ledger bullets named `sync_gate` checks that no longer
> exist — a false claim in the most-read document. **No sha was moved, restated, or added to any prose
> about the checks (FL-0022), and no anchor was re-wrapped (FL-0023).** All four `[T7]` checks were
> re-run after each edit and the mutant harness after all of them.

---

## 5. Verified vs assumed

**Verified by running it:**
- SLD **13/13 · sync-gate 14/14 · names 14 FULL / 12 QUICK**, twice — before and after the re-bless.
- Toolkit **build-gate 15/15 · toolkit-gate 16 FULL / 15 QUICK · `[T0.4] passed=112 failed=0` ·
  `[T0.3] 12 warnings`**, on the **first** run after the move — no defect surfaced this time, which
  is the staging lab HO-0022 built paying for itself.
- **`diff -rq` of BOTH repos against their pre-7b snapshots**, and the change list is exactly the
  intended one. The only unintended entries are three `04_renderer/snapshots_*` JSONs differing in a
  `generated` timestamp — **inspected line by line, timestamp only**, a known G6 side effect.
- The three shas re-hashed at their new carry-copy paths: **`be6ae51a` · `2e86b97d` · `1a3b7ead`**,
  and `runtime_unverified` still `true` on all three in the toolkit manifest — **which `diff -rq`
  shows was not written at all this session.**
- **`find -newermt` was NOT used for any what-changed claim.** FL-0021's other half (HO-0001 toolkit):
  editing a file here does not advance its mtime, so it is blind in both directions.

**Assumed / not verified:**
- ⚠️ **No claim about Revit.** All three assemblies are `runtime_unverified` and **none has ever run
  inside Revit.** This session added nothing to that queue and moved no sha.
- ⚠️ **The reproducibility claim did not survive the move** and was never re-established — the builds
  are location-dependent (no `<PathMap>`). The toolkit manifest already says so beside each sha.
  Re-establishing it means re-blessing, and re-blessing destroys the evidence the owed trip exists to
  collect. **Do not do it casually.**
- ⚠️ **Living SLD docs still cite `13_addin/`** — `CLAUDE.md`, `README.md`, `00_Docs/*`,
  `02_specs/symbols/sld_system_model`. **That is Phase 8**, deliberately: this phase moved code and
  gates. `05_revit/README.md` is the seam doc that tells a reader where everything went.
- ⚠️ **`03_contracts/{sld_topology_schema, sld_replay_package}.md` cite `13_addin/` and were NOT
  touched — on purpose.** They are DROPPED files: editing one moves its sha, breaks the drop pin, the
  toolkit's `[T1]`, and the new staleness check. **Fixing them is a re-publish, not an edit.**

---

## 6. Successor — what is next

**Phase 8: the SLD living docs.** No living doc may point at a path that no longer exists. The set is
enumerable today: `CLAUDE.md`, `README.md`, `00_Docs/{repo_runbook, project_instructions,
dedarms_separation_decisions, drift_surfaces}`, `02_specs/symbols/sld_system_model`. **Re-derive it
with `grep -ral 13_addin` on the day; do not trust this list.** `10_failure_log/`, `11_future_updates/`
and `12_handoff/` are **history and are not repointed.**

**Then Phase 9 — THE REVIT TRIP, and it is the critical path.**

**Open follow-ups raised here:** **FU-0005 (toolkit)** — four `.cs` files cite SLD-repo paths that no
longer resolve; must ride along with a legitimate rebuild, never alone.

### Carry forward

- 🚩 **THE REVIT TRIP IS THE CRITICAL PATH.** Eight items wait on it. **None of the three shipping
  DLLs has ever run in Revit.** Carry the 2023 replayer via a **sync client, never a browser
  download** — mark-of-the-web gives `HRESULT 0x80131515` on net48.
- 🚩 **NEITHER SUITE CAN SEE THE OTHER REPO.** No gate in either one reads a file in the other; the
  drop is the only seam. That is deliberate (a cross-repo read soft-skips on any machine missing the
  sibling — FL-0009), and it means **"all gates green" now means half as much as it did yesterday
  unless you ran both.**
- ⚠️ **Still no git.** Four tarballs are the whole safety net. SLD-repo FU-0002 stays declined and
  was not re-raised.
- ⚠️ **FL/FU/HO numbers are TWO sequences.** Next: **HO-0024 / FL-0024 / FU-0012 (SLD)**;
  **HO-0003 / FL-0003 / FU-0006 (toolkit)**. **Never write a bare number — tag the repo, in prompts too.**
- ⚠️ **Line numbers in this repo's docs go stale silently — eight consecutive sessions.** Both files
  in the P4×G6 citation moved today. **Re-derive the SET, never re-point the numbers.**
- ⚠️ **`bash script.sh` never `./`** (`/storage` is `noexec`) · **`grep -a` always** ·
  **`flock --close` with anything invoking `dotnet`** · `DOTNET_GCHeapHardLimit=0x60000000
  DOTNET_EnableWriteXorExecute=0` · **never two gate suites at once, and there are now two repos'
  worth of them.**

**HO-0022 is `consumed` by this entry.**
