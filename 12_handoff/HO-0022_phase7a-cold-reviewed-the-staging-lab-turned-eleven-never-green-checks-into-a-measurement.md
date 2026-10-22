# HO-0022 — Phase 7a cold-reviewed: the staging lab turned "11 checks have never passed" into a measurement, and the gate that could never pass was the one nobody could see

| Field | Value |
|-------|-------|
| **ID** | HO-0022 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | `open` |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0021 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is still the critical path.** 7b is now blocked on **FU-0002 (toolkit)** — see §4 |
| **Exit state** | SLD repo **14/14 · 24 names full · 22 quick · build-gate 15/15 · 112 tests · 0 FAIL** · shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` ×3 · **the only SLD-repo writes are this handoff and its register row** — no `.cs`, no `.csproj`, no DLL, no gate, no contract, no doc |
| **New FL** | **FL-0001 (toolkit)** — see §2.1. Next SLD FL is still **FL-0024** |
| **New FU** | **FU-0001, FU-0002 (toolkit)** |

---

## 0. What this session was, and the one number that matters

**A cold review of Phase 7a, run before 7b, per Mayo's call.** Briefing:
`Download/DEDARMS_PHASE7A_REVIEW_PREP_2026-07-31.md`.

Its §2 named the review's central problem: **11 of the toolkit's 14 checks had only ever FAILED, and
~900 lines of the ported build gate had never executed at all.** A check proved only to go RED is
unverified in the direction that matters. The fix it proposed — a **staging lab**, `cp` never `mv` —
was the right call and is the reason this session found anything.

> ### 🚩 The measurement, and it is the whole session in one line
>
> **With the real add-in tree copied into a scratch toolkit at the 7b target layout, the suite goes
> `BUILD-GATE 15/15 · TOOLKIT-GATE 14/14 · 112 tests · D7 names UNCHANGED`.**
>
> **It did not get there on the first run. It took four defects, and every one of them was in code
> that had never executed.** Three would have surfaced on 7b's first run and cost a session; one
> would not have surfaced at all.

**No SLD-repo subject file was written** — no `mv`, no re-bless, no gate edit, no contract edit, no
doc edit. The only writes are this handoff and its register row. Verified two ways: `find -newermt`
over the whole tree returned nothing before these two files were added, and the suite is 14/14 with
the three shas re-hashed and unmoved.

---

## 1. Snapshot — §0.2's warning was correct

`Download/sld_snapshot_pre-phase7_2026-07-31.tgz` predates the toolkit and contains **only** the SLD
repo, exactly as the briefing said. Taken before any edit:

**`Download/toolkit_snapshot_pre-review_2026-07-31.tgz`** — 134,845 B, **38 entries == `find | wc -l`
on the live tree**, full `tar tzf` listing verified. FU-0002 (git, SLD repo) was **not** re-raised.

---

## 2. The four defects the lab found

### 2.1 🚩 **T0.4 COULD NEVER PASS — and the contract carried a comment asserting it would.** (FL-0001, toolkit)

`toolkit_build_gate.sh` T0.4 reads the pinned test count by name:

```js
for (const k of ["expected_passed","expected_failed","expected_skipped","expected_errors"]) …
```

`toolkit_manifest.json` declared them as **`passed` / `failed` / `skipped` / `errors`.** The gate
aborts with `artifacts.addin_tests.expected_passed is not a number`. **The one check that reads that
slot could not have passed at any count, in any state, ever.**

**And directly above those four fields sat this:**

> ⚠️ THE FOUR COUNTS ARE FLAT AND UNNESTED ON PURPOSE — **this is the exact shape the ported gate
> reads.** … every field this manifest renames is a line of that check someone has to re-derive.

**The author identified the hazard exactly, wrote the warning, and then committed the hazard the
warning describes** — while reasoning about *flat versus nested* when the real difference was a
*prefix*. Both manifests are flat; only one carries `expected_`.

**This is the deepest instance yet of the shape FL-0022 named.** FL-0022 was prose that *satisfied*
a check. This is prose that *asserts a contract matches its consumer* when it does not — and because
the build gate stops at its own preconditions in an empty repo, **nothing could contradict it.**
Fixed: fields renamed, and the history kept in `$comment_shape_history` beside them.

> **The rule to carry: a comment claiming a contract matches its reader is a claim, not a check.
> The only thing that settles it is running the reader.**

### 2.2 🚩 `Directory.Build.props` — §3.2 CONFIRMED, and the symptom is worse than predicted

HO-0021 §6b(2) predicted the tests would not find it. **Measured in the lab, both ways:**

| props location | `DEDARMS.Tests` builds with | verdict |
|---|---|---|
| `src/` (7a's target) | **24 warnings**, 0 errors | the `<NoWarn>` set is silently lost |
| repo **root** (the recommendation) | **12 warnings**, 0 errors | == the SLD-repo baseline exactly |

**The build SUCCEEDS either way.** No check goes red; only the warning count moves, and nothing pins
the warning count. So the loss of `<LangVersion>latest</LangVersion>` and of a `<NoWarn>` the props
file itself documents as **LOAD-BEARING for `DEDARMS.Tests`** (which source-links 21 production
files) would have been **completely invisible**.

**DECIDED: the props file goes at the toolkit ROOT.** That is the only location both `src/*` and
`tests/*` inherit. Applied to the gate — and it took **five** edits, not the two HO-0021 estimated:

1. `:298` the existence test → `$ADDIN_ROOT`
2. `:303-304` the ok-line → `$ADDIN_ROOT`
3. the **check NAME** — "present beside the projects" is no longer true; it is now
   *"present at the repo root, where src/ AND tests/ both inherit it"*. Build-gate names are **not**
   in the D7 baseline (that covers the 14 node checks), so no re-bless — but the name had to move.
4. `:367` the scratchpad copy source → `$ADDIN_ROOT`
5. the comment at `:363` claiming the copy *"reproduces the real layout exactly"*. **It does not, and
   the briefing flagged exactly this.** The real walk is now two levels (root → `src/` → project),
   the scratchpad's is one. Harmless — MSBuild only needs to *find* it — but the comment was going to
   be false, and a false comment about why a check is safe is this repo's most-repeated defect.

*The briefing's cited line numbers `:298-304` and `:367` were **correct**. Second consecutive session
where a re-derived citation held.*

### 2.3 🚩 **THE DEPLOY PATHS WERE NEVER PORTED** — a defect no lane in the briefing was aimed at

T5 and T5b resolve their `.addin` and staged-DLL paths against **`$SRC`**, unchanged from the SLD
tree where `deploy/` is nested inside each project folder. **This repo puts `deploy/` at the REPO
ROOT.** The port changed `SRC` and left every path expressed relative to it, so the deploy half
silently kept pointing into `src/<proj>/deploy/`.

**This is not an open layout question.** Three other places already commit to top-level `deploy/`,
and all three PASS in the lab:

- `toolkit_decisions_V1_0_0.md` — *"`deploy/` at the top level ✅ … each installer keeps its own
  nested payload folder beside it"* (E6)
- `toolkit_manifest.json` — `carry_copies[1] = deploy/DEDARMS/DEDARMS.dll`, read by **T3**
- `toolkit_gate.mjs` **T6** — `deploy/install_dedarms.ps1`, `deploy/install_replay2023.ps1`

Only T5/T5b disagreed. Repointing them is **completing the port**, not choosing a layout. Done.

> 🚩 **AND HERE IS THE TRAP, WHICH IS THE REAL FINDING.** My first lab had `deploy/` in **both**
> places — because `cp -r src/DEDARMS` carries its nested `deploy/` along — and it scored **green**.
> Removing the nested copies turned T5 and T5b **RED, naming five files that were in fact correctly
> staged.** So the "everything passes" state was reachable only by a layout in which **two unpinned
> extra copies of all three shipping DLLs exist and nothing compares them to the pinned ones.**
> A 7b that copies rather than moves lands in exactly that state and gets a full green.

### 2.4 🚩 The mutant harness poisons its own lab

`restore()` put back the sources and the map but **not the manifest**. The loop re-seeded the
manifest at the *top* of each iteration, so every mutant behaved correctly and the cost landed
entirely on the next user of that lab — which the briefing §4.3 explicitly tells the reviewer to be.

Measured: re-deriving against the lab after a full harness run gave a **false RED on the unmodified
control**, blaming a missing waiver rather than a dirty fixture. (M6, the last mutant, deletes the
waivers.) Fixed. Also fixed: `LAB` was a hardcoded path from a dead session, so the harness could
not run at all — now `DRIFT_LAB=…`, and the §SETUP note that implied `drop_manifest.orig.json`
exists in `01_contracts/` (it does not; it is a second copy you make) now says so.

---

## 3. The claim list, adjudicated

| # | Claim | Verdict |
|---|---|---|
| C1 | snapshot complete and readable | ⚠️ **for the SLD repo only** — §0.2 was right; the toolkit is now covered too |
| C2 | 7a touched nothing else in the SLD repo | ✅ **TRUE** — `find -newermt` clean, suite 14/14 |
| C3 | `toolkit_build_gate.sh` is a port, "path constants and T0.6" only | ⚠️ **SUBSTANTIVELY TRUE, LITERALLY FALSE** — see §3.1 |
| C4 | the drop is provenance only | ✅ **TRUE** — no DLL sha, no `embeds_map_sha256`, no runtime claim in `drop_manifest.json` |
| C5 | every `drift_coverage` value derived by command, 10/10 matched | ✅ **TRUE** — control arm green against the real map + real sources |
| C6 | drift gate mutant-proved, 8 mutants, control green, 7 red | ✅ **TRUE, and re-run** — now **10 mutants**, control green, 9 red |
| C7 | granularity: surface 1 per `(node,variant)`, 2/3 per node | ✅ **TRUE** — re-derived cold from the call sites, §3.2 |
| C8 | the three §6 departures are correct | ✅ accepted — each is argued from a measurement |
| C9 | §7.1's removal list derived from today's 24 checks | ✅ **TRUE and independently reproduced** — §4 |
| C10 | shas unmoved, `runtime_unverified` true ×3 | ✅ **TRUE** — re-hashed this session |

### 3.1 C3 — the diff was run. **8 hunks. Nothing smuggled.**

Ancestor confirmed at **`eea63ff8ea17817a…`**, so the port's base is what its header says.
All 8 hunks classify as path constants, T0.6, or T4. **No check was silently weakened, no message
softened, no assertion dropped.** The substance of the claim holds and that is the important result.

**But the header said "exhaustively" and was not.** Three gaps, all now written into it:

- **`TESTS` and `DROP_MANIFEST`** are new constants the list never named; **`SCRATCH`** changed too
  (deliberately — the two repos must not share a scratchpad or a `flock` key, since FL-0012 now
  spans two repos on one machine).
- *"their messages … are unchanged"* — **false.** T0.4's message names the toolkit manifest.
- *"T0.6 — **the one check** the port changed"* — **false.** **T4's relation changed as well**: its
  third leg moved from this repo's `family_map.sha256` to the **drop's** pin, plus a new
  missing-pin failure branch. It is well reasoned *at the check* and the reasoning is right — a
  reference the consumer can edit proves nothing about the consumer — but the top-of-file summary
  denied it.

**That is FL-0022's shape in a header: a property asserted where nothing verifies it.** The block
now names every hunk, cites the reproducible `diff` command, and separates the port's changes from
this review's.

### 3.2 C7 re-derived cold — 7a got it right, including the part it withdrew

| Surface | Call site | Variant consulted? |
|---|---|---|
| 1 | `AlignTables.cs:41,179` → `Corr(table, nodeType, variant)` | **yes** → per `(node, variant)` |
| 2 | `DetailLinePlacer.cs:53` → `GetMapEntry(nt)`; `FedEdgeExtender.cs:161-163` keys on `nodeType` | **no** → per node |
| 3 | `EquipmentLabelPlacer.cs:111` → `GetMapEntry(NodeType)?.FlippedTextRightGapPx ?? A8…` | **no** → per node |

Confirmed. 7a's withdrawal of its provisional `(L2-1,"spare")` flag was correct.

### 3.3 §4.4 — the untested mutant shape, now **M7/M7b**, and it found something

§4.4 asked whether a C# table in a *different but legal* shape could parse **partially** and
silently under-report. **It can.** `csVariantTable` anchors on `indexOf("new(")`, so the ordinary
edit *"make the generic type explicit"* removes the token it anchors on and the scan runs forward
into whatever comes next.

**Measured: with only the X table explicit-typed, the derivation returned five keys — the WRONG
five, including `["L0-1",""]`, which that table does not hold. It did not fail.**

§4.4's reasoning was right: the **`declared ⊆ derived` subset leg caught it.** But —

> 🚩 **READ THE MESSAGE IT PRODUCES:** *"declared `["L2-7","space"]` is NOT in the source — **the pin
> is stale**."* **The pin is not stale. The parser broke.** And the remedy that message suggests —
> re-pin — would turn the gate **GREEN over a derivation reading the wrong table**, and therefore
> under-reporting obligations, which is the exact failure the whole file exists to prevent. **One
> plausible step from a correct red to a vacuous green.**

Left as a mutant with the diagnosis in its comment rather than "fixed", because the subset leg *is*
doing its job. What is wrong is the diagnosis it offers. **M7b** (both tables) fails loudly and
correctly. Harness now: **10 mutants, control GREEN, nine RED.**

### 3.4 §3.3 — the `ok — skipped` line is **gone**, QUICK re-blessed to 13

The reviewer's call, and the briefing's own counter-argument was the stronger one. `[T8] both Python
oracle selftests pass` no longer *exists* in `--quick` rather than passing-as-skipped. **FULL 14 /
QUICK 13**, baseline re-blessed deliberately in the same change-set.

Visible effect on the real repo: the honest count went from **"3 passed, 11 failed of 14"** to
**"2 passed, 11 failed of 13"**. One of 7a's three passes was a green line meaning *"I did not
look"*, exactly as FL-0009 describes.

### 3.5 §4.6/§4.7/§4.8/§4.9/§4.10/§4.11 — swept

- **§4.6** measured mechanically. The one that matters: **`toolkit_manifest.json`'s
  `artifacts.addin_dll.embeds_map_sha256` is read by NO toolkit gate** — T4 reads the *drop's* pin
  instead. So it is a second copy of a fact with no check on it, which **corroborates and sharpens
  HO-0021 §7.3's gap**. Also unread: all six `identities/*` values, under a `$comment` declaring
  them load-bearing.
- **§4.8** ✅ confirmed — the ported gate really does read `hardcoded_resource_names` off
  `addin_dll`, and covers both assemblies. The `$comment` is accurate.
- **§4.9** ✅ confirmed, milder than stated. `drift_surfaces_stub`'s bullets do not claim an
  SLD-side check; its **framing sentence** *"Both repos gate on that block"* does, and no SLD-side
  gate exists. **Also found: the stub says the `compare_placement`-family oracles are "moved" to
  `tools/`, while HO-0021 §7.5 says `compare_placement.py` STAYS.** Two 7a documents disagreed —
  **resolved in favour of MOVING by decision D-B (§6.1); the stub's wording has been tightened.**
- **§4.10** ✅ confirmed — `README.md:15` had a header-less table. **Fixed.** It was the only one;
  a full sweep of every `.md` found no other broken table, and only two unresolved links (both to
  `docs/platform_architecture.md`, which arrives in 7b).
- **§4.11** ✅ **settled by the lab, and the answer is good news:** with all 14 checks GREEN,
  `D7 check-name baseline (FULL) — 14 names, unchanged`. **The names do not move when the checks
  finally pass.**

---

## 4. Lane E — the removal list, reproduced independently **before** reading §7.1

Written from `sync_gate.mjs` + `current_state_manifest.json` alone, then compared. Full working:
scratch copy retained in this session's notes; the conclusion is here.

**My independent list and HO-0021 §7.1 agree on 10 of 11 candidate removals** — checks
**3, 4, 5, 6, 7, 8, 11, 12, 21, 22** — and the eleventh is **check 10 (`ADDIN_ROOT` resolves)**,
which §7.4 already flags as *DECISION REQUIRED* with the argument on both sides. **That is a
convergence, not a disagreement.** §7.1 is sound and 7b can use it.

Two things also confirmed independently:

- **Check 9 (lockstep) is correctly KEPT.** `sync_gate.mjs:498-502` says it in the code: it
  *"compares TWO MANIFEST FIELDS and never opens a DLL"*. Its subject does not leave.
- **§7.2's fix for check 1 is better than my own.** I flagged it as needing a name change (its
  second copy, `13_addin/…/Sld/Resources/…`, leaves). Pointing `copies[1]` at the **drop** keeps
  `×2` true with no cross-repo read. Adopt §7.2.

### 4.1 🚩 **The one thing my list caught that §7.1 did not — and it blocks 7b**

**Removing check 5 deletes the only home of NINE assertions, and the destination §7.1 names asserts
none of them.**

§7.1 maps check 5 → *"toolkit T5 (in the ported build gate)"*. **Toolkit T5 is a different check.**
It asserts `.addin` *identity* against the source: `<Assembly>` vs `<AssemblyName>`,
`<FullClassName>` composed from `App.cs`, other `FullClassName`s resolving to declared types.

Verified by `grep`: **`AddInId`, `VendorId`, `RevitAddIns` and the well-formedness scanner appear
nowhere in `build_gate.sh` or in its port.** What loses its home:

1. real XML well-formedness (unescaped `&`, `--` in a comment, mismatched tags) — **FL-0019(b)**
2. `<RevitAddIns>` root · 3. `Type` ∈ {Application, Command} · 4. required fields ·
5. AddInId is a GUID · 6. AddInId unique in file
7. **AddInId STABILITY against the `revit_addin_ids` pin** — the GUIDs the manifests themselves say
   **MUST NEVER CHANGE**
8. **pair identity** — project manifest byte-identical to its deploy twin *(added 2026-07-31, caught
   by its own mutant)*
9. pin-completeness sweep

**#1 is the one that costs a Revit trip**: a malformed `.addin` makes Revit skip the add-in with no
error the user ever sees. **#7 is the one that loses user state silently.**

**And the obligation was recorded nowhere.** `toolkit_manifest.json`'s `$comment_ids` said re-homing
was *"deliberate follow-on work … see `07_handoff/`"* — **`07_handoff/` is empty and was empty when
that sentence was written.** Now **FU-0002 (toolkit), P0, marked as blocking 7b**, with all nine
assertions and their mutants enumerated. `$comment_ids` and `$comment_vendor` were corrected in
place — the latter claimed *"VendorId is asserted … by the gate"*, which is **false in both repos**
(**FU-0001**).

---

## 5. What changed on disk

**SLD repo: nothing.**

**Toolkit repo** (snapshot taken first):

| File | Change |
|---|---|
| `01_contracts/toolkit_manifest.json` | `expected_` prefix on the four counts (§2.1) · `$comment_shape` corrected + `$comment_shape_history` · `$comment_vendor` and `$comment_ids` corrected (§4.1) |
| `08_validation/toolkit_build_gate.sh` | props → repo root, 5 edits (§2.2) · T5/T5b deploy paths (§2.3) · port header made actually exhaustive (§3.1) |
| `08_validation/toolkit_gate.mjs` | T8-selftests **does not exist** in `--quick` (§3.4) |
| `08_validation/toolkit_gate_checknames_V1_0_0.txt.QUICK` | **re-blessed 14 → 13**, deliberately, in this change-set |
| `08_validation/mutants_drift_coverage.mjs` | `DRIFT_LAB` env · `restore()` restores the manifest (§2.4) · **M7/M7b added** (§3.3) · SETUP note corrected |
| `README.md` | header row on the second table |
| `06_future_updates/` | **FU-0001**, **FU-0002**, register updated (next ID `FU-0003`) |

**No `.cs`, no `.csproj`, no DLL, no installer, no `.addin`, no sha, no drop file.**

---

## 6. Successor — PHASE 7b

**HO-0021 §7 remains the plan and is still correct.** Read it. Amendments:

1. 🚩 **FU-0002 (toolkit) is a BLOCKER, not backlog.** Removing sync_gate check 5 without landing
   its replacement in the same change-set leaves nine assertions with no home in either repo.
2. **`Directory.Build.props` goes at the toolkit ROOT.** Decided and applied to the gate; 7b just
   has to put the file there.
3. **`deploy/` goes to the top level and the nested `src/<proj>/deploy/` folders must NOT survive
   the move.** If they do, the suite goes green over duplicate unpinned DLLs (§2.3). **`mv`, or
   `cp` then delete — but verify the nested ones are gone.**
4. **Adopt §7.2 for check 1** (`copies[1]` → the drop).
5. **The `05_revit/` Python oracles are NOT under `13_addin/`.** `check_capture_complete.py` and
   `diff_replay_csv.py` live in `05_revit/`; the briefing's own lane-C instruction ("copy
   `13_addin/Revit Addins/*`") would have missed them.
6. **Re-run the staging lab after the move.** The recipe is in §7 below; it is now the cheapest
   proof this repo has.

### 6.1 🚩 TWO DECISIONS TAKEN BY MAYO, 2026-07-31 — BINDING ON 7b

Both were left open by HO-0021 (§7.4 and §7.5). The review put the evidence in front of them and
**Mayo took both, adopting the review's recommendation in each case.** They are decisions, not
suggestions; **do not re-litigate, and do not silently inherit HO-0021's wording where it differs.**

#### D-A. `ADDIN_ROOT` and check 10 are **DELETED**, not repointed

**This reverses HO-0021 §7.4's recommendation, on evidence §7.4 did not have.**

> **After the other ten removals, check 10 would be the ONLY remaining consumer of `ADDIN_ROOT`
> in `sync_gate.mjs`.** Checks 3, 4, 5, 6, 7, 8, 11, 12, 21 and 22 are all on the removal list, and
> §7.2 repoints check 1's `copies[1]` at the drop rather than the add-in tree. So a repointed
> check 10 is **a check asserting that the constant it uses resolves, where nothing else uses that
> constant.**

And the check's own stated reason dies with them. `sync_gate.mjs:516-522`:

> If that root ever stops resolving […] then **five P1 checks and two P5 checks** each fail with
> their own per-file "missing", and the actual cause appears in none of them. One explicit
> assertion on the root turns seven vague reds into one true red plus six consequences.

**Those seven checks are precisely the ones 7b deletes.** The failure it disambiguates becomes
unreachable — the same argument 7a itself used to rewrite T0.6, applied one check over.

Its second job is already covered on the owning side: toolkit **`[T7] the hub still indexes every
feature document`** asserts the same `FLOOR_DOCS` relation and **went GREEN in the staging lab**
(`hub + 7 linked docs`). Measured, not promised. After 7b the SLD repo has no hub to index.

Deleting it also removes the only cross-repo filesystem read anyone proposed, which leaves **the
drop as the sole seam** — the architecture E9 and E13 both predicted.

> ⚠️ **CONSEQUENCE FOR THE ARITHMETIC, AND IT CHANGES HO-0021 §7.1's NUMBERS.**
> **11 removals + 1 addition = 14 FULL / 12 QUICK**, not the 15/13 §7.1 states.
> §7.1's figure assumed check 10 stayed and says so. **This is the review's independent Lane E
> count, which reached 11 removals before reading §7.1.** Re-bless both baselines to 14 and 12,
> and name the eleventh removal in that change-set.

#### D-B. `compare_placement.py` **MOVES** to the toolkit's `tools/`, with the other two oracles

**This supersedes HO-0021 §7.5's "`compare_placement.py` stays".** §7.5 flagged it as undecided and
gave no argument for staying; the evidence points the other way:

- **Its primary input is the add-in's own output** — the Placement CSV from
  `PipelineResult.ToPlacementCsv`. Its second input is the `WITH_GEOMETRY` topology, which the
  toolkit already holds via the drop. Both inputs are available on the toolkit side.
- **The shipped add-in tells its user to run it.** `SLDPaneControl.cs:233` puts the literal string
  `"compare_placement.py."` in the Revit UI, and three more add-in sources cite it
  (`PipelineResult.cs:64`, `DevicePlacer.cs:308`, `SLDPaneControl.cs:718/736`). Leaving it behind
  points a user-visible instruction into a repo that user may not have.
- Splitting a three-tool oracle set across two repos needs a reason, and there was none on record.

> 🚩 **THE CAVEAT, AND IT IS WHY THIS IS NOT A CLEAN COPY.** `compare_placement.py` has **NO
> `--selftest`** — 0 occurrences, against 10 and 18 cases in its two siblings, which is exactly what
> T8's selftest check pins. **So it cannot join that pin as it stands.** Move it into `tools/`,
> extend T8's *presence* assertion to all three, and land **FU-0003 (toolkit)** to give it a
> selftest so it can join the *selftest* assertion. Moving a 320-line trip-critical tool into a
> repo where nothing checks it is the same shape as the gap FU-0002 exists to close.

**Fix the loser in the same change-set.** `00_Docs/drift_surfaces_stub_V1_0_0.md` already said the
`compare_placement`-family oracles move; that sentence is now correct and has been tightened to say
so unambiguously. **HO-0021 §7.5 is `consumed` and must NOT be edited** — record beside, never edit.
This section is that record.

### 7. How to rebuild the lab (15 minutes, and worth it every time)

```bash
LAB=/root/toolkit_lab; rm -rf $LAB; mkdir -p $LAB
cp -r "<toolkit>"/. $LAB/                                   # COPY. never mv.
A="<sld>/13_addin/Revit Addins"
for p in DEDARMS DEDARMS.Lab DEDARMS.Replay2023; do cp -r "$A/$p" $LAB/src/$p; rm -rf $LAB/src/$p/obj; done
rm -rf $LAB/src/*/deploy                                    # ⚠️ §2.3 — the nested ones must go
cp "$A/Directory.Build.props" $LAB/                          # ⚠️ §2.2 — ROOT, not src/
cp "$A/DEDARMS.sln" "$A/.editorconfig" $LAB/src/
cp -r "$A/DEDARMS.Tests" $LAB/tests/DEDARMS.Tests; rm -rf $LAB/tests/DEDARMS.Tests/{bin,obj}
mkdir -p $LAB/tests/fixtures
cp $LAB/01_contracts/hospital_golden_WITH_GEOMETRY.json $LAB/tests/fixtures/hospital_golden.json
cp -r "$A/DEDARMS/deploy/DEDARMS" $LAB/deploy/DEDARMS
cp "$A/DEDARMS/deploy/install_dedarms.ps1" $LAB/deploy/
cp -r "$A/DEDARMS.Replay2023/deploy/DEDARMS.Replay2023" $LAB/deploy/DEDARMS.Replay2023
cp "$A/DEDARMS.Replay2023/deploy/install_replay2023.ps1" $LAB/deploy/
cp "<sld>/05_revit/"{check_capture_complete,diff_replay_csv}.py $LAB/tools/   # ⚠️ 05_revit, not 13_addin
cp "<sld>/13_addin/CLAUDE.md" $LAB/CLAUDE.md; cp -r "<sld>/13_addin/docs" $LAB/docs
# then, in tests/DEDARMS.Tests/DEDARMS.Tests.csproj:
#   ..\DEDARMS\  ->  ..\..\src\DEDARMS\      (and the same for DEDARMS.Replay2023)
#   the 3-level 09_tests climb  ->  ..\fixtures\hospital_golden.json
bash $LAB/08_validation/run_toolkit_gates.sh
```

Expect **BUILD-GATE 15/15 · TOOLKIT-GATE 14/14 · 112 tests · D7 unchanged**, and
**`[T0.3] … 12 warnings`** — if that reads **24**, the props file is in the wrong place.

### Carry forward

- 🚩 **The REVIT TRIP is the critical path.** Eight items wait on it; **none of the three shipping
  DLLs has ever run in Revit.** This review added nothing to that queue and moved no sha.
- ⚠️ **Still no git — FU-0002 (SLD repo) stays open, declined by Mayo 2026-07-31 and not re-raised.**
  Snapshots are the whole safety net: `toolkit_snapshot_pre-review_2026-07-31.tgz` and
  `sld_snapshot_pre-phase7_2026-07-31.tgz`. **7b is the irreversible half — take a fresh pair.**
- ⚠️ **FL/FU/HO numbers are now TWO sequences and they will collide.** Always say which repo.
  Next: **HO-0023 / FL-0024 / FU-0012 (SLD)**; **HO-0001 / FL-0002 / FU-0004 (toolkit)**.

  > 🚩 **THE FIRST COLLISION IS ALREADY LIVE, AND IT IS THE WORST-CASE PAIR:**
  > **`FU-0002 (SLD repo)` = "Put the repo under git" — DECLINED by Mayo 2026-07-31.**
  > **`FU-0002 (toolkit)` = re-home the AddInId pin — BLOCKS 7b.**
  > One is a declined process change; the other is a blocker. **A bare "do FU-0002" resolves to
  > either, and the wrong resolution either re-litigates a settled decision or skips 7b's blocker.**
  > It happened within a day of the register warning about it, and it happened in a *session-opening
  > instruction* — the one place a cold reader has no context to disambiguate from.
  > **Never write a bare FU/FL/HO number again. Tag the repo every time, including in prompts.**
- ⚠️ **The base rate has not changed.** HO-0021 §6b said its own three findings were the base rate,
  not evidence of having caught up. This session found four more in the same code, and the one that
  mattered most — §2.1 — was invisible to reading and obvious to running. **Run the thing.**

**HO-0021 is `consumed` by this entry.**
