# HO-0027 — Trip-scoped fixes: the dead instructions are gone, and the class that produced them is unguarded

| Field | Value |
|-------|-------|
| **ID** | HO-0027 |
| **Written** | 2026-08-02 |
| **Session** | 2026-08-02 — trip-scoped staleness fixes, acting on the 2026-08-02 audit. ⚠️ **Twin entry: HO-0005 (toolkit)** — one session, two repos, **neither entry is complete alone** |
| **Status** | `open` |
| **Continuation state** | `clean` |
| **Work stream** | Trip preparation — the *dead runnable instruction* class from `00_Docs/staleness_audit_2026-08-02.md` |
| **Gates last run** | 2026-08-02, **after** the edits. **SLD `bash run_all_gates.sh` → 13/13 · sync 14/14 · behavior 52/52 · names 14/12.** Toolkit `bash 08_validation/run_toolkit_gates.sh` → **build 15/15 · gate 16/16 · 3/3 · names 16 · 112 tests.** **Both run sequentially, never at once (FL-0012). Identical to the pre-edit baseline on both sides.** |
| **DLL re-bless owed?** | `no` — no `.cs`, no DLL, no `01_contracts/`/`03_contracts/` file was opened. Shas `be6ae51a` · `2e86b97d` · `1a3b7ead` **UNMOVED**, `runtime_unverified` **×3** |
| **Golden re-freeze owed?** | `no` — golden-inert; documentation only |
| **Blocked on** | `—` |
| **Next action** | **The Revit trip (HO-0005, this repo).** Nothing on the phone blocks it. If instead doing desk work: **FU-0014** package A. |

---

## 1. Where the work stands

**The three findings a person would actually have tripped over on the Revit trip are fixed, in both
repos, and every repointed path was proved to exist by `ls` in-session.** The scope was deliberately
**trip-scoped, not audit-scoped**: the audit found ~25 sites, this session fixed the ones that are
*dead runnable instructions*, and **everything else is deferred by name in FU-0014 / FU-0007
(toolkit)** rather than silently dropped.

**The registers were raised this time.** The audit was report-only by decision; that decision is
spent. **FL-0025 + FU-0014 + this handoff here; FL-0004 + FU-0007 + HO-0005 in the toolkit.**

## 2. What changed this session

**This repo — `CLAUDE.md`, two edits, nothing else:**

1. **`:380`/`:384` — the dead build + deploy paths (audit B1/E2).** Said build from
   `Revit Addins/DEDARMS/` and deploy with `Revit Addins/DEDARMS/deploy/install_dedarms.ps1`.
   **`Revit Addins` exists in neither repo** — `find` over both trees returns nothing. Repointed to
   `src/DEDARMS/` + `src/DEDARMS.Lab/` and `deploy/install_dedarms.ps1`, **tagged `(toolkit repo)`**
   following the sibling's own convention for `(SLD repo)` citations
   (`DEDARMS Revit Toolkit/CLAUDE.md:47-55`). The deploy line was wrong in **both** halves:
   `src/DEDARMS/deploy/` does not exist either — the installer is at that repo's **top-level
   `deploy/`**.
   ✅ **The paragraph was repointed, not rewritten.** The still-true claims in it survive verbatim:
   `-SkipLab`, the sha-verification, the mark-of-the-web clearing, and *"There is no longer a
   post-build copy step — the `DeployAddin` xcopy was removed in separation Phase 5c."*
2. **`:105` — the `.cs` breakdown the two repos disagreed on (audit E1).** `25/36/7/1 of 69` and
   `5 Lab files` → **`27/37/7/1 of 72, recounted 2026-08-02`** and **6**.
   🚩 **The total was correct and the breakdown was wrong** — *"**100** source `.cs` files"* still
   measures exactly 100. **It was left untouched.** A half-current sentence is why this survived
   every cheap check; the toolkit's `CLAUDE.md:78` has said **72** correctly the whole time, and
   **this repo was the stale side.**

**Toolkit — `tests/DEDARMS.Tests/README.md`, one pass, four sites.** Full detail in **HO-0005
(toolkit)**; the summary is that `:47` and `:50-51` named a gate script and a contracts directory
that are the *sibling's*, and `:62` described a 14-gate suite with a gate 13 that no longer exists
anywhere.

**Registers raised:** **FL-0025**, **FU-0014**, this handoff (here) · **FL-0004**, **FU-0007**,
**HO-0005** (toolkit) · and a **dated disposition section appended** to
`00_Docs/staleness_audit_2026-08-02.md`, whose closing line *"Report only — nothing in this document
has been acted on"* had become false. **Appended, never rewritten — record beside, never over.**

## 3. What is currently true on disk

- **SLD:** 13 gates · sync 14/14 · behavior 52/52 · check-names 14 FULL / 12 QUICK. Engine rev
  **1.0.15**. **This suite compiles nothing** — gate 13 and its subject were deleted at Phase 7b.
- **Toolkit:** build-gate 15/15 · toolkit-gate 16/16 · suite 3/3 · names 16 FULL · **112 tests**.
- Shas **`be6ae51a` / `2e86b97d` / `1a3b7ead` UNMOVED**; `runtime_unverified` **×3**.
- **`diff -rq` against the pre-edit snapshots shows only the intended files** plus the three
  `"generated"`-timestamp JSONs the suite rewrites on every run
  (`04_renderer/snapshots_page/audit.json`, `snapshots_page/manifest.json`,
  `snapshots_titleblock/manifest.json` — **diffed to confirm it is that one line each**).
- Snapshots: `Download/sld_snapshot_pre-trip-fixes_2026-08-02.tgz` ·
  `Download/toolkit_snapshot_pre-trip-fixes_2026-08-02.tgz`, **both verified by extract + `diff -rq`,
  exit 0, no output** — never by entry count or `tar`'s exit status.

## 4. Verified vs assumed

**Verified, by command, in this session:**
- All three findings **re-derived before editing** — §0.3 of the brief, and it earned its keep: the
  previous brief's §2 had been fixed within a day of being written. **All three were still live.**
- `Revit Addins` absent from both trees (`find`, both roots).
- `src/DEDARMS`, `src/DEDARMS.Lab`, `deploy/install_dedarms.ps1`, `08_validation/toolkit_build_gate.sh`,
  `08_validation/run_toolkit_gates.sh`, `01_contracts/toolkit_manifest.json`,
  `tests/fixtures/hospital_golden.json` — **all present**.
- `src/DEDARMS/deploy`, `08_validation/build_gate.sh`, toolkit-root `run_all_gates.sh`, toolkit
  `03_contracts/` — **all absent**.
- The `.cs` counts, by `find … | grep -v '/obj/\|/bin/' | wc -l` — **27/37/7/1 = 72, Lab 6,
  src+tests 100.**
- **`DEDARMS.Tests.csproj:91` re-derived by CONTENT, not existence** — it still resolves, and it now
  reads `<None Include="..\fixtures\hospital_golden.json"`. **The line number holds and the old claim
  about it is false.**
- **The "build in place" reason, by experiment** — see §7.1.
- **That nothing guards this class** — no `.md`-path resolution in either suite beyond toolkit
  `[T7]`'s `](docs/*.md)` link matcher.

**Assumed / NOT verified — say so rather than glossing it:**
- ⚠️ **Nobody has verified where a Windows/Revit reader actually starts.** The trip-scoped ranking
  assumes it is SLD `CLAUDE.md §10`. The toolkit's `docs/ops_build_and_test.md` is arguably the real
  entry point **and it is correct today** — if so, B1 was less urgent than ranked. **It was still
  false.** This is the largest open assumption in the session.
- ⚠️ **A green suite verifies none of these edits.** No gate checks that a documented path exists.
  Stated here because "both suites green" is the sentence most likely to be misread as proof.
- The trip-scoped cut itself is a **judgement**, inherited from the prep brief, not a measurement.

## 5. Start here

**If heading to Revit: the trip is the next action — see HO-0005 (this repo).** Nothing here blocks
it, and the 2023 DLL is byte-unchanged, so the owed trip still validates the artifact it was
collected for.

**If doing desk work instead: `FU-0014` package A**, and read its §7 first — **F3 needs a policy
decision from Mayo before it can be "fixed" at all.** Start with **A8 + D6–D8**: the runbook's §8
(Recovery) and §9/§9a (ship a DLL) still say `24/24` while `:33` of the same file says `14/14`
correctly. **Those are the two sections a session opens when something is already wrong.**

## 6. Traps and gotchas

1. 🚩 **A stable line number is not a stable claim.** `DEDARMS.Tests.csproj:91` is still the golden
   line — the *file* changed under it. **Re-derive what a citation SAYS, never merely that it
   resolves.** This is the session's single most transferable finding.
2. 🚩 **A half-correct sentence outlives a wholly wrong one.** `CLAUDE.md:105` kept a correct `100`
   beside four stale numbers, and the correct one is what made it look checked.
3. ⚠️ **`(toolkit repo)` / `(SLD repo)` tags are load-bearing, not decoration.** They are the only
   thing distinguishing "dead path" from "path in the tree this suite may not read" — **and they are
   therefore the waiver list any future checker needs** (FU-0014 §2 package B).
4. ⚠️ **Never run the two suites at once** (**FL-0012**). Sequentially, both, every time — **neither
   suite can see the other repo**, so one green suite is half an answer.
5. ⚠️ **`find -newermt` cannot see your edits** (**FL-0021**) — editing a file on this phone does not
   advance its mtime. **Prove change-sets with `diff -rq` against a snapshot.**
6. ⚠️ **The suite rewrites three tracked JSONs** on every run (one `"generated"` line each). Filter
   as noise — **but diff them to confirm it is only that line.**
7. ⚠️ **`tar` exits non-zero on this phone** (*"file changed as we read it"*) and throws deferred
   `Cannot change mode` errors extracting setgid `/sdcard` dirs onto tmpfs. **Both harmless. The
   `diff -rq` is the proof, not the exit status.**
8. 🚫 **Do not "fix" toolkit `CLAUDE.md:78`.** Deferred on purpose — see HO-0005 (toolkit) §6 and
   FU-0007 §2. Four `[T7]` checks read that bullet.

## 7. Open decisions

1. **The "build in place" reason — RESOLVED this session, by measurement, and recorded so it is not
   re-litigated.** The brief offered (a) find the real reason or (b) write down that it is unknown.
   **Neither was guessed: the experiment was run.** Copying `tests/DEDARMS.Tests/` off-repo and
   building gives **42 × `error CS2001` over 21 distinct source files, and MSB3030 never reached** —
   because the project has **no `ProjectReference`** and source-links **21** production files via
   `<Compile Include="..\..\src\…">`, a **2-level** climb. **The behavior is right; its stated reason
   had been dead since Phase 7b; the true reason is stronger.** Full derivation in FL-0004 (toolkit)
   §4.1. **The same dead rationale still sits in the live gate script (`toolkit_build_gate.sh` ×6) —
   deferred to FU-0007, where it is the P1 item.**
2. **Does the dead-path class deserve an FL at all?** Nothing was *broken*, only *misdocumented*.
   **Raised as `S4` on the register's own scale** — *"a dangling pointer, a stale count, a misleading
   instruction"* — with the argument in FL-0025 §2 that S4 is right by class and understates it by
   *timing*. **Mayo's to overrule.**
3. **F3 — should every stale number carry a banner?** A policy question, not a measurement. Blocks
   part of both FUs. **Undecided.**
4. **Should the checker (FU-0014/FU-0007 package B) be built at all?** A checker that fires on
   legitimate cross-repo citations gets switched off, and **a switched-off gate reads as coverage.**
   The tag-as-waiver rule is the mitigation and is **unproven at scale.**

## 8. Links

- **Twin: HO-0005 (toolkit)** ⚠️ **not HO-0005 (SLD), which is the owed Revit trip.** Two ID
  sequences that collide — **always tag the repo.**
- Raised here: **FL-0025** · **FU-0014**
- Raised in the toolkit: **FL-0004** · **FU-0007**
- Source: `00_Docs/staleness_audit_2026-08-02.md` — **now carrying a `Disposition — 2026-08-02`
  section, appended**; §9 is its do-not-touch list and was honoured
- Prior: **HO-0026** (the audit session) · **HO-0025** (dropped contracts — why `13_addin/` citations
  must stay) · **HO-0002 (toolkit)** (Phase 7b, the move that caused this class)
- Standing constraints: **FL-0012** (never both suites at once) · **FL-0021** (mtime) ·
  **FL-0023 (toolkit)** (why `CLAUDE.md:78` is untouchable) · **FU-0005 (toolkit)** (never edit a
  shipping `.cs`) · **FU-0013** (the frozen page-scale targets)
