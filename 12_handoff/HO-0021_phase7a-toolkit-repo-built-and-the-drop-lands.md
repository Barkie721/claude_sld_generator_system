# HO-0021 — Phase 7a: the toolkit repo exists, the contract drop lands, and the coverage gate D4a asked for is built and mutant-proved

| Field | Value |
|-------|-------|
| **ID** | HO-0021 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | **`consumed`** by [HO-0022](HO-0022_phase7a-cold-reviewed-the-staging-lab-turned-eleven-never-green-checks-into-a-measurement.md) (2026-07-31) — the cold review §6b queued. **Read HO-0022 first: it amends §7 in four places and marks 7b BLOCKED on FU-0002 (toolkit).** |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0020 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is still the critical path** |
| **Exit state** | SLD repo **14/14 twice, 24/24 full, 22/22 quick, build-gate 15/15, 112 tests, 0 FAIL** · shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` ×3 · **no `.cs`, no `.csproj`, no DLL, no gate script touched in the SLD repo** |
| **New FL** | none — but see §5, two self-inflicted defects were caught and fixed *during* authoring |

---

## 1. What this session was

**Phase 7a, complete.** The plan splits Phase 7 into *7a — build the empty repo and the drop* and
*7b — move, and repoint*. **7a is done; 7b has not started.** That boundary was chosen deliberately
and it is the reason the SLD repo is still green: **everything 7a did was ADDITIVE.** Nothing moved,
nothing was deleted, no gate was edited.

> 🚩 **The snapshot §0 demanded was taken FIRST and verified**:
> `Download/sld_snapshot_pre-phase7_2026-07-31.tgz`, 73,765,392 B, **728 entries — equal to
> `find | wc -l` on the live tree**, and `tar tzf` decompressed the whole stream without error, so
> the archive is readable and not merely present. The pre-existing `post-phase6` tarball predated
> three sessions and is now superseded.
>
> A clean **14/14 baseline was captured before any change** and both artifacts are in
> `Download/DEDARMS_PHASE7_AUDIT_TRAIL_2026-07-31/`.

---

## 2. What now exists — `Mayo_Claude_Workspace/DEDARMS Revit Toolkit`

```
CLAUDE.md              🚧 PLACEHOLDER — 7b replaces it with the moved hub (see §6)
README.md
00_Docs/               toolkit_runbook · feature_authoring_guide · toolkit_decisions
                       · drift_surfaces_stub
01_contracts/          the drop (4 files + drop_manifest.json) + toolkit_manifest.json
08_validation/         run_toolkit_gates.sh · toolkit_build_gate.sh · toolkit_gate.mjs
                       · lib/{dll_embed,drift_coverage} · mutants_drift_coverage.mjs
                       · toolkit_gate_checknames_V1_0_0.txt.{FULL,QUICK}
05_failure_log/ 06_future_updates/ 07_handoff/    registers + templates, IDs restart at 0001
src/ tests/ deploy/ tools/                        EMPTY — 7b fills them
```

**The gate suite runs today and is 14 named checks + the ported build gate.** Run it:

```bash
bash 08_validation/run_toolkit_gates.sh --quick
```

> ⚠️ **IT IS CORRECTLY RED, AND THAT IS THE POINT.** 12 of 14 checks fail because their subjects
> have not moved yet — no DLLs, no installers, no hub, no `.cs`, no oracles. **The two that PASS
> are the two whose subject already exists** (the drop). A suite that went green over an empty
> repo would be the vacuous pass this project has met four times; this one names exactly what is
> missing and will go green as 7b lands each piece. **Treat the red list as 7b's checklist.**

## 3. The drop — and the D4a coverage gate is real, not a placeholder

`03_contracts/published_drop/` in **this** repo is the master; the toolkit's `01_contracts/` is the
copy, and the two are byte-identical today. Four files: the family map, the topology schema, the
replay-package contract, and the hospital golden.

**Per E9 the drop is PROVENANCE ONLY.** It carries no DLL sha, no `embeds_map_sha256` and no
runtime claim — every one of those has exactly one home already, and a second copy beside the field
it duplicates is how four false greens started.

**The one thing it does carry that exists nowhere else is `drift_coverage` — D4a's gate.** Every
value in it was **derived by command from the C# sources and the map**, not transcribed from
`00_Docs/drift_surfaces_V1_0_0.md`, and the derivation is committed as
`08_validation/lib/drift_coverage_V1_0_0.mjs` so the gate re-derives rather than trusting the pin.
All ten pinned key-lists were then diffed against the derivation: **10/10 MATCH.**

The relation is the corrected one, per **field** and per **`(node, variant)` key the map actually
carries** — HO-0018's correction, which is load-bearing: the C# fallback goes live the moment an
**existing** entry drops **one** field, and a gate keyed on "does a variant-less entry exist" never
sees that.

### 3.1 🚩 A new finding, derived not copied — surface 2 has a silent-unreachability trap

`insetOverrides` is built with `GetMapEntry(nt)` — **no variant** — and `FamilyResolver` files
variant-BEARING entries in the variant map only. **So a `visible_edge_*` inset written onto a
variant-bearing map entry is silently unreachable**: it looks like a correct map tuning, changes
nothing, and produces no error anywhere. The same holds for surface 3's A-8 gap.

No such entry exists today (verified: the three variant-bearing entries carry only surface-1's corr
fields). `variant_bearing_must_be_empty` in the drop manifest now asserts it stays that way.
**This is the mirror image of waiver W1 and it is not in the prose document.**

⚠️ **It also fixes the granularity, which I initially got wrong in the other direction.** I first
flagged `(L2-1,"spare")` as an uncovered key for surface 2 — it is not, because that surface's
lookup never consults the variant. **Checked by reading the call sites, not inferred from the table
shapes**, and the drift doc's "✅ complete, per field" for surface 2 is correct as written.

### 3.2 One declared waiver, and one thing that is NOT a waiver

- **W1 — `("L2-7","")`, both corr fields.** The map carries L2-7 only as `spare`/`space`. Declared,
  with its trigger, per the standing rule that a known hole must be declared and never omitted to
  make a fresh gate green on arrival.
- **`("L0-1","")`'s X is a NOTE, not a waiver — and the gate forced that correction.** I wrote it
  as waiver `W2` and the coverage check rejected it on the first run: a waiver exempts a key the
  **C# table holds**, and the C# table holds nothing for L0-1's X, so there was no obligation to
  waive. **Forgiving a violation that does not exist is how a waiver list rots into a place where
  real holes hide.** Recorded as a note instead; the mechanism is still worth knowing.

---

## 4. The gates: ported, not rewritten

`toolkit_build_gate.sh` is **`08_validation/build_gate.sh` copied at sha `eea63ff8…`** (recorded in
its own header so a later session can diff it against its ancestor rather than take the header's
word). Its checks, names, numbers, messages and order are **unchanged**. What the port changed is
exhaustively listed at the top of the file: four path constants, and **T0.6**.

**T0.6 is the one check whose relation changed, and it changed because its subject did.** It existed
to make a wrongly-deep relative climb visible — *too deep was loud, too shallow was silent and
scored a full green over the wrong tree* (FL-0019 e). **7b deletes the climb**, so that failure
becomes unreachable, and *a check whose failure mode is unreachable is not a check.* It now asserts
the relation the local layout actually has: **fixture == drop file == drop pin**, a three-way
identity. Two legs would pass if somebody edited both, and editing `01_contracts/` is exactly what
the toolkit may not do. The original comment block is kept verbatim above the new one as history.

`toolkit_gate.mjs`'s **T3, T6 and T7 are ports of live sync_gate checks**, including FL-0023's
ownership-by-nearest-sha fix and the `matchAll` anchors. **T1, T2, T8, T9 are new.**

---

## 5. ⭐ Two self-inflicted defects, both caught by running the thing rather than reading it

Recorded because the pattern is the point, not the bugs.

**(a) The waiver that forgave its own trigger.** Mutant **M2** adds a variant-less L2-7 family
carrying neither corr field — *precisely the event W1's prose names as its expiry condition*. The
gate stayed **GREEN**: the hole was still "open" by the coverage test, so W1 went on forgiving it.
**A waiver that survives the falsification of its own reason is not a waiver, it is a hole with a
comment on it.** Fixed by giving waivers a machine-checkable `premise`, asserted from the map every
run.

**(b) The name baseline that could only see failures.** `ok` lines are padded to align with `FAIL`
(`  ok    [T1]` vs `  FAIL  [T1]`), and my extractor matched exactly two spaces. **Only FAILING
checks reached the baseline** — caught because a 14-check run blessed 12 names. That inverts what
the baseline is *for*: a passing check would never have been baselined, so **deleting one would have
been invisible**, and a check that got *fixed* would vanish from the capture and read as a removal.
FL-0010's class, inside the guard against FL-0010's class.

Also **M5**: renaming a C# table away left the derivation happily parsing the renamed one, because
the locator used `indexOf` and a **superstring matched** — FL-0015 exactly, one function away.
Fixed with a word-boundary match.

**Final mutant state: 8 mutants, control GREEN, seven wrong states RED each naming the right
thing.** Harness committed at `08_validation/mutants_drift_coverage.mjs`; it builds its own lab off
`/storage` and never touches the real tree.

---

## 6. Three deliberate departures from plan §6 — recorded so nobody "restores" them

Full reasoning in the toolkit's `00_Docs/toolkit_decisions_V1_0_0.md`. In one line each:

1. **No `builds/r2025/` + `builds/r2023/`.** `DEDARMS.csproj` has **no `<Compile Include>` at all**
   — it relies on the SDK's implicit glob, rooted at the project file's own directory — and its
   `<EmbeddedResource>` paths are project-relative with load-bearing `<LogicalName>`s (D3).
   Separating the project file from its sources is a **semantic change requiring a rebuild to
   prove**, and Phase 7 must not re-bless. §6's `builds/` split was also authored under the
   five-assembly design **decision 6.0 replaced with two**.
2. **No `nuget.config`.** None exists today; restore works offline through the user-level config.
   Adding one *changes restore behaviour* — its only function — for no stated problem.
3. **No second architecture document.** `docs/platform_architecture.md` (~22 KB) already **is** the
   platform contract and moves here intact in 7b. §6's four-file `00_Docs/` list **predates Phase 6
   entirely**. Two prose copies of one contract in one repo is the thing §4 of the prep briefing
   argues against, applied one level in.

> ⚠️ **These are exactly the class of thing the prep briefing's §8.3 warned about** — deltas the
> plan predates that the briefing's own §2 did not list. There will be more.

---

## 6b. 🚩 A COLD REVIEW OF PHASE 7a IS QUEUED AHEAD OF 7b — Mayo's call, 2026-07-31

> **READ THIS BEFORE §7. The next session is NOT 7b.**
>
> **`Download/DEDARMS_PHASE7A_REVIEW_PREP_2026-07-31.md`** — self-contained, written by this
> session for a cold reviewer. It carries the claim list to attack, six suggested lanes, the trap
> list, and my own ranked weak points.
>
> **Its §2 is the one thing that must not be missed: 11 of the toolkit's 14 checks have NEVER
> PASSED, and ~900 lines of the ported build gate have never executed at all.** A check proved only
> to go RED is unverified in the direction that matters. The review's highest-value lane is a
> **staging lab** — `cp` (never `mv`) the add-in tree into a scratch toolkit at the 7b target
> layout and run the suite — which converts "never green" into a measurement **without performing
> 7b**.

### THREE FINDINGS MADE AFTER THIS HANDOFF WAS FIRST WRITTEN, while preparing that briefing

All three are in code that had never run. **Treat that as the base rate, not as evidence the author
has caught up.**

1. ✅ **FIXED — T8 could never pass, at any count, on either oracle.** The selftest check parsed for
   `10/10`, which is how **every handoff and the plan WRITE** the result and is **not a string
   either oracle prints** — they print `selftest: 10 passed, 0 failed.` A permanent red wearing a
   plausible failure message. Now parses the real line and asserts **both** halves (`passed` alone
   accepts `10 passed, 3 failed`), verified against both real oracles and three wrong states.
   **No check name moved, so no re-bless.** ⚠️ **I built a check against a format I had read about
   rather than one I had observed.**
2. 🚩 **NOT FIXED, and it will bite 7b — `Directory.Build.props`.** Measured: today it sits one
   level above `DEDARMS.Tests` and MSBuild's upward walk finds it. **7a's target layout makes
   `src/` and `tests/` SIBLINGS, so `tests/DEDARMS.Tests/` would walk to the repo root and never
   find `src/Directory.Build.props`** — silently losing `<LangVersion>latest</LangVersion>` (the
   tests compile 21 source-linked production files) and a `<NoWarn>` the file itself documents as
   **LOAD-BEARING for DEDARMS.Tests**. **Recommendation: put it at the toolkit ROOT**, which means
   changing the two places the ported gate asserts and copies `$SRC/Directory.Build.props`.
   **Deliberately left for the review** — it is a layout decision and deserves a second pair of
   eyes rather than a quiet edit by the person who caused it.
3. 🚩 **NOT FIXED — I introduced an `ok — skipped in --quick` line, which is FL-0009's exact
   shape:** a green line meaning *"I did not look."* Mode-gated and honestly labelled, but the SLD
   repo solves the same problem by making the check **not exist** in quick mode (24 full / 22
   quick), which is why D7's baseline is mode-aware. **Recommendation: drop it from `--quick` and
   re-bless that baseline at 13 names.** Escalated rather than churned.

---

## 7. Successor — PHASE 7b, and the derived removal list it needs

**Read `Download/DEDARMS_PHASE7_PREP_2026-07-31.md` first; it is still correct for 7b.** Its §1
(the check-name re-bless is deliberate) and §5 (the trap list) apply unchanged.

### 7.1 🚩 THE REMOVAL LIST, DERIVED FROM TODAY'S 24 CHECKS — do not use the plan's numbering

The prep briefing's §8.2 asks for this and it is the single most valuable thing in this handoff.
**The plan's E7 removal list (`3,4,6,7,8,17,18`) is against a 20-check sync_gate that no longer
exists.** Today there are 24. Classified by *whether the subject leaves the repo*:

| # | Check | 7b |
|---|---|---|
| 1 | family map ×2 byte-identical | **STAYS, and "×2" stays TRUE** — see 7.2 |
| 2 | viewer == golden viewer | stays |
| 3 | add-in DLL carry copies | **REMOVE** → toolkit T3 |
| 4 | Replay2023 DLL carry copies | **REMOVE** → toolkit T3 |
| 5 | Revit `.addin` manifests well-formed | **REMOVE** → toolkit T5 (in the ported build gate) |
| 6 | `install_replay2023.ps1` pin | **REMOVE** → toolkit T6 |
| 7 | `install_dedarms.ps1` pins | **REMOVE** → toolkit T6 |
| 8 | DLL embed == manifest `embeds_map_sha256` (honesty) | **REMOVE** — it opens a DLL that has left. ⚠️ **See 7.3, this one leaves a GAP** |
| 9 | DLL embed == current family map (lockstep) | **🚩 KEEP — this is E9's "check 8"** |
| 10 | `ADDIN_ROOT` resolves | **DECISION REQUIRED — see 7.4** |
| 11 | blessed carry-copy resource names (D8a) | **REMOVE** → toolkit T3 |
| 12 | `runtime_unverified` prose | **REMOVE** → toolkit T7 |
| 13–20, 23, 24 | P2/P3/P4/P5-engine/P6 | stay |
| 21 | add-in CLAUDE.md shipping DLL sha anchor | **REMOVE** → toolkit T7 |
| 22 | add-in CLAUDE.md Replay2023 sha anchor | **REMOVE** → toolkit T7 |

**Plus ONE ADDITION, required by §7:** the publisher-side staleness check — *`published_drop`'s shas
equal the LIVE upstream files*. It reads only local files, so it **never soft-skips**, which was
E9's whole objection to the drafted alternative. Append at the END of its phase (E1's rule).

**Arithmetic: 24 − 10 removed + 1 added = 15 full, 13 quick** (if check 10 stays).
⚠️ **The plan's "13–14" is a 20-check-era number. The coincidence with 14 is not evidence.**

### 7.2 Why check 1 keeps its `×2` — and it is better than the plan's "one copy instead of two"

Point `copies[1]` at **the drop copy** rather than at the moved tree. The lockstep chain is then
complete with **no cross-repo filesystem read anywhere**:

```
canonical 07_data  ==  published_drop copy      SLD check 1   (still ×2, still true)
published_drop     ==  the toolkit's import     toolkit T1
toolkit's import   ==  what the fresh DLL embeds toolkit T4    (already wired)
```

### 7.3 ⚠️ A REAL COVERAGE GAP 7b MUST CLOSE, and I did not close it

Removing check 8 leaves **nothing asserting that the BLESSED carry copy embeds the map it claims
to.** Toolkit `T4` reads the **freshly built** DLL; toolkit `T3` checks the blessed copy's *sha and
resource names* but **not its embed**. Those are different artifacts — the distinction D8a exists
for. **Add an embed check against the blessed carry copy to `toolkit_gate.mjs` in 7b** (the lib is
already imported and `extractEmbeddedMapSha` is already there). It is a new check name, and 7b is
re-blessing the toolkit baseline anyway.

### 7.4 The `ADDIN_ROOT` decision, with the argument on both sides

Plan step 9 says repoint it to `'../../DEDARMS Revit Toolkit'`, and the resolution is pre-verified.
**But the counter-argument is E9's own**: a check that reads the sibling repo fails on any machine
where the sibling is absent, and the toolkit now has **T7 asserting the hub-and-docs relation
itself** — so the SLD-side check is largely redundant. Deleting it would leave the drop as the
*only* seam, which is the cleaner architecture and matches E13's prediction that the const becomes
dead code.

**Recommendation: repoint it as the plan says.** It never soft-skips, both repos live side by side,
and a missing sibling *is* a real finding here. **But make it a decision, not an inheritance**, and
record which way you went.

### 7.5 The rest of 7b, unchanged from the prep briefing

Move the tree (hub + `docs/` travel together, `FLOOR_DOCS` must still name all seven) · carry the
golden into `tests/fixtures/` and repoint the csproj climb — **`:91` re-derived and CONFIRMED
correct today, the file is 95 lines, three `..` levels, and the depth is STRUCTURAL** · move the two
Python oracles and fix their own docstring usage strings, `compare_placement.py` **stays** (decide
deliberately, it is not in the plan's list) · move `.vscode/mcp.json` (**found: it is at
`13_addin/Revit Addins/.vscode/mcp.json`, 439 B — not at the repo root**) · delete the slots and
their checks in **one change-set** · write `05_revit/README.md` · resolve the ~20 `(SLD repo)`-tagged
citations.

> 🚩 **The hub must land at the toolkit ROOT as `CLAUDE.md`, byte-preserving through the sha
> ledger.** Four checks locate anchors in it **by prose**. Re-typing the ledger or restating a sha
> above it re-opens FL-0022/FL-0023. The placeholder now at that path says so and is meant to be
> overwritten wholesale.

### Carry forward

- 🚩 **The REVIT TRIP is the critical path.** Eight items wait on it; **none of the three shipping
  DLLs has ever run in Revit**, and 7a added nothing to that. Phase 7 moves files, it does not
  re-bless — **if a sha moves, stop.**
- ⚠️ **The shas' REPRODUCIBILITY claim does not survive the move** (build-location-dependent, no
  `<PathMap>`). The toolkit manifest says so beside each one. Re-establishing it is a deliberate act
  with its own re-bless, and re-blessing invalidates the evidence the owed trip exists to collect.
- ⚠️ **Still no git — FU-0002 stays open, deferred by Mayo 2026-07-31.** The snapshot is the whole
  safety net and **7b is the irreversible half.**
- ⚠️ **`00_Docs/drift_surfaces_V1_0_0.md`'s §"What Phase 7 owes this document" item 1 is now DONE.**
  Items 2 (re-homing) and 3 (re-derive the line numbers) are 7b's.
- Oracles to keep until Phase 7 is finished: `Download/DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/`,
  `Download/DEDARMS_HO0019_PRESPLIT_feature_sld_2026-07-31/`, and now
  `Download/DEDARMS_PHASE7_AUDIT_TRAIL_2026-07-31/` + the pre-phase7 snapshot.

**HO-0020 is `consumed` by this entry.**
