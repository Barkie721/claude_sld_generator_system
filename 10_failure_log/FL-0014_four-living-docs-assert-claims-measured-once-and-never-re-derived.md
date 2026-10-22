# FL-0014 — four living documents assert gate facts that were measured once, propagated, and never re-derived; one of them is the manifest

| Field | Value |
|-------|-------|
| **ID** | FL-0014 |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `fixed` |
| **Severity** | S3 |
| **Stage** | docs / contract |
| **Component** | `03_contracts/current_state_manifest.json` · `CLAUDE.md` · `00_Docs/repo_runbook_V1_0_0.md` · `08_validation/build_gate.sh` + `lib/dll_embed_V1_0_0.mjs` (comments + one runtime message) · both registers |
| **Failure class** | documentation drift — measured once, asserted forever |
| **Detected by** | claim audit against source, DEDARMS-separation Phase 2 VERIFICATION session (2026-07-30) |

---

## 1. Why these four are one entry

The verification plan predicted a third self-correction, on the grounds that session 2 twice
"verified the thing it built, not the thing it claimed." It found four, and they share one mechanism:
**a fact was measured on one occasion, written into several files, and then the underlying reality
moved without anything re-reading it.** None was caught by a gate, because no gate reads prose.

## 2. The four

### 2.1 "5 of the 6 consumers swallow the null" — FALSE, and it reaches the user

Asserted in five places, all naming `CatRainOverlay.cs:141` explicitly as a `return null`:
`CLAUDE.md:246` · `build_gate.sh:296,349` · `build_gate.sh:370` (**the T4b failure message an
operator actually sees**) · `lib/dll_embed_V1_0_0.mjs:66` · `HO-0007:114`.

Read all six consumers:

| # | Site | Behaviour on a null resource |
|---|---|---|
| 1–3 | `RibbonRegistry.cs:47,97,104` → `IconFactory.cs:231` | `if (s is null) return null;` — **swallows** |
| 4 | `VideoAsset.cs:23` | `if (src is null) return null;` — **swallows** |
| 5 | `CatRainOverlay.cs:141` | `?? throw new InvalidOperationException(…)` — **THROWS** |
| 6 | `FamilyResolver.cs:384` | `?? throw new InvalidOperationException(…)` — **THROWS** |

The true count is **4 swallow / 2 throw**. `CatRainOverlay.cs:141` was miscategorised at first
measurement and copied verbatim into four more files.

The substance survives — a `RootNamespace` change still fails mostly silently, T4b is still
necessary, and the argument for T4b's existence is unaffected. But the failure is *less* silent than
advertised: two of six paths raise, and the cat-rain overlay raises the moment it is used.

### 2.2 The manifest still says the test count is not gated — in the file session 2 edited to gate it

`03_contracts/current_state_manifest.json` → `artifacts.addin_dll.note` carried, in the present
tense:

> ⚠️ THE TEST COUNT IS NOT GATED: run_all_gates.sh contains no dotnet/csproj/.cs reference at all,
> so the 12/12 suite and this 112 are independent claims … Both are what FU-0011's T0 build gate
> exists to close.

FU-0011 shipped. The suite is 13/13, `run_all_gates.sh` invokes `build_gate.sh`, and the count is
asserted against `artifacts.addin_tests.expected_passed` — **a sibling slot in the same file**, added
in the same session, whose note describes the gate correctly. The contract contradicted itself
across two adjacent keys.

This is the worst of the four: the manifest is the repo's single source of truth, and this is a
`⚠️`-flagged warning telling a future reader to go and build something that already exists.

### 2.3 Mutant ③'s recorded result is stale — T4b changed it and nothing re-ran it

Recorded as **"only T4 red"** (runbook §"Why it can be trusted"; `HO-0007 §5`; `FU-0011`). Re-measured
2026-07-30: dropping the family map's `<EmbeddedResource>` line now produces **two** reds —

```
FAIL [T4]  … no embedded family map found in DLL ($schema token absent)
FAIL [T4b] … 1 of 5 resource name(s) NOT in the DLL: DEDARMS.Resources.revit_SLD_family_map_V1_0_0.json
BUILD-GATE: 7 passed, 2 failed.
```

T4b was added *after* mutant ③ was run, and the expectation was never re-derived. The gate is better
than documented; the documentation is wrong.

### 2.4 The registers missed the T4b correction entirely

The fix that added T4b updated "8 checks" → "9 checks" in the runbook body, `build_gate.sh:48`,
`FU-0011:118,147` and `HO-0007:35,139,156` — but not:

| File | Said | Should say |
|---|---|---|
| `11_future_updates/update_register_V1_0_0.md:16` | "**8 checks**, ~22 s, mutant-proved **six** ways" | 9 checks, seven ways |
| `12_handoff/handoff_register_V1_0_0.md:23` | "Mutant-proved **six** ways" | seven |
| `00_Docs/repo_runbook_V1_0_0.md:345` | "mutant-proved 2026-07-30, **six** ways" + a narrative that **omits mutant ⑦ entirely** | seven, including the `RootNamespace` mutant |

The runbook omission is the pointed one: mutant ⑦ (`<RootNamespace>DEDARMS.Core</RootNamespace>` →
T4 green, T4b red naming all five) **is the reason T4b exists**, and the runbook's "why it can be
trusted" section does not mention it. This repeats session 2's own second self-correction almost
exactly — that one was `README_engine.md`, "the doc the other docs point at"; this one is the two
registers, which are the docs a future session reads *first*.

## 3. Impact

No gate result was ever wrong, and no shipped artifact is affected. The cost is that a Phase 5
session reading the current record would (a) believe a `RootNamespace`/namespace change fails
completely silently, (b) be told by the manifest to go and build a gate that exists, (c) expect one
red from mutant ③ and treat a second as a regression, and (d) under-count the gate's proven coverage.

## 4. Fix — applied 2026-07-30

All four corrected in place, in the same session that found them:

1. `5 of the 6` → `4 of the 6`, with `CatRainOverlay.cs:141` moved to the throwing column, in all
   five locations including the T4b runtime message.
2. `artifacts.addin_dll.note` — the stale ⚠️ replaced with a statement that the count **is** gated,
   pointing at `artifacts.addin_tests` and gate 13.
3. Mutant ③'s recorded result corrected to **T4 + T4b** wherever it appears.
4. Both registers and the runbook updated to **9 checks / seven mutants**, and the runbook's mutant
   narrative extended to include ⑦ and the `AssemblyName` result.
5. `build_gate.sh:296` cited `FamilyResolver.cs:382` (the `const`) for the throw; corrected to `:384`.

## 5. The generalisation worth keeping

This repo already gates every *machine-readable* fact — shas, counts, revisions, byte-identity. Every
one of these four defects lived in prose, in a `note` field, or in a comment, which is precisely
where no gate looks. Two of the four sat in files (`build_gate.sh`, `current_state_manifest.json`)
that a gate reads for other reasons.

**A claim of the form "measured 2026-XX-XX" is a snapshot, not an invariant.** The only durable
protection is the plan's own rule — *re-derive, never quote* — applied to the doc sweep and not just
to the numbers. Note that all four survived a sweep whose grep (`D1`) actually *printed* two of them;
they were read and dismissed as historical.

## 6. Related

- **FL-0004** — the other documentation-drift entry, and the one that established that a citation can
  be wrong in several files at once and stay wrong for weeks.
- **FL-0011**, **FL-0013** — the executable defects found in the same session.
- HO-0007 §5 — the table of "where the plan and FU-0011 are wrong", which this entry extends to
  "where HO-0007 is wrong".
