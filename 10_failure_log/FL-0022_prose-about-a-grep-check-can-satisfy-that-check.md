# FL-0022 — prose *about* a grep-based check satisfied that check, making it unfalsifiable for one artifact

| Field | Value |
|-------|-------|
| **ID** | FL-0022 |
| **Title** | A banner documenting `runtime_unverified flag agrees with the add-in CLAUDE.md prose` quoted a shipping sha beside the phrases the check greps for, so the banner itself became a satisfying line |
| **Opened** | 2026-07-31 |
| **Closed** | 2026-07-31 |
| **Status** | `fixed` |
| **Severity** | `S2` |
| **Stage** | `docs` / `gate` |
| **Component** | `13_addin/CLAUDE.md` (the Phase 6 hub banner) ↔ `08_validation/sync_gate.mjs:643` |
| **Failure class** | other — false green, self-inflicted, in the same change-set that documented the risk |
| **Detected by** | **mutant M1**, run before the change-set was trusted. No gate would ever have caught it: the gate was GREEN, which was the defect. |

---

## 1. Symptom

Separation Phase 6 split the 84 KB `13_addin/CLAUDE.md`. Because four `sync_gate` checks read that
path, the new hub opened with a banner explaining them, including this table row:

> `runtime_unverified flag agrees…` (P1) | **Per shipping DLL: one line carrying that artifact's
> short sha AND a "never run / not yet run / never been loaded" phrase AND the word "Revit" — all
> three on the SAME line.** The margin for `1a3b7ead` is a **single line**.

The check greps, per artifact, for a line containing that artifact's short sha **and** a never-run
phrase **and** "Revit". **That row contains all three.** So it satisfied the check on the replayer's
behalf, and mutant M1 — which deletes the real honesty line — scored a clean **24/24 GREEN**.

```
=== M1 replay2023_dll never-run phrase separated from its sha
  SYNC-GATE: 24 passed, 0 failed.
  !!! DID NOT GO RED — MUTANT SURVIVED !!!
```

## 2. Why it matters more than a wrong line number

The honesty check exists to stop `runtime_unverified` becoming a field nobody reads while the prose
beside it quietly claims the build is good. `replay2023_dll`'s margin was already **one line** — the
prep briefing for this phase said so in bold. This defect did not move that line. **It removed the
need for it**, silently, while appearing to protect it. A future session could have deleted the real
warning during any edit and seen nothing but green.

It is FL-0019(e)'s class — *a check that is true by construction* — reproduced by prose rather than
by code, and reproduced **by the session that had just read FL-0019 §6 about it.**

## 3. The second occurrence, in the fix

The first fix removed the sha from the table row and added a warning underneath explaining the trap.
**That warning quoted the sha again**, beside "never run" and "Revit". M1 survived a second time.
This is recorded because the shape is the lesson: *writing about a grep target is writing the grep
target.*

## 4. Fix

`13_addin/CLAUDE.md`: the banner now names artifacts **in words** ("the 2023 replayer"), never by
short sha. Shas appear only in the ledger below it, where they are supposed to be load-bearing.

Rule, added to the banner:

> **NEVER write a literal shipping sha into prose ABOUT this check.** Documentation of a check must
> never be able to satisfy it.

## 5. Verification

Six mutants, run in a shadow repo (`/root/p6shadow`) that first reproduced **24/24** unmutated:

| Mutant | Expected | Result |
|---|---|---|
| M0 baseline, split docs in place | green | **24/24** ✅ |
| M1 replayer's sha separated from its never-run phrase | RED naming `replay2023_dll` | ✅ *(after the fix; survived twice before it)* |
| M2 `addin_dll` never-run phrase removed | RED naming `addin_dll` | ✅ |
| M3 `addin_lab_dll` loses BOTH satisfying lines | RED naming `addin_lab_dll` | ✅ |
| M4 `Current shipping DLL sha256` reworded | RED, P5 | ✅ |
| M5 Replay2023 anchor split across two lines | RED, P5 | ✅ |
| M6 `13_addin/CLAUDE.md` moved into `docs/` | RED, `ADDIN_ROOT` (+3 dependants) | ✅ |

## 6. Reading

**A check whose documentation lives inside the artifact it checks is a check you must re-mutate after
every documentation edit.** The four consumers here read a living document that people are *expected*
to edit; the grep terms are ordinary English. Any future prose in `13_addin/CLAUDE.md` that discusses
runtime verification should be assumed to interact with the check until a mutant says otherwise.

Cheapest guard, and it is already in the hub: **shas in the ledger, artifact names in the prose.**
