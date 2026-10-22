# Staleness & inconsistency audit — 2026-08-02

> **This document is a REPORT. It changes nothing.** Per Mayo's scope decision 2, this session fixed
> nothing, pinned nothing, added no gate, re-blessed no baseline, and raised **no FL / FU / HO entry**
> — even for findings that clearly deserve one. Raising an entry is a judgement about what to fix, and
> that is session 2's job.
>
> ⚠️ **Consequence, stated plainly:** nothing in either repo's registers points at these findings.
> Nothing enforces any of it. **The next audit will re-find everything session 2 does not fix.**
> A finding list is not a guard.

---

## 0. Tree state this report is measured against

**Everything below was measured on 2026-08-02 against this exact state.** Without it, a later session
cannot tell whether a finding is still live — that is FL-0014's class applied to the report itself.

| | |
|---|---|
| **Date** | 2026-08-02 |
| **Engine rev** | **1.0.15** |
| **SLD suite** | `bash run_all_gates.sh` → **GATES: 13 passed, 0 failed** |
| **SLD sync-gate** | **SYNC-GATE: 14 passed, 0 failed** (full) |
| **SLD check-name baseline** | **[D7] FULL — 14 names, unchanged · QUICK — 12 names, unchanged** |
| **SLD behavior** | **52 passed, 0 failed** |
| **Toolkit build gate** | **BUILD-GATE: 15 passed, 0 failed, of 15** |
| **Toolkit node gate** | **TOOLKIT-GATE: 16 passed, 0 failed, of 16** |
| **Toolkit suite / names** | **GATES: 3 passed, 0 failed** · **[D7] FULL — 16 names, unchanged** |
| **Add-in tests** | **`[T0.4]` RESULT: passed=112 failed=0 skipped=0 errors=0 == pin** |
| **Python oracles** | 3 present, 3 with `--selftest` — `check_capture_complete.py` 10/10 · `diff_replay_csv.py` 18/18 · `compare_placement.py` 19/19 |
| **Shipping shas** | `DEDARMS` **`be6ae51a`** · `DEDARMS.Lab` **`2e86b97d`** · `DEDARMS.Replay2023` **`1a3b7ead`** — all three **UNMOVED** |
| **`runtime_unverified`** | **true ×3** (`[T7]`: "3 shipping DLL(s) agree with the doc individually") |
| **Embedded family map** | `df7cfc4f` (34,174 B) · golden fixture `85b57c19` |

**Both suites were run SEQUENTIALLY, never concurrently** (FL-0012, SLD). The SLD suite was run twice
(the first run's output was truncated by the capture, so it was re-run in full); both runs were green
and identical in their gate lines.

### Snapshots taken before any sweeping (§0.3)

| file | entries | verification |
|---|---|---|
| `Download/sld_snapshot_pre-staleness-audit_2026-08-02.tgz` | **491** | extracted + `diff -rq` vs live → **no differences**, 423 files both sides |
| `Download/toolkit_snapshot_pre-staleness-audit_2026-08-02.tgz` | **306** | extracted + `diff -rq` vs live → **no differences**, 248 files both sides |

Verified by extract + `diff -rq`, **not** by entry count alone, per §0.3. (`tar` printed deferred
`Cannot change mode` warnings extracting setgid `/sdcard` directories onto tmpfs; content was
unaffected, which is exactly why the brief says not to trust the exit status or the count.)

---

## 1. Read this before reading the findings

**Three things shape everything below.**

1. **The brief's §2 is superseded.** All four of §2.1's sites and §2.2's Class D candidate are
   **already fixed** in the live tree — see **D1**. §2 is *not* a to-do list. The brief predicted this
   about itself (§8.1, §8.6) and was right.
2. **Every finding names how it was derived.** Where a claim was checked by running something, the
   command's output is quoted. Where it was checked by reading, it says so.
3. **`uncertain` is used as a real verdict.** A guess dressed as a finding costs session 2 more than a gap.

**Classification used:** `stale` · `deliberate` · `history` · `uncertain`.

---

## 2. The finding that should be read first

> ### The two repos disagree about how many `.cs` files the add-in has, and the SLD side is wrong.
>
> - SLD `CLAUDE.md:105` — *"organised into `Core/ Sld/ Electrical/ Reports/` feature folders
>   (**25/36/7/1** of its **69** `.cs`); the **5** Lab files are their own project"*
> - Toolkit `CLAUDE.md:78` — *"Phase 5a moved all **72** `.cs` into feature folders (re-counted
>   2026-07-31; this line long said 74)"*
>
> **Measured live** (`find … -name '*.cs' | grep -v '/obj/\|/bin/' | wc -l`):
> Core **27** · Sld **37** · Electrical **7** · Reports **1** = **72**; Lab **6**.
>
> **The toolkit is right and the SLD repo is stale on all four numbers.** The one number the SLD line
> gets right is the total: *"**100** source `.cs` files excluding `obj/`+`bin/`"* — measured **100**
> across `src/` + `tests/`. So the sentence is half-current, which is the hardest kind to spot.
>
> **Why this is the headline:** no gate in either repo can see the other, so this class is only
> findable while both trees are open. It is exactly the class decision 1 bought.

---

## 3. Class A — numeric / identifier claims

**Method:** derive each live value by running the thing, then sweep for *every* spelling including the
ones not expected. The `0.4416` lesson (§2.1) was applied by sweeping all five composed-scale values
together (`0.4416|0.4454|0.3972|0.5662|0.4841`) rather than only the one known to have moved.

### 3.1 `stale` — the SLD repo still describes a 14-gate suite with a C# build gate

Gate 13 and its subject were deleted 2026-07-31 by separation Phase 7b. **Derived:**
`bash run_all_gates.sh` → `GATES: 13 passed`; `ls 08_validation/build_gate.sh` → *No such file or
directory*; `run_all_gates.sh:17` states the deletion itself and warns that living docs still cite it.

| # | site | claims | live |
|---|---|---|---|
| **A1** | `CLAUDE.md:240-243` | "The full suite is **14 gates** … **gate 13, the C# build gate**, and **gate 14**" | 13 gates; no gate 13 |
| **A2** | `CLAUDE.md:245-288` | the whole `08_validation/build_gate.sh` (**gate 13**) bullet, present tense, ~44 lines | the file does not exist in this repo |
| **A3** | `CLAUDE.md:6` | "the **14 gate** commands" (runbook link text) | runbook §0 says **13 gates** |
| **A5** | `README.md:83-84` | "**14 gates** (… gate 13 `build_gate.sh` — the C# build-and-test gate …)" | 13 gates |
| **A6** | `04_renderer/README_engine.md:501-509` | "Gate 13 — the C# build gate … `08_validation/build_gate.sh` (added 2026-07-30, FU-0011) **builds** …"; "the full suite is 14 gates"; "**12 of the 14** are documented here, gates 13 and 14 are in the runbook" | 13 gates; **no banner anywhere in this file** |

⚠️ **A6 is the sharpest of these.** It does not merely carry a stale number — it *routes the reader*
to `repo_runbook §4` for gate 13's commands, and the runbook's own banner at `:320-329` says
**"Do not run any command in it against this repo."** One document sends you where the other forbids
you to go.

**A2 carries a second error inside it:** `CLAUDE.md:286` attaches the `DEDARMS.Tests.csproj:91`
three-level-climb rationale to **gate 14** (`checkname_diff.sh`). Derived: `grep -c
"DEDARMS\|dotnet\|csproj" 08_validation/checkname_diff.sh` → **0**. That script touches no C# at all,
and `DEDARMS.Tests` is not in this repo. See also **D5**.

### 3.2 `stale` — sync_gate's check count, in four living documents

Live: **14 full · 12 quick** (gate output: `[D7] check-name baseline (FULL) — 14 names` /
`(QUICK) — 12 names`; `SYNC-GATE: 14 passed`). Phase 7b deleted eleven checks and added one.

| # | site | says |
|---|---|---|
| **A4** | `CLAUDE.md:274` | baseline "(**24 full · 22 quick**)" |
| **A7** | `04_renderer/README_engine.md:490` | "**24 checks (22 in `--quick`)**" |
| **A8a** | `00_Docs/repo_runbook_V1_0_0.md:466` | "sync_gate (the **24/24 full · 22/22 quick**)" |
| **A8b** | `00_Docs/repo_runbook_V1_0_0.md:469` | "Full run = **24 checks** (22 in `--quick`…)" |
| **A8c** | `00_Docs/repo_runbook_V1_0_0.md:680` | "expect SYNC-GATE GREEN (**24/24 full**)" — §8 Recovery |
| **A8d** | `00_Docs/repo_runbook_V1_0_0.md:757` | "re-run `sync_gate.mjs` for **24/24**" — §9a step 5 |

> 🚩 **A8 is an internal inconsistency, not just staleness.** The **same file** at `:33` says
> *"sync **14/14** (was 24/24 until Phase 7b deleted eleven checks and added one)"* — correct, and
> clearly written by Phase 8. **§0 and §4 of the runbook were updated; §8 and §9 were not.** A reader
> who lands in §8 or §9 (the recovery procedure and the ship-a-DLL procedure — the two places you go
> when something is wrong) gets the stale number.

### 3.3 `stale` — the copied "a green N/N proves it compiles" sentence, in both repos

| # | site | says | live |
|---|---|---|---|
| **A9** | SLD `00_Docs/repo_runbook_V1_0_0.md:41` | "A green **14/14** proves the sources compile and 112 tests pass" | this suite is 13 gates and **compiles nothing** — as the same bullet says two lines above |
| **A9b** | SLD `00_Docs/repo_runbook_V1_0_0.md:726` | "A green **14/14** proves it compiles and that 112 tests pass, and nothing more" (inside §9's banner) | ditto |
| **A10** | Toolkit `CLAUDE.md:78` | "A green **14/14** proves it compiles and that 112 tests pass, and nothing more." | build-gate **15/15** · toolkit-gate **16/16** · suite **3/3** · names **16** |

The same sentence lives in both repos and **went stale in both, independently and differently**.
Nothing reads it. See **F2**.

### 3.4 `stale` — toolkit test README

| # | site | says | live |
|---|---|---|---|
| **A12** | `tests/DEDARMS.Tests/README.md:62` | "The suite is now **14 gates** and this is gate 13." | no such suite in this repo; the sibling's is 13 gates with no gate 13 |

### 3.5 `uncertain` — one number inside a bannered history block

**A13.** `00_Docs/repo_runbook_V1_0_0.md:331` opens the dead gate-13 block with *"Its **14** checks:"*
while `:317`, fourteen lines earlier and outside the banner, says the successor has *"**15** checks"*.
The block is explicitly kept under a banner *"because the measurements are still true and were
expensive."* **A measurement that disagrees with the line above it is not obviously still true.**
Live toolkit build gate: **15**. Classified `uncertain` because the intended referent (gate 13 at
deletion, vs gate 13 at some earlier point) cannot be settled by reading, and the block is history by
declaration.

### 3.6 `deliberate` / correct — verified and NOT findings

Recorded so session 2 does not re-derive them.

| claim | sites | verdict |
|---|---|---|
| `behavior_test.mjs` **52 checks** | `CLAUDE.md:213`, `repo_runbook:311`, `README_engine.md:425`, `run_all_gates.sh:137`, `project_instructions:596` | ✅ **correct** — gate printed `52 passed, 0 failed` |
| toolkit **43 arms** | SLD `repo_runbook:532`, TK `toolkit_runbook:103`, TK `run_toolkit_gates.sh:28` | ✅ **correct** — derived from the runner's own pins: `addin_manifests 10` + `blessed_embed 9` + `hub_ledger 14` + `drift_coverage 10` = **43** |
| **112** tests · shas ×3 · `runtime_unverified` ×3 · `df7cfc4f` · `85b57c19` · rev **1.0.15** · selftests **10/18/19** | many | ✅ **correct** — all match today's gate output verbatim |
| **100** source `.cs` | SLD `CLAUDE.md:105` | ✅ **correct** (the rest of that line is not — see §2) |
| next IDs **HO-0027 / FL-0025 / FU-0014 (SLD)**, **HO-0005 / FL-0004 / FU-0007 (toolkit)** | brief §6.8 | ✅ **correct** — live maxima are SLD HO-0026 / FL-0024 / FU-0013 and toolkit HO-0004 / FL-0003 / FU-0006 |
| `drift_surfaces:328` "`mutants_hub_ledger.mjs` **14/14**" | | ✅ **correct** — matches the runner pin |

> ### ⭐ The §2.3 calibration example, re-verified
> `grep "43 checks\|43 behavioral\|(43 "` over the SLD repo returns **exactly one living hit**:
> `00_Docs/repo_runbook_V1_0_0.md:532`. Read, it is *"THE TOOLKIT REPO HAS ITS OWN `run_mutants.sh`
> AND ITS OWN FOUR HARNESSES (**43 arms**)"* — the mutant-arm total, written 2026-08-01, and
> **correct**. It is not a missed `behavior_test.mjs` count. **The brief's worked false positive
> holds.** Counting that hit instead of reading it would have produced a quotable, wrong finding.

---

## 4. Class B — path citations

**Method:** extract path-shaped strings on the known-suspect axes, test existence against each repo
root, then **read every hit**. See §8 for what this method did *not* cover.

### 4.1 `stale` — runnable instructions that cannot work

| # | site | says | live |
|---|---|---|---|
| **B1** | SLD `CLAUDE.md:380` | "`dotnet build -c Release` from **`Revit Addins/DEDARMS/`** (and **`Revit Addins/DEDARMS.Lab/`** for the satellite)" | `Revit Addins/` **does not exist in either repo**; live is `src/DEDARMS/` and `src/DEDARMS.Lab/` |
| **B1b** | SLD `CLAUDE.md:384` | "Deploy with **`Revit Addins/DEDARMS/deploy/install_dedarms.ps1`**" | live is **`deploy/install_dedarms.ps1` at the toolkit repo root** — `src/DEDARMS/deploy/` does not exist |
| **B2** | TK `tests/DEDARMS.Tests/README.md:47` | ``bash 08_validation/build_gate.sh   # or: bash run_all_gates.sh   (gate 13 of 14)`` | **neither command exists**: the toolkit's script is `toolkit_build_gate.sh`; `run_all_gates.sh` is in the sibling repo and has no gate 13 |

**B1 is a Class E finding as much as a Class B one:** the SLD repo's §10 was left describing the
add-in's *old in-repo* layout even though Phase 8 repointed the runbook's §5 (`repo_runbook:545`
correctly reads `.../DEDARMS Revit Toolkit/src/DEDARMS/  # ANOTHER REPO since 2026-07-31`).
**Phase 8 repointed the runbook and missed `CLAUDE.md` §10.**

### 4.2 `stale` — dead script names inside live scripts

| # | site | says |
|---|---|---|
| **B3a** | TK `08_validation/toolkit_build_gate.sh:2` | "`build_gate.sh` — T0: the C# build-and-test gate. **Gate 13 of `run_all_gates.sh`.**" |
| **B3b** | TK `08_validation/toolkit_build_gate.sh:56-58` | usage block: `bash 08_validation/build_gate.sh`, `bash run_all_gates.sh   # as gate 13 (full mode only)` |
| **B3c** | TK `08_validation/toolkit_build_gate.sh:198` | runtime message: "Another **`build_gate.sh`** run is in progress…" |
| **B3d** | TK `08_validation/toolkit_build_gate.sh:1160` | failure message: "A check was added without updating EXPECTED_CHECKS (**`build_gate.sh`**). Fix the pin." |
| **B4** | TK `08_validation/lib/dll_embed_V1_0_0.mjs:10` | "`build_gate.sh` — checks a FRESHLY BUILT DLL against the canonical map file (T4)." |

⚠️ **Distinguish B3 from deliberate provenance.** `toolkit_build_gate.sh:69` (*"Source:
`08_validation/build_gate.sh` in Claude Revit SLD Generator…"*) and `:90` (the `diff -u` recipe) name
the old file **on purpose**, so the port stays diffable — `deliberate`, do not touch. So do
`run_toolkit_gates.sh:13-14` and `toolkit_runbook_V1_0_0.md:56-58`. **B3a/b/c/d are different: they
are self-description and user-facing output, not provenance.** B3c and B3d are strings a user reads
when something has already gone wrong, naming a file they will not find.

### 4.3 `deliberate` — FL-0004's ghost path, read rather than counted

`09_tests/SLD family dimensions.csv` **has never existed.** A bare grep is misleading exactly as
FL-0004 says. Read:

- **Still dangling (SLD, living):** `04_renderer/sld_engine.mjs:9936,9940` · `04_renderer/sld_viewer_engine_V1_0_0.html:10178,10182` · `09_tests/Hospital Example (Golden Case)/hospital_sld_viewer_V1_0_0.html:10178,10182` · the two project build viewers (`Default 2500 kVA Service/2_build/…:2609,2613`, `Sprouts…/2_build/…:3910,3914`).
- **Names it only to warn about it:** `08_validation/lib/geometry_V1_0_0.mjs:52` · `02_specs/symbols/sld_system_model_V1_0_0.md:8,10` (`:8` gives the real path) · `00_Docs/drift_surfaces_V1_0_0.md:259`.
- **Toolkit:** `src/DEDARMS/Sld/Services/SymbolDims.cs:7` — **tracked by FU-0005 (toolkit)** and
  deliberately unfixed: it is a shipping `.cs` and must ride along with a legitimate rebuild.

**Verdict `deliberate` / already-tracked.** The dangles are real but logged (FL-0004 SLD, FU-0005
toolkit). The golden viewer is a frozen oracle and the engine files are generated from it.

### 4.4 `stale` (low) — an enumeration that claims completeness and is not complete

**B6.** `05_revit/README.md:88` — *"**Every surviving `13_addin/` string in a living document is now
deliberate**, and is one of exactly **two kinds**"* (a was→is sentence, or a citation inside the
runbook's dead gate-13 block), with the dropped-contract files added as an exception at `:96`.

**Re-derived the set.** Every living `13_addin/` string fits one of those categories **except**
`00_Docs/dedarms_separation_decisions_V1_0_0.md:574, 602, 603, 610`, which are neither — they are
line-number corrections about `13_addin/CLAUDE.md` inside a Phase-3 decision record.

That file is dated (*"Written 2026-07-30 … consumed by Phase 5, 6, 7"*) and is arguably history, but
it lives in `00_Docs/`, not in `10_/11_/12_`. **The finding is the word "exactly", not the file.**
Classified `stale` (narrow) and ranked low: nothing is broken, but an enumeration asserting
completeness is the kind of claim a later session will trust without re-deriving — which is the
failure mode this whole audit exists for.

### 4.5 `history` (low) — stale MSBuild state carrying pre-move absolute paths

**B7.** `src/DEDARMS/obj/`, `src/DEDARMS.Lab/obj/` (`project.assets.json`, `*.nuget.dgspec.json`,
`*.FileListAbsolute.txt`) still contain absolute paths into
`…/claude_sld_generator_system/13_addin/Revit Addins/…`. These are generated files, not documentation,
and a clean restore regenerates them.

Reported only because of the interaction: **FL-0021** (editing a file on this phone does not advance
its mtime) plus stale `obj/` is precisely how a hand-typed in-place build compiles the wrong thing —
and the gate would not see it, because it builds in a scratchpad it wipes first. `uncertain` whether
it matters in practice; **nobody has checked**, and it is cheap to check.

---

## 5. Class C — line numbers in `drift_surfaces_V1_0_0.md` (decision 3: this file only)

**The set was re-derived, not trusted.** Do not quote "thirteen".

> ### **11 distinct citations · 12 occurrences · ALL 12 HOLD.**

`02_specs/symbols/sld_system_model_V1_0_0.md:10` is cited twice (`:259` and `:340`), which is why the
occurrence count exceeds the distinct count.

| citation | target line reads today | verdict |
|---|---|---|
| `Sld/Services/DevicePlacer.cs:742` | `mapEntry?.DrawnCenterXCorrPx ?? AlignTables.DrawnXCorrPx(device.NodeType, variant));` | ✅ holds |
| `Sld/Services/EquipmentLabelPlacer.cs:111` | `_resolver.GetMapEntry(NodeType)?.FlippedTextRightGapPx ?? A8FlippedTextRightGapPx;` | ✅ holds |
| `Sld/Services/FedEdgeExtender.cs:161-167` | `bool hasTable = VisibleEdgeInsetPx.TryGetValue(nodeType, out var tableInset);` | ✅ holds |
| `FamilyResolver.cs:417-420` | `if (string.IsNullOrWhiteSpace(e.SldNodeVariant))` | ✅ holds |
| `DevicePlacer.cs:100-108` | `var symbol = _resolver.TryResolve(device.NodeType, variant, out var reason);` | ✅ holds |
| `DevicePlacer.cs:126` → `:742` | (second citation of the same line) | ✅ holds |
| `…/Sld/Services/SymbolDims.cs:7` | `/// bounding boxes (09_tests/SLD family dimensions.csv) — the engine BOX table` | ✅ holds |
| `04_renderer/sld_viewer_engine_V1_0_0.html:16604` | `function measureMarkupExtent(markup, opts) {` | ✅ holds — **the §7 citation that moved `L16448 → L16604` on 2026-08-01 is current** |
| `01_inputs/templates/titleblock_template_30x42_V1_0_0.html:456` | `function measureMarkupExtent(markup) {` | ✅ holds — note the **absent** `opts` param: this is FL-0024's dormant copy |
| `…(Golden Case)/hospital_titleblock_30x42_V1_0_0.html:458` | `function measureMarkupExtent(markup) {` | ✅ holds |
| `02_specs/symbols/sld_system_model_V1_0_0.md:10` (×2) | ``09_tests/SLD family dimensions.csv`, which has never existed — see **FL-0004** for the` | ✅ holds |

**Recommendation, not a fix (per decision 3):** re-anchor these to a unique *string* rather than a
*number*. Three of them (`measureMarkupExtent`) already have a perfectly unique anchor sitting on the
cited line; the number adds fragility and no information. The `.cs` citations would need a chosen
token. This is the durable fix and it is left as a recommendation.

**Not attempted, per decision 3:** the SLD repo's other ~306 and the toolkit's ~24 `file:line`
citations in Markdown. **They are unaudited.**

---

## 6. Class D — superseded prose (driven by the change record, newest first)

### 6.1 ⭐ D1 — `stale`: **the brief's own §2 is superseded. All five leads are already fixed.**

Re-derived rather than copied, exactly as §2 instructs. Every one now carries the live value **with
the historical value recorded beside it** — the pattern §3 endorses:

| §2 lead | live text today |
|---|---|
| `02_specs/drafting/sld_layout_engine_V1_0_0.md:179` | "**S1 `s = 0.5662`**, **S2 `s = 0.4841`** (engine rev 1.0.15). ⚠️ These read **0.4416 / 0.3972** until 2026-08-0…" |
| `…sld_layout_engine_V1_0_0.md:210` | "Hospital compose scales **0.5662 / 0.4841** (rev 1.0.15; read 0.4416 / 0.3972 until 2026-08-01)" |
| `02_specs/drafting/sld_preflight_V1_0_0.md:84` | "hospital actuals **0.5662 / 0.4841** (rev 1.0.15) both clear 0.20 with margin — and by MORE margin than the 0.4416 / 0.3972 this line quoted until 2026-08-01, so **the 0.20 constant needs no re-tune and was not touched**" |
| `08_validation/lib/geometry_V1_0_0.mjs:19-24` | "Hospital actuals 0.5662 / 0.4841 (engine rev 1.0.15, FU-0008). ⚠️ The value 0.20 is UNCHANGED and deliberately so: the actuals moved UP, so the margin over this threshold grew. Only the rationale was stale — it read `0.4416 / 0.3972`, and 0.4416 was already wrong before FU-0008 (the measured pre-change transform was 0.4454)." |
| `…sld_preflight_V1_0_0.md:48` (§2.2, Class D) | "`pageCore` measures the *rendered markup* via `measureMarkupExtent` (**since engine rev 1.0.15 / FU-0008 that is a real child-geometry scan under a transform stack — it was a crude superset heuristic before, and this sentence said so until 2026-08-01**)" |

**The live-validator concern the brief ranked highest is fully resolved**, and resolved the right way:
the threshold was *not* re-tuned, and the comment now says so explicitly.

> **This is the most important line in this report for session 2: do not work §2 as a task list.**
> It also validates the brief's §8.1 and §8.6 — *"the first thing that disagrees with it is probably
> right"* — and it is the reason every other lead here was re-derived rather than inherited.

### 6.2 D2 — `stale` (narrow), **and the boundary matters**

The per-project checker triplet's **header comments** still describe the pre-FU-0008 golden while the
**same file's runtime output** describes the current one:

| site (×3 copies: `_PROJECT_TEMPLATE`, `Default 2500 kVA Service`, `Sprouts Office Building - 2000A`) | says |
|---|---|
| `4_checks/check_page_scale.mjs:14` | "…9-storey hospital and **0.4454 / 0.3972** on the golden." |
| `4_checks/check_page_scale.mjs:35` | "the golden's phantom-inflated **0.4454**" |
| `4_checks/check_lib.mjs:269` | "…and **0.4454 / 0.3972** on the golden case." |
| *vs* `4_checks/check_page_scale.mjs:85` | prints "golden reference: S1 **0.5662**, S2 **0.4841**, spread 1.17x" |

> 🚫 **Do NOT fold this into FU-0013, and do not "fix" it by touching a target.**
> FU-0013 / §3 deliberately freeze the **targets** — the `0.35–0.46` band, the `0.0455 in` bar,
> "every sheet height-bound" — because FU-0008 §3 forbids re-tuning targets in the change-set that
> moved the measurement. **`check_page_scale.mjs:84`** (`[acceptance: 0.0400-0.0490 in; golden S2 =
> 0.0455 in at s 0.3972]`) **is a target string and IS covered by that freeze — leave it.**
> `:14`, `:35` and `check_lib.mjs:269` are *descriptions of what the golden measures*, not targets,
> and are not covered by it. The distinction is one line apart in the same file.

### 6.3 D3 — `stale`: a document that corrects itself and leaves the error standing

Toolkit `docs/ops_build_and_test.md`:

- **`:40`** (live prose): *"It builds `DEDARMS.Tests` in place (that one has to be: **its csproj climbs three levels to the hospital golden**)"*
- **`:141-149`** (same file): *"🚩 **THE GOLDEN CLIMB IS GONE** — deleted by separation Phase 7b, 2026-07-31 … `DEDARMS.Tests.csproj` now reads **`..\fixtures\hospital_golden.json`** — a copy inside this repo"*

**Derived:** `DEDARMS.Tests.csproj:91` reads
`<None Include="..\fixtures\hospital_golden.json"` — a one-level reference to a local fixture.
The file is still **95 lines**, as `:149` claims.

### 6.4 D4 — `stale`: the same dead climb, unbannered, as a warning

Toolkit `tests/DEDARMS.Tests/README.md:32-33` — *"⚠️ **Build IN PLACE, not in a scratchpad.**
`DEDARMS.Tests.csproj:91` reaches the hospital golden by a repo-relative **3-level climb**
(`..\..\..\09_tests\…`), so a copy taken off the repo fails MSB3030."*

The cited **line number is still correct** (`:91` *is* the golden line) — which makes this worse, not
better: a session re-deriving the citation the cheap way would confirm it and move on. **The line
number holds and the claim about it is false.** That is the strongest argument in this report for the
§5 recommendation (anchor to a string, not a number).

### 6.5 D5 — `stale`: the dead climb as the stated reason inside the live gate script

Toolkit `08_validation/toolkit_build_gate.sh:46, 49, 160-161, 540-541, 562` assert the three-level
climb as the reason `DEDARMS.Tests` builds in place; `:507` and `:541` describe the "too deep is loud,
**too shallow is silent**" mutant-lab failure mode that the same repo's ops doc (`:141-149`) says is
now unreachable, because a local fixture *"cannot be wrong-but-green about which file it read."*

⚠️ **This is §2.1's `geometry_V1_0_0.mjs:19` class, one repo over:** a moved fact is the stated
justification for behavior that is **still enforced**. The gate still builds `DEDARMS.Tests` in place
and still passes 15/15. **That does not make the behavior wrong — but nobody has checked whether the
reason still supports it, and the comments asserting it are false.** Rank accordingly.

> **The repo predicted its own blast radius.** `ops_build_and_test.md:141` calls this *"the entry
> **about ten documents cite**."* **Measured:** **9 living sites across 5 files in the toolkit**
> (`toolkit_build_gate.sh` ×6, `tests/DEDARMS.Tests/README.md` ×2, `docs/ops_build_and_test.md:40`)
> **plus 1 in the SLD repo** (`CLAUDE.md:286`) still assert it — excluding every site that corrects it
> and excluding `10_/11_/12_` and `05_/06_/07_` history. **The estimate was accurate.**

### 6.6 D6–D8 — `stale`: SLD runbook sections Phase 8 did not reach

| # | site | says | live |
|---|---|---|---|
| **D6** | `00_Docs/repo_runbook_V1_0_0.md:556` | "the gate suite stays green because **gate 13** builds in a scratchpad it wipes first" (the FL-0021 warning in §5) | no gate 13 here; that behavior is the toolkit's gate now |
| **D7** | `00_Docs/repo_runbook_V1_0_0.md:759-763` | "The `DEDARMS.Tests` csproj pins the golden topology by a **repo-relative** path, so … it **cannot** build in a scratchpad copy (MSB3030)" | `DEDARMS.Tests` is not in this repo; the climb no longer exists |
| **D8** | `00_Docs/repo_runbook_V1_0_0.md:757` | "re-run `sync_gate.mjs` for **24/24**. Forgetting the **CLAUDE.md** line turns **P5** red" | sync is 14/14; the add-in `CLAUDE.md` is in the other repo and the check that reads it is the toolkit's `[T7]` |

**The pattern across D6–D8 and A8 is one finding:** Phase 8 repointed the runbook's **§0, §4 and §5**
and did not reach **§8 (Recovery)** or **§9/§9a (ship a DLL)**. Those two sections are the ones a
session opens when something is already wrong.

---

## 7. Class E — cross-repo (the class only a two-tree session can do)

Ungated by construction: **no gate in either repo reads a file in the other**, verified — the only
machine-checked link is the contract drop (`03_contracts/published_drop/` → `01_contracts/`).

| # | claim one repo makes about the other | verdict |
|---|---|---|
| **E1** | SLD `CLAUDE.md:105` — add-in `.cs` breakdown **25/36/7/1 of 69**, Lab **5** | 🔴 **`stale`** — live **27/37/7/1 of 72**, Lab **6**. The toolkit's own `CLAUDE.md:78` says 72 and is right. **See §2.** |
| **E2** | SLD `CLAUDE.md:380,384` — build from `Revit Addins/DEDARMS/`, deploy from `Revit Addins/DEDARMS/deploy/` | 🔴 **`stale`** — see **B1**. Live: `src/DEDARMS/`, `deploy/` at the toolkit root |
| **E3** | "a green 14/14 proves it compiles + 112 tests" in **both** repos | 🔴 **`stale` in both** — see **A9/A10** |
| **E4** | SLD `CLAUDE.md:12-16, 354` — the toolkit's `docs/` holds **seven** documents | ✅ **correct** — toolkit `[T7]` passes: *"hub + 7 linked docs"* |
| **E5** | SLD `CLAUDE.md:101` — "add-in DLL sha: see `DEDARMS Revit Toolkit/CLAUDE.md` (authoritative … this one records no shipping DLL sha at all since Phase 7b)" | ✅ **correct** |
| **E6** | Cross-register citations `FU-0012 (SLD)` ↔ `FU-0006 (toolkit)`, `HO-0026 (SLD)` ↔ `HO-0004 (toolkit)` | ✅ **all four entries exist**; HO-0026 references HO-0004 and vice-versa. ⚠️ But the paired **FU** entries do **not** name each other by tagged ID — each carries only its own tag. Not wrong, but the pairing is asserted only in the handoffs |
| **E7** | Toolkit `CLAUDE.md:26` points at `00_Docs/drift_surfaces_V1_0_0.md` **(SLD repo — sibling)**, with `00_Docs/drift_surfaces_stub_V1_0_0.md` here | ✅ **correct** — the one-report-plus-stub precedent this report follows |
| **E8** | Toolkit `docs/ops_build_and_test.md:32-34` — "that suite is now **13 gates** and compiles nothing" | ✅ **correct** — and it is the *toolkit* stating the SLD repo's count accurately while **three SLD living docs state it wrongly** (A1/A3/A5/A6) |

> ⚠️ **E8 is worth sitting with.** The sibling repo describes this repo's gate count correctly while
> this repo's own `CLAUDE.md` and `README.md` do not. **The outside view was more current than the
> inside view.** That is not a coincidence — the toolkit wrote its sentence *during* Phase 7b, and the
> SLD hub was updated by a later, separate pass (Phase 8) that reached the runbook and stopped.

---

## 8. Class F — conventions nothing consumes

**Method:** for each shared convention, ask *"what actually reads this?"* If the answer is "a human",
it will drift (toolkit FL-0003 is the worked example).

**F1 — `deliberate` / already documented. Kept as a calibration example.**
The `09_tests/*/4_checks/` checker folder is triplicated (`_PROJECT_TEMPLATE` + 2 projects) and
nothing compares the copies. **This is already `drift_surfaces_V1_0_0.md` §8** — *"the per-project
checker folder, ×3 and growing"*, added 2026-08-01. **I derived it independently and would have
reported it as new.** Measured today: all three `check_page_scale.mjs` are byte-identical
(`3289a111…`) and all three `check_lib.mjs` are byte-identical (`4a2507d2…`) — **no drift yet**,
which is why D2's stale comments appear in all three at once.

**F2 — `stale`, new.** The sentence *"a green N/N proves it compiles and 112 tests pass"* exists in
both repos (A9, A9b, A10) with three different numbers, all wrong, and **nothing parses it.** It is
prose *about* what a gate proves, which is the one thing a gate can never check about itself.

**F3 — `uncertain`, new. The record-beside-it convention is applied inconsistently, and nothing
enforces it.** This repo's strongest habit — leave the stale number, banner it, put the live value
beside — is followed in some places and not others *within the same file*:

| file | bannered | not bannered |
|---|---|---|
| SLD `00_Docs/repo_runbook_V1_0_0.md` | §0 `:31-33`, §4 `:315-329`, §9 `:717-726` | **§8 `:680`**, **§9a `:757-763`** |
| TK `docs/ops_build_and_test.md` | `:44-60`, `:141-149` | **`:40`** |
| TK `tests/DEDARMS.Tests/README.md` | — | **`:32-33`, `:47`, `:62`** |
| SLD `04_renderer/README_engine.md` | — | **`:490`, `:501-509`** |

Classified `uncertain` because "should every stale number carry a banner?" is a policy question, not a
measurement. But the pattern is consistent and worth a decision: **the banner is the convention that
makes all the other deliberate divergences legible, and it is exactly the kind of thing only a human
reads.**

---

## 9. §3 extended — the deliberate-divergence list

**Re-checked, and extended with what this sweep proved intentional.** Per the brief, this is the most
reusable thing here.

### 9.1 Re-verified from §3 — all still correct, do not "fix"

| item | evidence found today |
|---|---|
| Title-block template's dormant `measureMarkupExtent` | ✅ `titleblock_template_30x42_V1_0_0.html:456` = `function measureMarkupExtent(markup)` — **no `opts` param**, vs the engine's `:16604` `(markup, opts)`. Dormant by construction (FL-0024, `drift_surfaces` §7) |
| `check_page_scale.mjs` band / `0.0455 in` bar / "every sheet height-bound" | ✅ known-stale on purpose — **FU-0013**. See the D2 boundary warning |
| Both live projects `out_of_band=1` | ✅ expected; Sprouts' own `ACCEPTANCE.md:88-92` states it and forbids re-tuning the layout |
| `_auditFrameBox`'s 1 px workaround | ✅ not touched |
| Dropped contract files still cite `13_addin/` | ✅ `03_contracts/{sld_topology_schema,sld_replay_package}_V1_0_0.md` + `published_drop/` copies + toolkit `01_contracts/` copies. Editing one moves a sha and reddens `[T1]` + the publisher-side staleness check |
| Sprouts `ACCEPTANCE.md` run-33 column | ✅ **confirmed** — banner at `:70-92` records the FU-0008 delta *beside* the untouched table. Note `_PROJECT_TEMPLATE/ACCEPTANCE.md` and `Default 2500 kVA Service/ACCEPTANCE.md` **were** updated to 0.5662/0.4841; **the asymmetry is deliberate and reads as staleness** |
| "gate 14" with no gate 13 | ✅ `run_all_gates.sh:34-35, 226-227` — arrival IDs, renumbering would repoint every citation at a gate that never existed |
| `10_/11_/12_` (and toolkit `05_/06_/07_`) are history | ✅ a large share of every sweep landed there and was correct as written |
| SLD `FU-0002` (git) `declined` | ✅ not re-raised |
| `mutants_drift_coverage.mjs` has no `M0'` arm | ✅ 10 arms pinned, deliberate per toolkit FL-0003 §4 |

### 9.2 ➕ NEW — add these to §3

| looks stale | actually | authority |
|---|---|---|
| **Four `.cs` files cite SLD-repo paths that no longer resolve** (`PipelineResult.cs:64`, `ReplayCapture.cs:173`, `SymbolDims.cs:7`, `ReplayPackageDto.cs:16`) | **tracked and deliberately unfixed** — must ride along with a legitimate rebuild; never edit a shipping `.cs` | **FU-0005 (toolkit)** |
| **`09_tests/*/4_checks/` is triplicated with no comparator** | **already a documented drift surface** | `drift_surfaces_V1_0_0.md` **§8** |
| **`toolkit_build_gate.sh:69, 90` name the old `build_gate.sh`** | **deliberate provenance** — keeps the port diffable against its ancestor sha. Distinct from `:2/:56-58/:198/:1160`, which are **not** (B3) | that file's own header |
| **`toolkit_runbook_V1_0_0.md:56-58`, `run_toolkit_gates.sh:13-14` name SLD `build_gate.sh`** | **deliberate provenance** — "ported, not rewritten" | toolkit runbook |
| **The runbook's whole gate-13 block (`:320-441`) describes a deleted gate** | **kept on purpose under a banner** — the measurements are why the toolkit's gate is shaped as it is | `repo_runbook:322-329` |
| **`dedarms_separation_decisions_V1_0_0.md`'s stale `build_gate.sh` line numbers** | **self-flagged** at `:307` — *"EVERY `build_gate.sh` LINE NUMBER IN THIS FILE WAS STALE BY ~92 LINES"* | that file |
| **SLD `run_mutants.sh` has ONE harness (12 arms) while the toolkit has FOUR (43)** | **correct, not asymmetric neglect** — five harnesses total, per FU-0012 (SLD) / FU-0006 (toolkit) | both runners' pins |
| **`03_contracts/published_drop/` duplicates `03_contracts/` files** | **the drop, by design** — pinned by sha in `drop_manifest.json`; a sweep hits both copies of everything | `drop_manifest.json` |

---

## 10. What this session did NOT do — the gaps, stated so they are not mistaken for coverage

**No silent truncation.** Nothing here is a top-N.

1. **Class C is `drift_surfaces` only**, per decision 3. The SLD repo's other **~306** and the
   toolkit's **~24** `file:line` citations in Markdown are **unaudited**. (Those counts come from the
   brief's single regex and over-count; treat as an order of magnitude.)
2. **Class B was driven by known-suspect axes**, not by an exhaustive path-existence extraction over
   all Markdown. Axes swept: `13_addin/`, `05_revit/`, `Revit Addins/`, `build_gate.sh`,
   `run_all_gates.sh`, the FL-0004 ghost path, `09_tests/` climbs, `deploy/`. **A general
   extract-every-path-and-stat-it pass was not run.** The brief warned B could be large; it is at
   least 9 live sites on one axis alone (D5).
3. **Class D was driven by the newest change-sets** — FU-0008/HO-0026, FU-0012/FU-0006, FU-0003,
   and Phases 7b/8 — per §4.D. **Change-sets older than Phase 7b were not swept for superseded prose.**
   The yield confirms the brief's ordering: every Class D finding here is downstream of Phase 7b or
   FU-0008.
4. **Class F names three candidates.** `RESULT <scope>` key naming, register row shape, the
   `MUTANTS:` line and handoff section numbering were **not** individually audited.
5. **No mutant harness was run.** Five exist, none is suite-invoked (FU-0012 SLD / FU-0006 toolkit).
   Running them builds labs and, per toolkit FL-0003, one of them used to poison its own — out of
   scope for a report-only session.
6. **`.cs` bodies were not reviewed**, only comments reachable by the sweeps. No `.cs`, DLL, dropped
   contract file or sha was touched or opened for editing.
7. **The trip bundle was not opened.**

---

## 11. Proof that nothing else changed

Per the exit criteria — proved with `diff -rq` against the §0.3 snapshots, **not** with
`find -newermt` (**FL-0021**: editing a file on this phone does not advance its mtime).

- **Writes made by this session: exactly two** — this file, and
  `DEDARMS Revit Toolkit/00_Docs/staleness_audit_stub_V1_0_0.md`.
- **No** FL / FU / HO entry, **no** register row, **no** gate, **no** pin, **no** re-bless.
- **No** `.cs`, **no** `.csproj`, **no** DLL, **no** dropped contract file, **no** installer.
- Both suites were green **before** any sweeping and are re-verified green **after** — see the
  closing verification appended below.
- Shas `be6ae51a` / `2e86b97d` / `1a3b7ead` **unmoved**; `runtime_unverified` **true ×3**.

### Closing verification — run after both files were written

```
SLD:      GATES: 13 passed, 0 failed.   SYNC-GATE: 14 passed, 0 failed.
          behavior 52 passed, 0 failed.  [D7] FULL 14 names / QUICK 12 names, unchanged.
TOOLKIT:  BUILD-GATE: 15 passed, 0 failed, of 15.   TOOLKIT-GATE: 16 passed, 0 failed, of 16.
          GATES: 3 passed, 0 failed.     [D7] FULL — 16 names, unchanged.
          [T0.4] passed=112 == pin.
          [T3] be6ae51a 2/2 · 2e86b97d 2/2 · 1a3b7ead 2/2.
          [T7] runtime_unverified — 3 shipping DLL(s) agree with the doc individually.
```

`diff -rq` against the §0.3 snapshots returns **exactly two new files** — this report and the toolkit
stub — plus **three JSON files whose only difference is their `generated` timestamp**:

| file | diff |
|---|---|
| `04_renderer/snapshots_page/audit.json` | `"generated"` only |
| `04_renderer/snapshots_page/manifest.json` | `"generated"` only |
| `04_renderer/snapshots_titleblock/manifest.json` | `"generated"` only |

**Verified by `diff`, not assumed:** each is a single changed line, the `generated` field. These are
re-rendered by the gate suite itself (G6/G7) on every run, and the snapshot pair in §0.3 was taken
*between* two of this session's own gate runs. This is the same field `CLAUDE.md` §9 records as
excluded from the G9 baseline *because its timestamp moves on every re-freeze*. **No content, no
pixel, no sha, and no baseline moved.**

---

## 12. Ranked shortlist for session 2

Ranked by *what a wrong reading costs*, not by count.

| rank | finding | why it is ranked here |
|---|---|---|
| 1 | **E1 / §2** — the two repos disagree on the add-in `.cs` breakdown | the only class no gate can ever catch; and the sentence is *half* correct, which is how it survived |
| 2 | **B1 / E2** — SLD `CLAUDE.md:380,384` build + deploy paths | **runnable instructions that cannot work**; a reader follows them before they read anything else |
| 3 | **B2** — toolkit `tests/DEDARMS.Tests/README.md:47` | same: two dead commands, in the file that tells you how to run the tests |
| 4 | **D5** — the dead climb as the stated reason inside the live gate script | §2.1's class: a moved fact justifying still-enforced behavior. **Nobody has checked whether the behavior is still right** |
| 5 | **A1/A2/A3/A5/A6** — the SLD hub still describes a 14-gate suite with a C# build gate | ~50 lines of `CLAUDE.md` describe a file that is not there; A6 routes readers where the runbook forbids |
| 6 | **A8 / D6–D8** — runbook §8 and §9 unreached by Phase 8 | the two sections you open when something is already wrong |
| 7 | **D3 / D4** — the golden climb, contradicted within one file and unbannered in another | D4's line number still resolves, so cheap re-derivation *confirms* a false claim |
| 8 | **A4 / A7** — sync_gate 24→14 in two more living docs | mechanical |
| 9 | **F3** — the banner convention is applied inconsistently | a policy decision, not a fix; but it is what makes every deliberate divergence legible |
| 10 | **B6 / B7** — an incomplete "exactly two kinds" enumeration; stale `obj/` state | low cost, cheap to settle |

**And the one that is not a fix at all:** **D1** — §2 of the prep brief is already done. Reading it
as a task list would produce a change-set that edits five sites that are already correct.

---

## 13. The method note this report owes its own brief

The brief's framing sentence was: *"the pattern you grep for is itself a source of false negatives."*

**It happened again in this session, in the opposite direction.** Sweeping
`0.4416|0.4454|0.3972|0.5662|0.4841` together — all five spellings, including the ones not expected —
returned the four §2.1 sites **already carrying the new value**. Had this session swept only `0.4416`
(the value the brief flagged), it would have found the same four files and, seeing the string present,
could easily have reported them as still stale. **The string was there; the claim was not.**
The four hits are now warnings-beside-the-fix, and only *reading* them distinguishes that from a dangle.

**Both directions of the trap are the same rule:** the pattern is a way to find candidate lines. It is
never the finding. Every entry in this report names what the site claims, what is true, and how that
was derived, because the derivation is the only part that survives the next change-set.

---

*Written 2026-08-02. Report only — nothing in this document has been acted on.*

---

# Disposition — 2026-08-02 (appended)

> 🚩 **THE LINE DIRECTLY ABOVE IS NO LONGER TRUE, AND IS KEPT ANYWAY.** It records what was true when
> the report was written. **This section is appended beside it, not written over it** — the same
> record-beside-never-over rule this report spends §9 defending. A later reader must be able to see
> both what the audit claimed and what was done about it.
>
> **The findings above are UNCHANGED. Nothing in §§0–9 was edited.** This section only records
> disposition.

**Acted on by:** the trip-scoped fix session, 2026-08-02 — **HO-0027 (SLD repo)** + **HO-0005
(toolkit)**, one session, two repos, neither entry complete alone.

## What was fixed — three classes only, and why only three

The decision was **trip-scoped, not audit-scoped**: fix the findings that are *dead runnable
instructions*, because the Revit trip is when instructions get run and there is no phone there to
check them against. Everything else is deferred **by finding ID**, not silently dropped.

| audit finding | site | disposition |
|---|---|---|
| **B1 / E2** | SLD `CLAUDE.md:380`, `:384` | ✅ **fixed** → `src/DEDARMS/`, `src/DEDARMS.Lab/`, toolkit-ROOT `deploy/install_dedarms.ps1`, tagged `(toolkit repo)`. **Repointed inside the prose** — the `-SkipLab` flag, sha-verification, mark-of-the-web clearing and the Phase 5c `DeployAddin` note all survive verbatim. **FL-0025** |
| **E1 / §2** | SLD `CLAUDE.md:105` | ✅ **fixed** → **27/37/7/1 of 72**, Lab **6**. 🚩 **The `100` was CORRECT and was left untouched** — exactly as §1.2 of the session brief warned. **FL-0025** |
| **B2 / D4 / A12** | toolkit `tests/DEDARMS.Tests/README.md` | ✅ **fixed, one pass** → `:47`, `:59`, `:62`, `:32-35`, **plus `:50-51`, a fourth dead path not in the brief** (`03_contracts/` is the SLD repo's; live pin is `01_contracts/toolkit_manifest.json`). **FL-0004 (toolkit)** |

**All three were re-derived by command before editing and all three were still live.** This mattered:
the *previous* prep brief's §2 had been fixed within a day of being written, which is why §6.1 of this
report warns that its own findings rot on the same clock. **They will. Re-derive before acting.**

## D4/D5 — the judgement call, resolved by measurement rather than left open

§6.4 called `DEDARMS.Tests.csproj:91` *"the strongest argument in this report for the §5
recommendation (anchor to a string, not a number)."* **That held up completely.** The line still
resolves, still *is* the golden line, and the claim about it was false.

The report deliberately left open whether the *behavior* it justifies is still right. **It is, and the
reason is now measured, not inferred.** Copying `tests/DEDARMS.Tests/` off-repo and building gives:

```
42 × error CS2001 over 21 distinct source files;  MSB3030 count: 0
```

The project has **no `ProjectReference`** and source-links **21** production files via
`<Compile Include="..\..\src\…">` — a **2-level** climb. **An off-repo copy does not fail to copy a
fixture; it fails to compile at all**, never reaching the task that would raise MSB3030.
**The replacement reason is stronger than the dead one.** Derivation in **FL-0004 (toolkit) §4.1**.

⚠️ **D5 IS NOT FIXED.** The same dead climb remains the stated reason inside the **live gate script**
(`08_validation/toolkit_build_gate.sh:46, 49, 160-161, 540-541, 562`), and §6.5's open question —
whether `:507`/`:541`'s *"too shallow is silent"* mutant-lab reasoning still holds — **remains
unanswered. Nobody has checked.** → **FU-0007 (toolkit)**, its P1 item.

## What was deferred, and where it now lives

**Nothing was dropped. Every deferred finding is named by ID in an FU:**

- **FU-0014 (SLD repo)** — A1 · A2 (incl. its `:286` gate-14 misattribution) · A3 · A4 · A5 · A6 ·
  A7 · A8a–d · A9 · A9b · D6 · D7 · D8 · B6 · F3 (SLD half)
- **FU-0007 (toolkit)** — **D5** · D3 · B3a–d · B4 · B7 · F3 (TK half) · **A10**

🚫 **A10 was deferred deliberately, not missed.** Toolkit `CLAUDE.md:78` sits **inside the
`Current shipping DLL sha256` bullet**, and **four `[T7]` checks read that file — three read those
exact lines** (FL-0023 (toolkit)). **Re-wrapping that bullet to correct a gate count can silently
break a shipping-sha assertion.** Low trip value, high blast radius.

✅ **§9's deliberate-divergence list was honoured in full.** Nothing on it was touched — including
`check_page_scale.mjs`'s band (**FU-0013**), the four shipping `.cs` files (**FU-0005 (toolkit)**,
never edit a shipping `.cs`), the dropped contract files citing `13_addin/` (editing one moves a sha
and reddens `[T1]`), the runbook's bannered gate-13 block, `toolkit_build_gate.sh:69/90`'s deliberate
provenance, and `10_/11_/12_` · `05_/06_/07_` history.

## §8's F2 answered, and the report's central claim confirmed

**F2 asked what reads the "a green N/N proves…" sentence. The answer generalises further than F2
did, and it was verified rather than assumed:**

🚩 **NO GATE IN EITHER REPO ASSERTS THAT A PATH OR COUNT CITED IN A DOCUMENT IS TRUE.** SLD
`sync_gate.mjs` reads `CLAUDE.md` only as an **anchor** (P5 `:246-249`, the literal
`` `sld_engine.mjs` rev **X** `` string) and resolves no paths. The **only** precedent anywhere is
toolkit `[T7] the hub still indexes every feature document` (`toolkit_gate.mjs:319-344`) — and it
matches only `](docs/*.md)` **markdown links**, while **every dead path in this report was an inline
code span**, the dominant citation style in both trees.

**So FL-0025 and FL-0004 both ship with NO regression guard, and both say so explicitly** rather than
naming one they do not have. The design constraint that makes a guard tractable was found while
writing them, and is the real product of this disposition:

> **The `(SLD repo)` / `(toolkit repo)` inline tag is the waiver list.** Because ⚠️ **neither suite
> can see the other repo**, a checker cannot otherwise distinguish *"dead path"* from *"path in the
> tree I am forbidden to read."* A **tagged** path is expected not to resolve locally; an **untagged**
> one must. **The tag stops being decoration and becomes the mechanism.**

→ package B of **FU-0014 (SLD)** and **FU-0007 (toolkit)**, which should share one implementation.

## State at disposition

**SLD** 13/13 · sync 14/14 · behavior 52/52 · names 14/12 · **toolkit** build 15/15 · gate 16/16 ·
3/3 · names 16 · 112 tests — **both suites run sequentially (never at once, FL-0012), both identical
to the pre-edit baseline.** Shas `be6ae51a` / `2e86b97d` / `1a3b7ead` **UNMOVED**,
`runtime_unverified` **×3**; no `.cs`, DLL or contract file opened in either repo. Pre-edit snapshots
taken for **both** repos and **verified by extract + `diff -rq`**.

⚠️ **A green suite verifies none of the edits above** — that is the whole point of the paragraph
before this one. **Every repointed path was proved with `ls` in-session**, and every count re-derived
by running the thing.

⚠️ **One assumption behind the trip-scoped ranking was never verified, and §6.3 of the session brief
flagged it honestly: nobody has confirmed where a Windows/Revit reader actually starts.** If it is the
toolkit's `docs/ops_build_and_test.md` — **which is correct today** — then B1 was less urgent than
ranked. **It was still false.**

*Disposition appended 2026-08-02. The findings above it are unedited.*
