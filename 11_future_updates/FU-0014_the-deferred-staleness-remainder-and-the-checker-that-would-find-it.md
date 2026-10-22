# FU-0014 — The deferred staleness remainder (SLD side), and the checker that would have found all of it

| Field | Value |
|-------|-------|
| **ID** | FU-0014 |
| **Title** | Sweep the ~17 SLD-side stale sites the 2026-08-02 trip-scoped change-set deliberately did **not** fix, and build the doc-citation checker that makes the class self-detecting |
| **Proposed** | 2026-08-02 |
| **Proposed by** | `review` (the 2026-08-02 staleness audit + the trip-scoped fix session) |
| **Status** | **`package A shipped 2026-08-03` · package B `proposed`** (see §10) |
| **Priority** | `P2` (**work package B**) · `P1` for the **§3 A-list** if a trip is imminent |
| **Effort** | `M` (A: `S`–`M`, mechanical but wide) · (B: `M`, design-first) |
| **Readiness** | `ready` — nothing here needs Revit or a Windows box |
| **Category** | `docs` · `validation/gates` |
| **Stage** | `process` |
| **Component** | `CLAUDE.md` · `README.md` · `04_renderer/README_engine.md` · `00_Docs/repo_runbook_V1_0_0.md` · `05_revit/README.md` · `08_validation/sync_gate.mjs` |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` — documentation and one new gate; no engine, no geometry, no baseline |
| **Schema impact** | `none` |
| **Version bumps** | `none` for work package A (the `_V1_0_0` docs edited are living, not contracts). Package B adds a check → **the sync-gate check-NAME baseline moves** (see §5) |
| **Gates affected** | A: `none`. B: **sync** (new check + `[D7]` FULL/QUICK baseline re-bless) |
| **Depends on** | **FL-0025** (this repo) · **FL-0004 (toolkit)** |
| **Blocks** | — |
| **Target** | `next batch` |

---

## 1. Problem

The 2026-08-02 staleness audit found ~25 sites. The trip-scoped change-set that followed fixed
**three classes only** — the *dead runnable instructions* — on the explicit decision that the trip is
when instructions get run. **Everything else was deferred on purpose. This entry is that deferral,
written down, so it is a decision and not an omission.**

Two things make the remainder worth an entry rather than a shrug:

1. **`A8` and `D6–D8` are not merely stale — they are internally inconsistent, in the two sections a
   reader opens when something is already wrong.** `repo_runbook_V1_0_0.md:33` says
   *"sync **14/14** (was 24/24 until Phase 7b deleted eleven checks and added one)"* — correct, and
   clearly written by Phase 8. **The same file** then says `24/24` at `:466`, `:469`, `:680` and
   `:757`. Phase 8 repointed §0, §4 and §5 and never reached **§8 (Recovery)** and **§9/§9a (ship a
   DLL)**.
2. **Nothing here is guarded, and nothing here can be guarded by anything that exists.** FL-0025 §5
   verified it: no gate in either repo asserts that a path or count cited in a document is true. This
   class is *only* ever found by a human audit, which means its true cost is one audit per
   change-set, forever.

## 2. Proposed change

**Two work packages. They are separable and B does not block A.**

### Package A — sweep the deferred remainder (SLD side)

Every site below is named **by audit finding ID** so nothing is silently dropped.

**A-cluster — the 14-gate / gate-13 fiction (the suite is 13 gates and compiles nothing):**

| ID | site | fix |
|---|---|---|
| **A1** | `CLAUDE.md:240-243` | "14 gates … gate 13, the C# build gate, and gate 14" → 13 |
| **A2** | `CLAUDE.md:245-288` | the whole ~44-line `build_gate.sh` (gate 13) bullet, present tense, for a file not in this repo. ⚠️ **Carries a second error inside it:** `:286` attaches the `DEDARMS.Tests.csproj:91` three-level-climb rationale to **gate 14** (`checkname_diff.sh`) — a script that touches no C# at all (`grep -c "DEDARMS\|dotnet\|csproj"` → **0**) |
| **A3** | `CLAUDE.md:6` | "the 14 gate commands" (runbook link text) |
| **A5** | `README.md:83-84` | "14 gates (… gate 13 `build_gate.sh` …)" |
| **A6** | `04_renderer/README_engine.md:501-509` | 🚩 **the sharpest of these** — it does not just carry a stale number, it **routes the reader to `repo_runbook §4` for gate 13's commands, and that section's own banner (`:320-329`) says "Do not run any command in it against this repo."** One document sends you where the other forbids you to go |

**A-cluster — sync_gate's check count (live: 14 full · 12 quick):**
**A4** `CLAUDE.md:274` (24/22) · **A7** `README_engine.md:490` (24 / 22 quick) ·
**A8a** runbook `:466` · **A8b** `:469` · **A8c** `:680` (§8 Recovery) · **A8d** `:757` (§9a step 5).

**A9 / A9b — the sentence that describes what a green suite proves:**
runbook `:41` and `:726` — *"A green **14/14** proves the sources compile and 112 tests pass"* —
**in a suite that is 13 gates and compiles nothing, as the same bullet says two lines above.**

**D6–D8 — the runbook sections Phase 8 did not reach:** `:556` (gate 13 wipes a scratchpad — that
behavior is the toolkit's gate now) · `:759-763` (the `DEDARMS.Tests` csproj climb — that project is
not in this repo and the climb no longer exists) · `:757` (24/24, and "forgetting the CLAUDE.md line
turns **P5** red" — the add-in `CLAUDE.md` is the sibling's and the check that reads it is the
toolkit's `[T7]`, not P5).

**B6 — an enumeration that asserts completeness and is not complete.** `05_revit/README.md:88`:
*"Every surviving `13_addin/` string in a living document is now deliberate, and is one of exactly
**two kinds**."* Re-derived: every one fits **except**
`00_Docs/dedarms_separation_decisions_V1_0_0.md:574, 602, 603, 610`. **The finding is the word
"exactly", not the file** — a completeness claim is what a later session trusts without re-deriving.

**F3 (SLD half) — the record-beside-it convention, applied inconsistently within single files.**
Bannered: runbook §0 `:31-33`, §4 `:315-329`, §9 `:717-726`. **Not bannered:** §8 `:680`, §9a
`:757-763`, and all of `README_engine.md:490, 501-509`. **This is a policy decision, not a
measurement** — see §7.

### Package B — the checker (the guard FL-0025 could not name)

A gate check that resolves **path-like citations in living documents** and fails on the dead ones.

**The design constraint, and it is the whole reason this is `M` and not `S`:** a naive checker cannot
distinguish *"dead path"* from *"path in the tree this suite is forbidden to read"* — and ⚠️ **neither
suite can see the other repo.** The resolution already exists as a convention:
**the `(SLD repo)` / `(toolkit repo)` inline tag is the waiver list.** A **tagged** backticked path is
*expected* not to resolve locally; an **untagged** one must resolve. The tag stops being decoration
and becomes the thing that makes the check possible.

**The one precedent, and its exact limits:** `[T7] the hub still indexes every feature document`
(**toolkit** `08_validation/toolkit_gate.mjs:319-344`) already does this shape and proves it works —
but it matches only

```js
[...rdText(HUB).matchAll(/\]\(docs\/([A-Za-z0-9_.-]+\.md)\)/g)]
```

**markdown links, to `docs/`, `.md` only, one file, one repo.** Every path in FL-0025 and FL-0004 was
an **inline code span** — the dominant citation style in both trees, matched by nothing.

## 3. Scope

**In (A):** A1 · A2 (incl. its `:286` gate-14 misattribution) · A3 · A4 · A5 · A6 · A7 · A8a–d ·
A9 · A9b · D6 · D7 · D8 · B6 · F3 (SLD half, pending the §7 policy decision).
**In (B):** one new `sync_gate.mjs` check, an explicit **FILES** allow-list, the tag-as-waiver rule,
and a mutant harness proving it red — this repo ships no check it has not seen fail.

**Out (non-goals):**
- ❌ **The toolkit's half** — A10, B3a–d, B4, D3, D5, B7, F3 (TK half). **→ FU-0007 (toolkit).** One
  change-set per repo; neither suite reports on the other.
- ❌ **Anything on the audit's §9 deliberate-divergence list.** Especially:
  🚫 **toolkit `CLAUDE.md:78`'s "A green 14/14…" (A10)** — it sits **inside** the
  `Current shipping DLL sha256` bullet that **four `[T7]` checks read**, three of them on those exact
  lines, requiring each artifact's own short sha nearest its own never-run phrase (**FL-0023
  (toolkit)**). **Re-wrapping that bullet to fix a gate count can silently break a shipping-sha
  assertion.** Low value, high blast radius.
- ❌ `check_page_scale.mjs`'s band / the `0.0455 in` bar / both projects' `out_of_band=1` → **FU-0013**.
- ❌ The four shipping `.cs` files citing SLD paths → **FU-0005 (toolkit)**. **Never edit a shipping `.cs`.**
- ❌ Dropped contract files citing `13_addin/` — editing one moves a sha and reddens `[T1]`; fixing
  them is a **re-publish** (HO-0025).
- ❌ `10_/11_/12_` history. **Record beside, never edit.**
- ❌ **Re-tuning any measurement target.** Package A moves *descriptions* only.

## 4. Acceptance criteria

**Package A**
- [ ] Every finding ID in §3 **In (A)** is either fixed or has a one-line written reason it was not.
- [ ] `grep -an "14 gates\|gate 13\|24/24\|22 quick\|24 checks"` over living docs returns **only**
      bannered history and deliberate provenance — each surviving hit named.
- [ ] **A6's cross-document routing is broken:** `README_engine.md` no longer sends a reader to a
      runbook section whose own banner forbids running it.
- [ ] **A2's `:286` misattribution is corrected**, not merely deleted with its bullet.
- [ ] **B6's "exactly two kinds" is true, or the word "exactly" is gone.**
- [ ] Suite green before and after: **13/13 · sync 14/14 · behavior 52/52 · names 14/12.**

**Package B**
- [ ] The check resolves inline-code-span paths, not only markdown links.
- [ ] An **untagged** dead path fails it; a **tagged** cross-repo path does not.
- [ ] It would have caught **FL-0025** (`Revit Addins/DEDARMS/`) — **demonstrated by reverting that
      line in a lab copy and observing red**, not by argument.
- [ ] A mutant harness covers it, scored on its **summary line, not its exit code alone** (FL-0003
      (toolkit) — the harness that printed a failure and exited `0`).
- [ ] `[D7]` FULL/QUICK baselines re-blessed **deliberately**, scope proved minimal first.

## 5. Blast radius

**Package A: documentation only.** Golden-inert, schema-inert, no version bump — the `_V1_0_0` files
touched are living documents, not contracts. ⚠️ **One real hazard:** `CLAUDE.md` is gate-read on one
anchor — `sync_gate.mjs:246-249` (**P5**) matches the literal `` `sld_engine.mjs` rev **X** `` against
the manifest rev. A4 (`:274`) and A1–A3 are nowhere near it, but **run sync_gate anyway; it is 14
checks and seconds.**

**Package B moves gate counts.** A new check → `SYNC-GATE: 15` and the **check-NAME baseline moves
14 → 15 (FULL)**, which is a deliberate re-bless, not a surprise. Every document stating the sync
count must move with it — **including the ones Package A is fixing, which is the argument for doing A
first.**

⚠️ **Running the suite mutates three tracked files** — `04_renderer/snapshots_page/audit.json`,
`snapshots_page/manifest.json`, `snapshots_titleblock/manifest.json`, each by exactly one line (the
`"generated"` ISO timestamp). Filter as noise, but **`diff` them to confirm it is only that line.**

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 13/13 · sync 14/14 · behavior 52/52 · names 14/12. Record it.
**Snapshot first** (`.tgz`), and **verify by extract + `diff -rq`** — never by entry count or `tar`'s
exit status, both of which lie on this phone.

**After:** the same suite, same numbers for A; **13/13 · sync 15/15 · names 15/12** for B.

🚩 **A green suite does not verify Package A, and must not be reported as if it did.** No gate checks
a documented path or count — **that is precisely why all of this went stale.** The real net is:
every repointed path proved with **`ls` in-session**, and every count **re-derived by running the
thing**, with the command recorded. **Package B exists to end that exemption.**

⚠️ **`find -newermt` cannot see your edits** (**FL-0021**: editing a file on this phone does not
advance its mtime). Prove the change-set with **`diff -rq` against the snapshot**, never a timestamp
sweep. Run the two suites **sequentially, never at once** (**FL-0012**).

## 7. Risks / open questions

1. **F3 is a policy question and needs Mayo's decision, not a measurement.** *Should every stale
   number carry a banner?* The banner is the convention that makes every other deliberate divergence
   legible — **and it is exactly the kind of thing only a human reads.** Until it is decided, F3
   cannot be "fixed", only applied inconsistently in a new place.
2. **Package B could be worse than nothing.** A checker that fires on legitimate cross-repo citations
   gets switched off within a week, and a switched-off gate is more dangerous than none — it reads as
   coverage. **The tag-as-waiver rule is the mitigation, and it is unproven at scale.**
3. **The tag convention is not yet universal.** B's value is bounded by how consistently
   `(SLD repo)` / `(toolkit repo)` is applied, and **adopting it everywhere is itself a sweep** — one
   that Package A should probably do while it is in these files anyway.
4. **A2 deletes ~44 lines.** Large deletions in a hub are where "while I was there" damage happens.
   Do it as its own change-set with its own `diff -rq`.
5. **Both halves of this class rot on the same clock.** The previous prep brief's §2 was fully fixed
   **within a day** of being written. **Re-derive every value in §2 before acting on it.**

## 8. Alternatives considered

- **Fix everything in the trip-scoped session.** Rejected — that is how a three-edit change-set
  becomes unreviewable. The FU is how the remainder is honoured; the edit is not.
- **Raise nothing and let the next audit re-find it.** Rejected: that is exactly what happened, and
  the audit cost is the thing being paid twice. **Until an entry exists, the next audit re-finds all
  of it.**
- **One combined cross-repo FU.** Rejected — **neither suite can see the other repo** and the two ID
  sequences collide. A single entry would be invisible from one of the two trees that needs it.
- **Two separate FUs per repo (sweep vs. checker).** Rejected as ID sprawl across two colliding
  sequences; kept as **one entry with two independently-schedulable work packages** instead. Package
  B can be split out later if it is scheduled alone.
- **Anchor citations to strings instead of line numbers** (the audit's §5 recommendation). **Not
  rejected — folded into B.** It is the direct lesson of `DEDARMS.Tests.csproj:91`, where the line
  number stayed valid while the claim about it went false.

## 9. Links

- Twin: **FU-0007 (toolkit)** — the same remainder on the other side. Neither is complete alone.
- Failures: **FL-0025** (this repo) · **FL-0004 (toolkit)** · **FL-0021** (mtime) · **FL-0012**
  (never run both suites at once) · **FL-0023 (toolkit)** (why `CLAUDE.md:78` is untouchable) ·
  **FL-0003 (toolkit)** (score the summary line, not the exit code)
- Source: `00_Docs/staleness_audit_2026-08-02.md` §3 (A1–A10), §4.2/4.4/4.5 (B3/B4/B6/B7),
  §6.3–6.6 (D3/D5/D6–D8), §8 (F2/F3), **§9 (the do-not-touch list)**
- Session: **HO-0027** (this repo), twinned with **HO-0005 (toolkit)** ⚠️ *not* **HO-0005 (SLD)**,
  which is the owed Revit trip
- Precedent for the checker: **toolkit** `08_validation/toolkit_gate.mjs:319-344` (`[T7]`)

---

# 10. Disposition — PACKAGE A SHIPPED 2026-08-03 (appended)

> 🚩 **§§1–9 ABOVE ARE UNEDITED AND SOME OF THEM ARE NO LONGER TRUE.** They record what was proposed.
> This section is appended **beside** them, never written over — the same record-beside-never-over
> rule §2's Package B exists to make machine-checkable. **Package B is NOT done.**

**Suite state, before and after, both derived by running it:**
`GATES: 13 passed, 0 failed` · `SYNC-GATE: 14 passed, 0 failed` (12 on `--quick`) ·
`behavior 52 passed, 0 failed` · `[D7] FULL — 14 names, unchanged · QUICK — 12 names, unchanged`.
**Identical before and after.** Pre-edit snapshot verified by **extract + `diff -rq`** (488 files, no
differences), never by `tar`'s exit status or an entry count. **14 files intentionally edited**,
proved by `diff -rq` against that snapshot — plus exactly the 3 predicted `"generated"`-timestamp
JSONs, each confirmed a **single changed line** by reading the diff (§5 called this).

## 10.1 Every §3 "In (A)" finding, and what happened to it

| ID | disposition |
|---|---|
| **A1** | ✅ `CLAUDE.md` — "14 gates … gate 13 … and gate 14" → **13 gates**, derived from 13 `run "…"` call sites and `EXPECTED_GATES=13` |
| **A2** | ✅ the ~27-line `build_gate.sh` bullet **replaced by a dated banner** recording the deletion, not deleted silently (§7 risk 4) |
| **A2 `:286`** | ✅ **corrected, not dropped** — the `DEDARMS.Tests.csproj:91` climb and the "zero references to `dotnet`" sentence were both gate 13's, re-attributed with the derivation `grep -c "DEDARMS\|dotnet\|csproj" checkname_diff.sh` → **0** |
| **A3** | ✅ `CLAUDE.md:6` → "the 13 gate commands" |
| **A4** | ✅ `CLAUDE.md` baseline "(24 full · 22 quick)" → **14 full · 12 quick** |
| **A5** | ✅ `README.md` → 13 gates + banner |
| **A6** | ✅ **the routing is broken.** `README_engine.md` no longer sends a reader to `repo_runbook §4` for gate 13's commands. It now routes only for **gate 14**, to §4's live gate table — §4's title is already *"The 13-gate regression suite"* |
| **A7** | ✅ `README_engine.md:490` → **14 checks (12 in `--quick`)** |
| **A8a–d** | ✅ runbook `:466`, `:469`, `:680` (§8 Recovery), `:757` (§9a step 5) → 14/14 · 12/12 |
| **A9 / A9b** | ✅ runbook `:41` and `:726` — **both** now say a green run here compiles nothing and is 13/13; the 112 tests are named as the **toolkit repo's** assertion |
| **D6** | ✅ runbook `:556` — the FL-0021 trap is unchanged; only its **address** moved to the toolkit's gate |
| **D7** | ✅ runbook `:759-763` — `DEDARMS.Tests` is **not in this repo** (`ls tests/` → no such file), **and the three-level climb is gone**: `csproj:91` reads `..\fixtures\hospital_golden.json`, verified in **both** trees |
| **D8** | ✅ runbook `:757` — **P5 no longer reads the add-in `CLAUDE.md` at all**; the three surviving `[P5]` checks are all local. Forgetting that line now reddens **nothing** on this side |
| **B6** | ✅ `05_revit/README.md:88` — **the word "exactly" is gone**, the enumeration is re-derived and dated, and the two kinds it missed are listed as kinds 3 and 4 |
| **F3** | ⏸️ **NOT resolved as policy** — §7 Q1 is still Mayo's to answer. Every edit above *applies* the banner convention, so the SLD half is now internally consistent **in practice**; the rule is still unwritten |

**Acceptance sweep run:** `grep -rn "14 gates\|gate 13\|24/24\|22 quick\|24 checks\|22/22\|build_gate"`
over living files. **Every surviving hit was read and named:** the runbook's bannered dead gate-13
block, `run_all_gates.sh`'s own deletion banner, `dedarms_separation_decisions` (self-flagged
history), the was→is table rows in `05_revit/README.md` / `drift_surfaces:332` / `manifest:40`, and
the new dated banners written by this change-set. ⭐ **One deliberate non-finding, exactly as the
audit's §2.3 calibration predicted:** `Sprouts …/REVISIONS.md:78` reads **"24/24 A-1 tags at spec"**
— an A-1 tag count, not a gate count. **Counting it instead of reading it would have produced a
quotable, wrong edit.**

## 10.2 ➕ THREE FINDINGS THIS SWEEP TURNED UP THAT THE AUDIT DID NOT HAVE

The audit was written 2026-08-02. **Engine rev 1.0.16 shipped 2026-08-03**, one day later, and broke
things the audit had verified green. **This is §7 risk 5 happening on schedule.**

**1. 🚩 `current_state_manifest.json`'s `engine.note` had drifted from its own `rev` field for the
THIRD time.** The note read *"engine rev is 1.0.15, matching the viewer meta revision tag"* while
`rev` read **1.0.16** and the viewer's `<meta revision>` read **1.0.16** — **both halves of the
sentence false at once**. The note **documents its own failure mode** ("drifted … twice before —
reconciled 2026-07-26, and again 2026-07-27"). **Nothing caught it:** sync_gate's `[P5]` checks read
the `rev` **field** and the living docs, never this prose. Fixed **and** the prediction recorded in
place. → **a check asserting this note against the `rev` field belongs in package B.**

**2. 🚩 A `drift_surfaces` line citation went stale in ONE DAY — the audit's §5 recommendation
proving itself.** The audit re-derived all 12 citations on 2026-08-02 and **all 12 held**. Rev 1.0.16
inserted 59 lines and `measureMarkupExtent` moved **16604 → 16663**; `:16604` now points at a bare
`});`. Re-derived 2026-08-03: **exactly 1 of the 12 broke, the other 11 still resolve.**
**Fixed by anchoring to the string `function measureMarkupExtent(markup, opts) {`, not a number** —
and that string carries *more* information than the number did, since the `opts` param is what
distinguishes the fixed engine copy from the dormant title-block twin (**FL-0024**).

**3. The same two citations were stale in `09_tests/*/4_checks/check_lib.mjs`, in all four copies.**
`L16604` (→ 16663) and `L16434` for `_snapTextLen` (→ 16493). ⚠️ **That comment already carried the
warning "RE-DERIVE THAT LINE NUMBER, never carry it forward: it read L16134 against an actual L16448
for nine consecutive sessions."** It then went stale again anyway. **A warning is not a guard.** Both
are now string-anchored. **All four copies were patched by one script and re-verified byte-identical
(`md5sum` → a single hash) and `node --check`-clean**, so the `drift_surfaces` §8 triplication
surface gained no drift. Both `.mjs` edits proved **comment-only** by diffing with comment lines
stripped.

## 10.3 What is still open

- ❌ **Package B is untouched.** The class remains unguarded, and findings 1–3 above are three fresh
  proofs that it is the only durable fix. Its scope should now **also** cover the manifest-note
  assertion (finding 1) and prefer **string anchors over line numbers** (findings 2–3).
- ❌ **F3's policy question** (§7 Q1) is unanswered.
- ❌ **The toolkit half — `FU-0007 (toolkit)` — was NOT touched.** One change-set per repo; neither
  suite reports on the other. **D5 in particular is still live over there.**
- ✅ **The §9 do-not-touch list was honoured in full:** no target re-tuned (`check_page_scale.mjs`'s
  band and the `0.0455 in` bar are untouched — **FU-0013**), no shipping `.cs`, no dropped contract
  file, no sha, no baseline, no re-bless, and `10_/11_/12_` history left alone.

⚠️ **A GREEN SUITE VERIFIES NONE OF THIS, and it must not be reported as if it did.** No gate asserts
a documented path or count. Every count above was **re-derived by running the thing** and every path
**proved with `ls`**, in-session. That exemption is what package B exists to end.

*Package A shipped 2026-08-03. §§1–9 are unedited.*
