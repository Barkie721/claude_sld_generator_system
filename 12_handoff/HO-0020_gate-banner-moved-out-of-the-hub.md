# HO-0020 — the gate-consumer banner is out of the hub: FL-0022's shape is now impossible, not discouraged

| Field | Value |
|-------|-------|
| **ID** | HO-0020 |
| **Written** | 2026-07-31 |
| **Work stream** | DEDARMS separation |
| **Status** | `open` |
| **Continuity state** | `clean` |
| **Predecessor** | **HO-0019 — now `consumed`** |
| **Blocked on** | nothing on the phone. **The Revit trip is the critical path** |
| **Exit state** | **14/14 twice, 89 check names identical, 0 FAIL** · build-gate **15/15** · sync **24/24** / **22/22** · **112** tests · shas **be6ae51a · 2e86b97d · 1a3b7ead UNMOVED**, `runtime_unverified` still `true` ×3 · **no `.cs`, no `.csproj`, no DLL touched** |
| **New FL** | none |

---

## 1. What this session was

**HO-0018 §6.3**, the last of the review's recommendations that was cheaper before Phase 7 than after.
Docs + one gate comment. Nothing compiled outside the gate suite.

**Mayo declined FU-0002 (git) first, deliberately, on 2026-07-31.** Recorded so the next session stops
re-litigating it — see §4.

---

## 2. ⭐ The move, and why it is a *cure* rather than another warning

The 22-line banner explaining the four `sync_gate` checks lived **inside the file those checks grep.**
Twice that arrangement produced a check that could not fail: **FL-0022**, and then again **inside
FL-0022's own first fix.** Both times the mechanism was identical — prose *about* the check became
prose the check *accepted*.

The banner now lives in **`docs/ops_build_and_test.md` § The four `sync_gate` checks that read
`../CLAUDE.md`**, with a short pointer left in the hub.

**Why that is airtight, verified rather than assumed:** `sync_gate.mjs` reads `13_addin/docs/*.md`
with `existsSync` and `statSync().size` **only — it never opens them.** Confirmed by reading the
check, not by grepping for absence. A careless sentence about a sha on that page is therefore
*physically incapable* of satisfying a grep over `13_addin/CLAUDE.md`.

### Measured effect on the hub

| | before | after |
|---|---|---|
| literal shipping shas **above** the ledger | 3 (escaped, inert-by-convention) | **0** |
| owned-satisfying lines, `addin_dll` / `addin_lab_dll` / `replay2023_dll` | 1 / 1 / 1 | **1 / 1 / 1** (L62 / L63 / L84) |
| `Current shipping … sha256` anchors | 1 + 1, correct | **1 + 1, correct** |

> 🚩 **The pre-loaded shadow FL-0023 warned about is GONE.** That FL recorded that the banner's own
> example rows sat 16 lines above the ledger and were inert *only* because their backticks were
> escaped — un-escape one, paste the current sha, and the shadow was live. **There are now zero
> literal shas above the ledger at all.** The escaping in those rows is no longer load-bearing, which
> is exactly the property that was bought, and the reason not to move the section back.

### Proved, in both directions

The **six original `mutants.sh` mutants** and the **five FL-0023 mutations** were all re-run against
the moved layout. **All eleven still go red; the previously-false-red correct change-set still passes.**

| | |
|---|---|
| M0 baseline · restored | 24/24 |
| M1 · M2 · M3 · M4 · M5 | RED, each naming the right artifact/check |
| M6 (hub moved into `docs/`) | RED, `ADDIN_ROOT` + 3 dependants |
| F1 decoy + rotted ledger | RED ×2 |
| F2 Lab's own line falsified | RED, `addin_lab_dll` |
| F3 / F3b docs truncated / deleted | RED |
| **F3c hub's link to the MOVED section rotted** | **RED** |
| Lab trip-verified, flag cleared, prose honest | **24/24 green** (no false red) |

> ⭐ **F3c is the one that makes this safe.** Moving content out of a pinned file is only sound if the
> pointer to it is itself pinned — otherwise you have traded a false green for a dangling reference.
> The `ADDIN_ROOT` check widened in FL-0023 asserts the hub still *links* each `docs/*.md` and that
> each exists and is not gutted, so **the pointer to the banner cannot rot silently.** That check was
> written for a different reason and turns out to be the precondition for this move.

---

## 3. Honest accounting: the hub did not get smaller

HO-0018 §6.3 argued partly from size — "22 of the hub's 86 lines, 26% of a deliberately short hub."
**The banner block went 22 lines → 11, but the hub is now 93 lines / 11,576 B, up from 86 / 11,071.**
HO-0019 added the ~20-line path-convention table in between. **Net across both sessions the hub GREW
by 7 lines**, and anyone re-reading §6.3's rationale should know the size argument did not pay off.

**The structural argument did, and it was always the real one.** Zero shas above the ledger is a
property no amount of care could have guaranteed while the banner lived there.

---

## 4. FU-0002 (git): DEFERRED BY MAYO, 2026-07-31 — a decision, not an oversight

Offered before this work and **declined.** Recorded here so it stops being re-raised as though nobody
had considered it:

- **What it costs today:** Phase 7 will move the entire `13_addin/` tree with **no version control**.
  The only rollback is a snapshot.
- **The concrete mitigation, and it needs doing:** the existing tarball
  `Download/sld_snapshot_post-phase6_2026-07-31.tgz` is **post-Phase-6 and now predates three
  sessions of work** (HO-0018 gate fixes, HO-0019's split, this move). **Take a fresh snapshot
  immediately before Phase 7 starts.** That is a two-minute action and it is the whole mitigation.
- FU-0002 stays **open**. It is still the cheapest risk reduction available; it is simply not
  happening before Phase 7.

---

## 5. Successor — resume at PHASE 7

**Every HO-0018 recommendation is now executed** (§6.1 and §7.1 by HO-0019; §6.3 here). §6.2 (keep
`13_addin/docs/`) and §6.4/§6.5 were "no change" recommendations and stand as written.

> 🚩 **PREP BRIEFING WRITTEN 2026-07-31 — READ IT FIRST:**
> **`Download/DEDARMS_PHASE7_PREP_2026-07-31.md`**, self-contained. It carries the plan's §10 step
> list with the **five sessions of drift the plan predates**, the decision record's §12 obligations,
> the trap list, exit criteria, and its own known weaknesses. **Its §1 is the one thing that must not
> be missed: Phase 7 is the first phase that MUST re-bless the check-name baseline** — deleting the
> `addin_dll` and `replay2023_dll` slots and their checks changes check NAMES on purpose, so the
> "89 names identical" exit criterion every recent session used is **wrong for Phase 7**.

Read the plan's §10 PHASE 7 (sessions 7a, 7b) and **the decision record, which outranks the plan.**

### Carry forward

- 🚩 **The REVIT TRIP is the critical path.** Eight items wait on it; **none of the three shipping
  DLLs has ever run in Revit.** Nothing on the phone advances it.
- 🚩 **Take a fresh snapshot before Phase 7** (§4). There is no git.
- ⚠️ **The hub now carries THREE load-bearing structures** — the doc index, the path-convention table,
  and the sha ledger. **Re-mutate after touching any of them.** FL-0022 and FL-0023 both apply.
- ⚠️ **`docs/ops_build_and_test.md` already contains a line that WOULD satisfy the honesty check for
  `be6ae51a` if anything read it** (in its FOUR CORRECTIONS note, pre-existing). It is inert because
  no consumer opens that file — **which is now load-bearing.** If a future gate ever reads
  `13_addin/docs/`, **run the satisfying-line audit there before wiring it up.**
- ⚠️ **~20 parent-repo citations become cross-repo references the day the tree moves.** Tagged
  `(SLD repo)` and ruled in the hub's path table; it is a Phase 7 change-set item.
- ⚠️ **Treat the seven feature documents as new prose to review** — ~21 KB is attested by no Phase 6
  fragment, and neither HO-0019 nor this session reviewed content for accuracy.
- The two oracles: `Download/DEDARMS_PHASE6_AUDIT_TRAIL_2026-07-31/` and
  `Download/DEDARMS_HO0019_PRESPLIT_feature_sld_2026-07-31/`. **Keep both until Phase 7 is done.**

**HO-0019 is `consumed` by this entry.**
