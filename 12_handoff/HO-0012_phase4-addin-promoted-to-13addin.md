# HO-0012 — Phase 4 done: the add-in is `13_addin/`. Gates green at 14/14. Phase 5 is next.

| Field | Value |
|-------|-------|
| **ID** | HO-0012 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` — superseded by **HO-0013**, which executed its next action (Phase 5a) in full. **Its Phase 4 record stands unchanged.** ⚠️ **§9's `build_gate.sh` line table is now stale AGAIN** — Phase 5a added ~20 lines to that file. Re-measured: `build_project()` **`:275`**, sole `dotnet build -c Release` **`:278`**, call sites **`:331`/`:337`/`:352`**. §9's own closing warning predicted exactly this |
| **Tree state** | `clean` — **14/14** (twice, identical by gate name) · `--no-build` **13/13** · `--quick` **6/6** · build-gate **9/9 of 9** · sync **22/22 full · 20/20 quick** · **112** tests · oracle selftests **10/10 + 18/18** · shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead` **unmoved** · no `bin`/`obj` leftovers |
| **Blocked on** | nothing — Phase 5 is startable now, on the phone |
| **Next action** | **Phase 5a** — pin `<RootNamespace>`/`<AssemblyName>` + five `<LogicalName>`s (D3), then the folder reorganisation. **Read `00_Docs/dedarms_separation_decisions_V1_0_0.md` first; it OUTRANKS the plan.** And read **HO-0008 §4**'s WILL-catch / WON'T-catch list beside it |

---

## 0. The one-line answer

**`05_revit/DEADARMS ADDIN/` → `13_addin/`, in one change-set, with every path repointed in the same
breath per E3.** 66 MB moved by rename; the four blessed carry copies are byte-identical before and
after. `05_revit/` now holds exactly the 3 Python oracles, as the plan's EXIT clause requires.

**Nothing was restructured.** No C# source was edited, no namespace changed, no assembly renamed, no
artifact re-blessed. This phase only relocates.

## 1. The plan's Phase 4 list was wrong in four places, and it was re-measured before use

The record's standing rule — *"every file:line re-derived by execution, not copied"* — earned its
keep again. The plan's six-item list was written before gate 13 existed and before the manifest grew
its `addin_tests` slot.

| Plan said | Measured 2026-07-30 | Consequence if trusted |
|---|---|---|
| "the **5** manifest paths" — L35, L43, L44, **L61, L62** | **SIX** paths — L35, L43, L44, **L70, L71**, and **L82** | the replay2023 pair is 9 lines off; **L82 `addin_tests.project` is absent from the list entirely** → gate 13's T0.0 would have gone red with no listed remedy |
| *(build_gate.sh not mentioned at all)* | **`08_validation/build_gate.sh:61`** also spells the root | gate 13 dies at T0.0; **the plan predates gate 13**, so its edit list structurally cannot contain it |
| item 5: "manifest L51's note cites `05_revit/check_capture_complete.py`" | the note is at **L60**, and that citation **stays correct** — the `.py` files do not move in Phase 4 | you edit a correct line and miss the wrong one: what actually goes stale in that note is the **"4-level climb"** phrase |
| item 6: "rewrite HO-0005's §3① paths (§1.3 path B)" | **HO-0005 names ZERO repo-rooted paths** — no `05_revit`, no `cd`, no absolute path | a no-op. §1.3's premise that HO-0005 "names ~18 paths" that "HARD-BREAK" is false for the handoff *file*; the paths it worried about live in the manifest and the installer |

**HO-0007 §5 got there first and was right:** it warned that *"Phase 4 must now repoint the add-in
root in TWO files."* That warning was in a `consumed` handoff, not in the plan.

## 2. What actually changed

### The seven machine-read sites (gate-breaking if missed)

```
08_validation/sync_gate.mjs:39     ADDIN_ROOT   '05_revit/DEADARMS ADDIN' → '13_addin'
08_validation/build_gate.sh:61     ADDIN_ROOT   $REPO/05_revit/DEADARMS ADDIN → $REPO/13_addin
03_contracts/current_state_manifest.json   L35 · L43 · L44 · L70 · L71 · L82   (six, not five)
13_addin/…/DEDARMS.Tests.csproj:91  ..\..\..\..\09_tests\ → ..\..\..\09_tests\
```

### ⚠️ The csproj edit had to preserve the file's LINE COUNT

`DEDARMS.Tests.csproj:91` is cited by **line number** in ten places — `build_gate.sh` ×3, the
runbook, root `CLAUDE.md`, the manifest note, the tests README, FL-0012 ×2, FU-0011, HO-0006/0007/0008.
**Adding an explanatory comment above line 91 would have silently invalidated all ten.** The edit was
made in place, on line 91 only; the file is still 95 lines. Verified after.

### The climb depth is STRUCTURAL, and that is now written down in five places

Four levels reached the repo root from `05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS.Tests/`. From
`13_addin/Revit Addins/DEDARMS.Tests/` it is **three**. A wrong depth is not subtle: `dotnet build`
dies `MSB3030` naming the golden fixture and T0.3 + T0.4 go red together.

**It is proved, not assumed** — T0.3 built in place and passed, which it could not have done had the
climb been wrong. The "re-measure at every move" warning is now in `build_gate.sh`, the runbook, root
`CLAUDE.md`, the manifest note and `DEDARMS.Tests/README.md`. **Phase 7 moves this tree again.**

### ⚠️ The mutant lab inherits the depth

`SLD_ADDIN_ROOT` labs (HO-0007 §4) replicate the add-in root. A lab tree must now sit at the **same
depth below its own root** as `13_addin/` does — one level shallower than HO-0007's recipe builds it.
Get it wrong and the climb escapes the lab and reads the **real** golden, which is a false green, not
a crash. Recorded in the runbook beside the override table.

## 3. Prose: what was repointed, what was deliberately left

**Repointed (living):** root `CLAUDE.md` (7 sites) · `README.md` (4, incl. new `12_handoff/` +
`13_addin/` tree rows) · the runbook (7) · `run_all_gates.sh` · `build_gate.sh` (2 comments) ·
`13_addin/CLAUDE.md` (its own structure diagram called itself `DEADARMS ADDIN\`) ·
`03_contracts/sld_topology_schema_V1_0_0.md` ×2 · `sld_replay_package_V1_0_0.md` ·
`02_specs/symbols/sld_system_model_V1_0_0.md` · `00_Docs/project_instructions_V1_0_0.md` ·
`DEDARMS.Tests/README.md` · the manifest note.

**Left alone (historical), and the reason is not sentiment:** `10_failure_log/FL-*` and the
`consumed` handoffs describe a tree state that was true when written — and **HO-0006 §7, HO-0007 §9
and HO-0008 §9 each literally assert "Moved: none. `05_revit/DEADARMS ADDIN/` is exactly where it
was."** Repointing those sentences would convert accurate history into a lie. The rule is HO-0011 §5's,
applied to paths as well as counts.

**Bannered instead of rewritten:** **FU-0010 is `in-progress`, not history** — its resume point is
HO-0005 and someone will navigate from it on a Revit trip. It carries 17 old-prefix paths in
narrative. Rewriting them would have edited a live record's history; leaving them silent would have
handed a trip-taker dead paths. It got a **path-translation banner** at the top instead. HO-0005's
existing drift banner was extended the same way.

## 4. Two stale counts found while sweeping, both fixed

Neither is Phase 4's doing; both are FL-0014's class and were measured in passing.

1. **Root `CLAUDE.md:6`** still said *"the **13** gate commands"* — HO-0011's count sweep missed it.
2. **`FU-0010:9`** still said *"12/12 gates, sync-gate 21/21 full · 19/19 quick"* — two revisions stale.
3. **`13_addin/CLAUDE.md`** claimed **three** family-map copies ("the two `05_revit/` copies … three
   in all"). **Measured: there are two**, `07_data/normalized/` and `13_addin/…/Resources/`, both
   `df7cfc4f`. The claim never matched the tree. Corrected with the measurement recorded.

## 5. Why gate 14 needed no re-bless — and still proved something

D7's baseline holds **check NAMES only**, and not one of the 22 embeds a path (the add-in-root check
is named *"ADDIN_ROOT resolves to a real add-in directory"*, generically). So the largest path change
this repo has made produced **zero** baseline churn — the format decision paying off exactly as §"the
detail must be stripped" intended.

**It was not inert.** Gate 14 re-ran sync_gate in **both** modes and asserted all 22/20 names still
present, which is a real check that the move neither dropped nor renamed a check. HO-0011 trap 3
(*"re-bless deliberately, in the same change-set"*) did not fire, and that is the correct outcome:
**a re-bless here would have been the failure, not the fix.**

## 6. Numbers

Suite run **twice** (FL-0006), **identical by gate name**: **14/14** · `--no-build` **13/13** ·
`--quick` **6/6** · build-gate **9/9 of 9** · sync **22/22 full · 20/20 quick** · **112** tests ·
`check_capture_complete.py --selftest` **10/10** · `diff_replay_csv.py --selftest` **18/18**.

Shas `9f16a1e7` (bin + deploy) and `1a3b7ead` (bin + deploy) verified **before and after** the `mv`.
`DEDARMS.Tests/bin`+`obj` cleaned by the EXIT trap. `05_revit/` holds exactly 3 files.

**The plan's stated EXIT was `13/13 · sync 20/20`** — those were its numbers when written, before
gate 13, gate 14 and D8a. The real exit is 14/14 · 22/22 · 20/20.

## 7. What is still open — unchanged by this session

- **D2b has no instrument.** `build_gate.sh` builds `-c Release` only; §6.6 defaults Lab OFF for
  Release, so after 5b `DEDARMS.Lab.dll` would never be built. **Phase 5 must build both configs.
  "Skip if absent" is FL-0001's class.** Use `build_project()`'s trailing-msbuild-args seam
  (`build_gate.sh:255`) — do **not** edit the `-c Release` on line **258**. The seam is already in
  live use: `:299` and `:305` pass `-p:EnableWindowsTargeting=true` through it. **See §9 — those
  numbers were stale in every document that cited them until this session.**
- **D2c's Phase 5b obligation** — what the Lab probe does when Lab is present **and throws**.
  Absent-Lab and broken-Lab are currently indistinguishable.
- **FL-0013 item 4** (the two stray NUL bytes) stays Phase 5 — it edits shipping `.cs` and forfeits
  `9f16a1e7`, so it waits for the re-bless Phase 5 already owes.
- **HO-0005, the other stream:** `1a3b7ead` has still never run inside Revit. Nothing here unblocks
  it — but the tree it will be carried from is now `13_addin/`.

`_snapshot_pre_split_2026-07-30/` is still the only undo. **Do not delete it.** It predates this
move, so it remains a valid rollback for Phase 4 as well.

## 8. Files changed

**Moved (1):** `05_revit/DEADARMS ADDIN/` → `13_addin/` (66 MB, rename, contents untouched).

**New (1):** this file.

**Modified (17):** `08_validation/sync_gate.mjs` · `08_validation/build_gate.sh` ·
`03_contracts/current_state_manifest.json` · `03_contracts/sld_topology_schema_V1_0_0.md` ·
`03_contracts/sld_replay_package_V1_0_0.md` · `02_specs/symbols/sld_system_model_V1_0_0.md` ·
`00_Docs/repo_runbook_V1_0_0.md` · `00_Docs/project_instructions_V1_0_0.md` · `CLAUDE.md` ·
`README.md` · `run_all_gates.sh` ·
`13_addin/CLAUDE.md` · `13_addin/Revit Addins/DEDARMS.Tests/DEDARMS.Tests.csproj` ·
`13_addin/Revit Addins/DEDARMS.Tests/README.md` · `11_future_updates/FU-0010_sld-replay.md` ·
`12_handoff/HO-0005` + `handoff_register_V1_0_0.md`.

**No C# source was edited. No blessed artifact was touched. No sha moved.**

*(Also corrected while sweeping: `00_Docs/dedarms_separation_decisions_V1_0_0.md` ×3 and
`12_handoff/HO-0011` trap 4 — see §9.)*

---

## 9. ⚠️ A separate defect found while sweeping: every `build_gate.sh` line citation was ~92 lines stale

**This is not a Phase 4 consequence.** It was found because Phase 4's own rule — *re-measure, never
copy* — was applied to a number this session intended to merely quote.

**HO-0011 added ~92 lines to `build_gate.sh`** (`flock`, `EXPECTED_CHECKS`, the shortfall banner,
T4b's superset pass) **and then wrote down the pre-edit line numbers.** Every document that cited
them inherited the error. **That is FL-0014's class, committed by the session that closed FL-0014's
sibling defects** — which is exactly why the standing rule says re-derive rather than copy.

| Cited as | Actually | What it is |
|---|---|---|
| `:163` | **`:255`** | `build_project()` — the trailing-msbuild-args seam |
| `:166` | **`:258`** | the sole `dotnet build -c Release "$@"` |
| `:206` `:208` `:223` | **`:298` `:304` `:319`** | the three `build_project` call sites |

**Every conclusion built on those numbers survives, re-measured:** still the *sole* `dotnet build`,
still Release-only, still no call site overriding configuration. **D2b's obligation is unchanged and
re-confirmed.** Only the pointers were wrong — which is the dangerous kind of stale, because the
surrounding prose reads as verified.

**A bonus the re-measurement produced:** the trailing-args seam is not theoretical — **`:299` and
`:305` already pass `-p:EnableWindowsTargeting=true` through it today.** Phase 5 adds the Lab
configuration the same way, and now has a working example to copy rather than a described mechanism.

**Corrected in:** the decision record (3 sites + a standing warning beside D2b) and HO-0011 trap 4
(marked as a correction, since it is a live forward instruction to Phase 5 rather than narrative).
**Left alone:** FL-0013, FL-0014, HO-0008, HO-0009, HO-0010 — those record measurements that were
true when taken.

⚠️ **Phase 5 edits `build_gate.sh` again. The moment it does, the table above is stale too.**
