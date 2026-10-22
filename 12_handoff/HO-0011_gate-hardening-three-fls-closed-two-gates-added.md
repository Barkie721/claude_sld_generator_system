# HO-0011 — Gate hardening: FL-0011/0012/0013 CLOSED, D7 + D8a shipped. The suite is 14 gates. Phase 4 is next.

| Field | Value |
|-------|-------|
| **ID** | HO-0011 |
| **Date** | 2026-07-30 |
| **Work stream** | DEDARMS separation |
| **Status** | `consumed` 2026-07-30 — **superseded by [HO-0012](HO-0012_phase4-addin-promoted-to-13addin.md)**, which executed §"Next action" in full: Phase 4 shipped and the add-in tree is now `13_addin/`. Everything this entry describes about the gates still holds — the three FL fixes, D7 and D8a all survived the move untouched, and gate 14 proved the move dropped no check. **Read the path prefix below as historical: `05_revit/DEADARMS ADDIN/` is now `13_addin/`.** |
| **Tree state** | `clean` — **14/14** · `--no-build` **13/13** · `--quick` **6/6** · build-gate **9/9 of 9** · sync **22/22 full · 20/20 quick** · **112** tests · shas `9f16a1e7` / `9f16a1e7` / `1a3b7ead` unmoved · no `bin`/`obj` leftovers |
| **Blocked on** | nothing — Phase 4 is startable now, on the phone |
| **Next action** | **Phase 4** (one `mv` to `13_addin/`), as a single change-set per E3. The gate machinery Phase 7 will port is now defect-free, which is why this session came first |

---

## 0. The one-line answer

**The three known `build_gate.sh` defects are fixed, mutant-proved and closed, and the two gate
additions the decision record scheduled (D7, D8a) are shipped.** Phase 7's step 2 says *"port them,
do not rewrite them"* — porting them unfixed would have copied three defects into a second repo
where each then needed fixing twice. **The suite is 14 gates. No C# changed; no sha moved.**

## 1. Why this ran before Phase 4 rather than after

**FL-0011 would have bitten during Phase 4 specifically.** Phase 4 moves the add-in root. If the move
leaves that root wrong, `T0.1` fails — and FL-0011 meant `T4b` then vanished **with no line at all**,
so a 7-of-9 run read as a complete account of a 7-check gate. You would have been reading a
shortfall as a pass, while moving the thing the gate points at.

## 2. What changed

### FL-0011 — the gate now knows what it owes (CLOSED)

`EXPECTED_CHECKS=9` is declared beside the counters. Before it, `PASS` and `FAIL` were counters
measuring themselves. Four changes, all in `build_gate.sh`:

- `T4b NOT ATTEMPTED — …` on **both** skip paths, matching the line T0.4 already had
- the shortfall banner fires on **every** mid-run abort, not only the precondition path — and in the
  other direction too, because more checks than the pin means someone added one without updating it
- T4's missing-DLL message no longer asserts a cause it never checked (`T01_STATUS`)
- `INT`/`TERM` abort loudly (exit 130) instead of degrading into a spurious `T0.3` red

**Also, and not in FL-0011's proposed fix: `0 failed` with an incomplete run is now RED.** Without
that branch the gate could print "0 failed" and exit 0 while checks were skipped — FL-0009's class,
one level out.

### FL-0013 — the coverage floor is a pin, not a zero-check (CLOSED)

`NRES -eq 0` only fired when *all* names vanished; the realistic failure is losing **some**, and
4-of-5 read as `ok — all 4 hardcoded names present`. T4b now asserts the derived set against
`artifacts.addin_dll.hardcoded_resource_names` as a **SUPERSET, deliberately not equality**: losing a
pinned name is RED, **adding** a consumer stays green and is still checked, and only a deliberate
removal is a contract edit. Same coverage relation D4a chose for the drift surfaces.

The ground rule is corrected in the runbook and FL-0004 — **three** NUL-bearing files, and `-a`
**unconditionally** rather than "when you think you are near a listed file". The list was
**re-measured, not copied**: still exactly three, same three.

### FL-0012 — `flock`, and the trap inside the trap (CLOSED)

Keyed on the **add-in root**, so the mutant lab and a real run never block each other.

> ### ⚠️ READ THIS BEFORE TOUCHING THE LOCK
> The first implementation omitted `--close` and **made the gate far worse**: `build_gate.sh` began
> taking **exactly 300 s and exiting 1** on a clean tree, and the suite went 24 s → 3 m 41 s.
> **`dotnet build` spawns `VBCSCompiler`, the Roslyn compiler *server* — a daemon that deliberately
> outlives the build.** It inherited the locked file descriptor and held the lock forever. Proved
> both ways: `flock --nonblock` reported HELD with no gate running, and killing `VBCSCompiler`
> released it instantly. `--close` closes the descriptor in the child. **Any long-lived daemon a
> build spawns reproduces this** — MSBuild node reuse is the other candidate.

Also note `flock` must be given the interpreter (`bash "$_self"`), not `"$0"`: this repo is on a
**noexec** mount, so flock cannot exec the script and dies before the gate prints anything.

### D8a — gate the DLL that actually gets carried (SHIPPED)

New sync_gate check, **appended at the end of phase 1 per E1's placement rule** (check numbers are
arrival IDs; four living docs cite specific ones). It asserts the **blessed carry copy** still
answers to the hardcoded resource names — a different artifact from T4b's freshly-built DLL, and the
only one a Revit trip ever sees. `9f16a1e7` was built in place on 2026-07-29 and **cannot be
reproduced on this host at all**, so nothing else could have covered it.

Live value now: **HO-0005's trip is still owed against `9f16a1e7` and `1a3b7ead`.**

### D7 — the check-NAME baseline (SHIPPED, and it is **gate 14**)

`08_validation/checkname_diff.sh` + the committed
`08_validation/sync_gate_checknames_V1_0_0.txt` (**22 full · 20 quick**).

**It runs sync_gate itself, in BOTH modes, on every invocation including `--quick`** — the question
is whether the blessed set is intact, and answering it for only the mode you happen to be running
would miss a check that vanished from the other one. ~1.2 s, Node-only.

**It lives outside sync_gate** because §5 Q1's failure mode is sync_gate dying with zero check lines
and no authority line; a self-check dies with it. **Both the bless and the compare refuse an empty
capture** — an empty baseline diffs clean against a dead gate forever.

## 3. ⚠️ Gate numbers are ARRIVAL IDs — the new gate is 14, and build_gate is still 13

The check-name gate was initially placed after sync-gate, which made `build_gate.sh` **gate 14** and
would have invalidated *"gate 13"* in ~30 places — the manifest, four living docs, and several
`consumed` handoffs that cannot be edited. **It was moved to the end instead.**

This repo already learned this lesson on sync_gate's own checks (*"check N is an arrival ID, not an
execution index; new checks take the next arrival ID"*). It applies to gates too. **Append; never
renumber.**

## 4. Every fix was proved by breaking something

In the `SLD_ADDIN_ROOT` mutant lab, so no real source was ever edited.

| Mutant | Before | After |
|---|---|---|
| gut `LayoutEngine.cs` | `4 passed, 3 failed.` — **T4b absent, no line** | `4 passed, 3 failed, of 9` + `T4b NOT ATTEMPTED` + `⚠️ ONLY 7 OF 9` |
| `<AssemblyName>DEDARMS.Core` | *"(T0.1 must pass first)"* — **T0.1 had passed** | *"but T0.1 PASSED … Check `<AssemblyName>`"* |
| hide one literal from the grep | `ok — all 4 hardcoded names present` | **RED**, naming `Cat1.png` as pinned-but-not-derived |
| two concurrent runs | both RED | both **GREEN 9/9**; bypass the lock and both go RED again |
| bogus pinned name (D8a) | — | **RED**, then green on restore |
| delete `lib/dll_embed…mjs` (D7) | — | **0 check lines** → capture guard fires, no empty diff |

## 5. Numbers, and what moved

**14/14** · `--no-build` **13/13** · `--quick` **6/6** · build-gate **9/9 of 9** · sync **22/22 full
· 20/20 quick** · **112** tests. Suite run **twice** (FL-0006), **identical by gate name**. Shas
`9f16a1e7` / `9f16a1e7` / `1a3b7ead` **unmoved**.

**B5 is no longer a prediction.** The decision record predicted the baseline would go 21→22 and
19→20 once D8a landed. Measured: exactly that.

The count sweep was done deliberately, because leaving it undone is FL-0014's class: `run_all_gates.sh`,
root `CLAUDE.md`, `README.md`, `README_engine.md`, the runbook (10 sites), `DEDARMS.Tests/README.md`,
`update_register`, `HO-0005`, and the decision record's §14 all now say 14/14 · 22/22 · 20/20 · 6/6.
**Historical records were deliberately left alone** — FL/FU/consumed-HO entries describe what was
true when written.

## 6. Traps this session adds

1. **`flock` + a compiler daemon = a lock that outlives the run.** See §2. If the gate ever hangs for
   exactly `BUILD_GATE_LOCK_WAIT`, check `flock --nonblock` on the lockfile and look for a live
   `VBCSCompiler` before suspecting the tree.
2. **`--no-build` is 13/13 now, not 12/12** — it skips gate 13 only; gate 14 is Node-only and still runs.
3. **Re-bless the name baseline deliberately, in the same change-set as the check you added.**
   Re-blessing to clear a red you did not intend is the exact failure the file exists to prevent.
4. **`build_project()` takes trailing msbuild args** (`build_gate.sh:255`). That is how Phase 5 adds
   the second configuration for D2b — not by editing the `-c Release` on line **258**.
   > ⚠️ **CORRECTED 2026-07-30 by HO-0012 (Phase 4).** This trap originally cited `:163` and `:166`.
   > **Both were stale by ~92 lines the day they were written** — *this very session* added `flock`,
   > `EXPECTED_CHECKS`, the shortfall banner and T4b's superset pass above them, then wrote down the
   > pre-edit numbers. FL-0014's class, committed by the session that closed it. **The advice was
   > right and is unchanged; only the pointers moved.** Measured: `build_project()` `:255`,
   > `-c Release` `:258`, call sites `:298` / `:304` / `:319`. **The seam is already in live use** —
   > `:299` and `:305` pass `-p:EnableWindowsTargeting=true` through it. Re-measure before using.

## 7. What is still open

- **D2b still has no instrument.** Unchanged by this session and still the top Phase 5 obligation:
  gate 13 builds `-c Release` only, §6.6 defaults Lab OFF for Release, so `DEDARMS.Lab.dll` would
  never be built. **Phase 5 must build both configs; "skip if absent" is FL-0001's class.**
- **D2c's Phase 5b obligation** from HO-0010 — what the Lab probe does when Lab is present and throws.
- **FL-0013 item 4** (strip the two stray NUL bytes) stays Phase 5 work: it edits shipping `.cs` and
  forfeits `9f16a1e7`'s blessed status, so it waits for the re-bless Phase 5 already owes.
- **HO-0005**, the other stream: `1a3b7ead` has still never run inside Revit. Nothing here unblocks it.

`_snapshot_pre_split_2026-07-30/` is still the only undo. **Do not delete it.**

## 8. Files changed

**New (3):** `08_validation/checkname_diff.sh` · `08_validation/sync_gate_checknames_V1_0_0.txt` ·
this file.

**Modified (18):** `run_all_gates.sh` · `08_validation/build_gate.sh` · `08_validation/sync_gate.mjs` ·
`03_contracts/current_state_manifest.json` (new `hardcoded_resource_names` + `gated_by_t4b`) ·
`CLAUDE.md` · `README.md` · `04_renderer/README_engine.md` · `00_Docs/repo_runbook_V1_0_0.md` ·
`00_Docs/dedarms_separation_decisions_V1_0_0.md` · `05_revit/…/DEDARMS.Tests/README.md` ·
`10_failure_log/` FL-0004 + FL-0011 + FL-0012 + FL-0013 + `failure_register_V1_0_0.md` ·
`11_future_updates/update_register_V1_0_0.md` · `12_handoff/` HO-0005 + HO-0010 + `handoff_register_V1_0_0.md`.

**No C# was edited. No blessed artifact was touched.**
