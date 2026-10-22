# HO-0010 — Phase 3 VERIFIED. All eight decisions stand; seven defects found and fixed. Phase 4 is next.

| Field | Value |
|-------|-------|
| **ID** | HO-0010 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` — superseded by **HO-0011** (gate hardening). Its verification result stands unchanged |
| **Tree state** | `clean` — was 13/13 · sync 21/21 · 19/19 at filing; **now 14/14 · sync 22/22 · 20/20** after HO-0011's gate-hardening session. 112 tests, shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead` unmoved |
| **Blocked on** | nothing — Phase 4 is startable now, on the phone |
| **Next action** | *(was: Phase 4, or the pre-Phase-7 FL fixes first — **the FL fixes were done**, see HO-0011.)* **Phase 4** |

---

## 0. The one-line answer

**The Phase 3 decision record was verified cold by a fresh session and it holds.** Tier A was
re-derived by command before the record was opened. **All eight decisions stand. No count, no name,
no gate result and no decision was wrong.** Seven defects were found — **five stale line-number
citations and two substantive** — and all seven are corrected in place in
[`00_Docs/dedarms_separation_decisions_V1_0_0.md`](../00_Docs/dedarms_separation_decisions_V1_0_0.md)
§14, which is now the record's own verification section.

**Nothing moved. No code changed. This session edited three documents and nothing else.**

## 1. The numbers, re-derived

Suite **13/13** (run twice, FL-0006 — both runs identical *by name*, not just by total).
Build-gate **9/9**, **112** tests. Sync **21/21** full · **19/19** quick.
Shas `9f16a1e7` (both carry copies) / `1a3b7ead` — unmoved, re-hashed directly, not read from the
manifest.

**24 Tier A claims: 19 verified, 5 wrong.**

## 2. ⭐ The two substantive findings

### D2c cited the wrong subsystem — the largest defect found

The record argued that absent-Lab and present-but-broken-Lab *"stay distinguishable"* because a
broken Lab **"still hits the existing per-item try/catch at `App.cs:44-54`."**

**`App.cs:44-54` is the DOCKABLE-PANE registration loop.** It iterates `PaneFeatureRegistry.Features`
— exactly two entries (`:29,30`, SLD Generator and Electrical Dashboard) — and its catch does
`TaskDialog.Show`. **Lab contributes no panes.** It ships two `OverlayCommandBase` ribbon commands.
That catch can never fire for Lab.

The catch that *would* fire is `RibbonBuilder.cs:62` — `catch { /* skip this button; keep building
the rest */ }`. **Silent.** So the two cases produce the identical observable: 14 buttons and
silence. **The decision (silence on absence) still stands; the argument for it was false**, and it
leaves a real obligation — see §4.

### D1's four-type table described a measurement nobody made

The record's `IconFactory`/`Theme`/`ButtonDef`/`OverlayCommandBase` table was headed *"Every Core
type the five Lab files touch."* The original method grepped the Lab files against a **hand-written
list of 15 candidate names** — it finds only what the author thought to look for.

Redone in reverse (enumerate all 175 declared types, intersect with every identifier in the five Lab
files): **the Lab files touch exactly TWO Core types — `OverlayCommandBase` and `Theme`.**
`ButtonDef` and `IconFactory` appear in **zero** Lab files; they are Core-side today
(`RibbonRegistry.cs:11`, and the two Lab `ButtonDef` literals at `:92-104`) and become Lab edges only
when 5b moves them. **The "2 types, not 17" figure and the decision both survive** — only the claim
of measurement did not.

**Reverse direction, never checked by anyone before:** the only Core→Lab references in the entire
add-in are `RibbonRegistry.cs:93` and `:100`. **D1's inversion scope is now measured, not assumed.**

## 3. The five citation defects

All five are the FL-0014 class — a fact measured once, then copied. **Four of the five are the
`GetExecutingAssembly()` citations underpinning PLAN CORRECTION 1**, the record's most-quoted
finding, which had propagated verbatim into HO-0009 and the handoff register.

| Cited | Actual | What the cited line really is |
|---|---|---|
| `IconFactory.cs:229` | **`:230`** | an opening brace `{` |
| `IconFactory.cs:230` (`return null`) | **`:231`** | the `GetExecutingAssembly()` call |
| `CatRainOverlay.cs:141` | **`:140`** | the `GetManifestResourceStream` line |
| `VideoAsset.cs:23` | **`:22`** | the `GetManifestResourceStream` line |
| `dll_embed_V1_0_0.mjs:80` | quote lives at **`:33-35`** | a different function's docblock |

The three add-in ones were copied from root `CLAUDE.md:247-248`, where they correctly denote the
**null-swallow / `?? throw`** sites, then re-labelled as `GetExecutingAssembly()` sites. **The
record's own preamble forbids exactly that.**

**Also corrected: the failure mechanism.** The record said a null icon is *"caught by the caller's
fallback → wrong icon or none."* **Nothing is caught** — `FromEmbeddedImage` returns `null` without
throwing, so `RibbonBuilder.ApplyIcon`'s catch (`:95`) never runs. And **only the brand icon
(`RibbonRegistry.cs:47-48`) has a `?? IconFactory.Create(size)` chain**; the two Lab buttons at `:97`
and `:104` have none. The real outcome is **Revit's default button image** — which makes D1's case
*stronger*, since a default-looking button is less noticeable than a visibly wrong one.

## 4. ⚠️ What Phase 5b now owes that it did not before

**Decide and record what the Lab probe does when `DEDARMS.Lab.dll` is PRESENT AND THROWS.** The
existing catches do not cover it and the observable is currently identical to deliberate absence.
Suggested: probe *failure* — as distinct from probe finding nothing — is the one Lab condition worth
a `TaskDialog`, because it means a shipped file is broken rather than deliberately excluded.

**Phase 9 gains a check:** a deliberately corrupted `DEDARMS.Lab.dll` must not look identical to an
absent one.

D2b's obligation from HO-0009 §6 is **unchanged and re-confirmed** — `build_gate.sh:166` is the
**sole** `dotnet build` in the script, `-c Release` hardcoded, three call sites, none override the
configuration; and §6.6 does default `IncludeLabFeatures` OFF for Release. **Phase 5 must make gate
13 build both configurations; option (c), "skip if the artifact is absent", is FL-0001's class.**

## 5. What was confirmed that had been doubted

- **The three "CORRECTED … same session" blocks** (D1, D2b, D4a) — never checked by anyone but their
  author. **All three re-derived cold. All three confirmed.**
- **D2a's B1 measurement reproduces exactly** against both blessed assemblies: `DEDARMS.App` **0** as
  UTF-8 **and 0 as UTF-16LE**, `DEDARMS` ×19, `App` ×42; Replay2023 0/0, ×7, ×12. The verification
  plan called this *"never executed"* — **the plan was wrong; the record had measured it.**
- **C3's "two different nines"** — settled by `FL-0014:81`, which shows the 8→9 correction was
  **`build_gate.sh`'s** check count, while plan §7.1 is titled *"WHERE THE NINE ADD-IN CHECKS GO"*
  (sync_gate's). The record's bookkeeping flag is correct.
- **C6** — the §0 mapping between plan §10 Phase 3's eight items and HO-0008 §9's eight rows is
  **exact in both directions.** Nothing was dropped beyond the two carried as C1/C2.
- **C8's attack fails** — the two Lab ButtonDefs *do* need `IconFactory`; `:97` and `:104` both call
  `FromEmbeddedImage` with hard-coded `DEDARMS.Resources.*` names.
- **C1** — the four `.addin` manifests are exactly two identical pairs (`bff4b574…` ×2,
  `559f66f9…` ×2). Flat holds 2, not 4.
- **D7's em-dash risk is real but unrealized** — all 21 check names carry exactly one ` — `. Split on
  the **first** separator anyway.

## 6. Corrections owed to documents this session does not own

- **Plan §6.4(2)** — *"FamilyResolver.cs:382 is the ONLY one that actually throws"* is **stale**.
  `CatRainOverlay.cs:142` also `?? throw`s. Root `CLAUDE.md:248-249` already carries the fix under
  FL-0014; **the plan never received it.** (The throw is at `:384`; `:382` is the `const`.)
- **Plan §6.4(3)** — *"TWELVE Core types are `internal`"* **undercounts by five.** Measured: **18
  internal type declarations, 17 of them Core** (the 18th is Lab's `VideoAsset`). Omitted:
  `PaneFeatureRegistry`, `RibbonBuilder`, `SymbolGeometry`, `SymbolDims`, `SldTextTypes`. Costs
  nothing under two assemblies; matters if the five-way split is revisited at ~tool 10.
- **HO-0008 §9 row 1** still states the ship-vs-test direction backwards. `consumed`, left alone.

## 7. The verification plan's own defects

Recorded so nobody re-runs it as written. **It was authored by the session it verifies, and its
blind spots were that session's** — which its own §8.6 predicted.

1. **Its entire Tier 0 was already fixed.** T0-1, T0-2 and T0-3 are described as *"THREE DEFECTS
   ALREADY FOUND … confirm each, then fix the record"* — but all three were already corrected in
   place in the record, as marked blocks. The plan describes a **pre-correction** version of its own
   target. Deliverable item 2 was complete before the plan was written.
2. **§3 B1 and §8.2 say the metadata claim was *"never executed."*** The record says **"MEASURED
   2026-07-30, same session"** and gives a table that reproduces exactly. Wrong.
3. **§5 D-3: *"HO-0009 was never filed."*** It was. `Next ID` was already `HO-0010`.
4. **§5 D-1's predicted diff shape is off by one** — `Only in REPO` is **14**, not 13, because
   session 4 added **two** files (the record *and* HO-0009) and edited the register. `differ` 22 ✓
   and `Only in SNAP` 1 ✓ both held.

**None of this invalidates the plan's method.** Tier A cold, the reverse-direction A6 rewrite, and
the instruction to give Tier C and E real time are what found D2c and the four-type table — the two
findings that mattered.

## 8. Traps (HO-0008 §6 and HO-0009 §8 still apply in full)

- **FL-0013's NUL-byte file list re-measured, not trusted.** The `-a` mitigation is in place at
  `build_gate.sh:367` (`grep -arhoE`). Use `grep -a` everywhere; it cost nothing to keep doing so.
- **FL-0011 and FL-0012 remain `open`; FL-0013 remains `mitigated`.** D4b's pre-Phase-7 schedule is
  unchanged and still correct.
- **A `diff -rq` against the snapshot while a gate is running gives a torn read.** Three of the 22
  differing files are generated timestamps that move on every run. Run the suite first, then diff.
- **`build_project()` takes trailing msbuild args** (`build_gate.sh:163`). That is how Phase 5 should
  add the second configuration — not by editing line 166.

## 9. Files changed this session

Three documents. **No code, no gates, no manifest, no shas.**

1. `00_Docs/dedarms_separation_decisions_V1_0_0.md` — seven corrections in place, new §14, new PLAN
   CORRECTIONS 6 and 7, two rows of §12 updated.
2. `12_handoff/HO-0009_…md` — three line numbers fixed; status → `consumed`.
3. `12_handoff/HO-0010_…md` — this file.

Plus `handoff_register_V1_0_0.md`.

## 10. The other stream is untouched

**HO-0005**, SLD Replay — `1a3b7ead` has still never run inside Revit. That trip is still owed,
along with the 10 unexplained replay failures. Nothing on the phone unblocks it.

`_snapshot_pre_split_2026-07-30/` is still the only undo. **Do not delete it.**
