# FL-0016 — the Lab satellite shipped with NO carry-copy sha check, while the manifest claimed one

| Field | Value |
|-------|-------|
| **ID** | FL-0016 |
| **Title** | `DEDARMS.Lab.dll` had no sha assertion anywhere in the gate suite; `addin_lab_dll.gated_by` asserted a "carry-copy sha" that did not exist |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `fixed` |
| **Severity** | S2 |
| **Stage** | gate |
| **Component** | `08_validation/sync_gate.mjs:93` · `03_contracts/current_state_manifest.json` → `artifacts.addin_lab_dll.gated_by` |
| **Failure class** | silent-skip |
| **Detected by** | Phase 5 verification, lane C (cold artifact/contract audit) — **ESCAPED** Phase 5b and 5c |

---

## 1. Symptom

`sync_gate_checknames_V1_0_0.txt`, in both the 24-name FULL list and the 22-name QUICK list:

```
[P1] add-in DLL carry copies match manifest sha        <- addin_dll   ONLY  (sync_gate.mjs:93)
[P1] Replay2023 DLL carry copies match manifest sha    <- replay2023_dll    (sync_gate.mjs:112)
```

There was **no Lab equivalent**. `addin_lab_dll` appeared in `sync_gate.mjs` at exactly two places:
the installer-pin check (`:237`) and an `ARTIFACT_FOR` row (`:374`) inside
`[P1] blessed carry-copy DLL answers to the hardcoded resource names`. That check reads the carried
Lab DLL and verifies its resource **names** plus a must-NOT-contain pass. **It never hashes it.**

Meanwhile the manifest asserted the opposite:

> `"gated_by": "sync_gate.mjs (carry-copy sha + the installer pin) and build_gate.sh T0.5/T4c…"`

and, in the same object:

> *"the ONLY things standing between 'forgot to copy one file' and 'the cats quietly vanished' are
> this carry-copy pin and `install_dedarms.ps1`. **Do not weaken either.**"*

The pin it names, for this artifact, was not implemented.

## 2. Impact

A `DEDARMS.Lab.dll` that drifted from its blessed `43805105` while still embedding its three
resource names passed **sync 24/24 and build-gate 14/14**. The first thing that would have noticed
is `install_dedarms.ps1` refusing to install — **on the Revit box, mid-trip**. That is the exact
trip-costing class this repo has now been bitten by more than once, and it applies to the one
assembly whose absence or wrongness is *silent at runtime* by decision D2c (14 buttons, empty Fun
panel, no error).

Related weakness in the same check, fixed at the same time: `carry_copies.filter(exists)` failed
only when **zero** copies were present, so deleting one of two produced
`ok … 1/2 present @ d521ad30` — a passing line that printed its own shortfall (FL-0009's class).

Not currently triggered: all four carry copies were present and matched at the time of the audit.

## 3. Root cause

Phase 5b created the satellite and its manifest slot. Phase 5c blessed it and added the installer
pin. Both correctly extended the checks that **enumerate assemblies** (T4b/T4c, the resource-name
check, the installer-pin check) — because those iterate a map and a new row is obvious. Neither
extended the check that was **hardcoded to a single artifact**, because nothing in it names the set
it is supposed to cover, so adding an assembly did not make it look incomplete.

`sync_gate` deliberately names every artifact explicitly and never iterates `M.artifacts`
(HO-0002 §6 trap 7). That is the right call — it makes a missing slot loud — but its cost is that a
NEW artifact is silently uncovered until someone writes its check by hand.

## 4. Resolution

Widened the existing check to loop over both shipping 2025 assemblies rather than adding a new check
name — so no check-name baseline re-bless was required and gate 14 stayed at 24/22:

```js
const SLOTS = ['addin_dll', 'addin_lab_dll'];
```

with three hard failures per slot: slot absent · `carry_copies` empty/absent · any copy **missing**
(no longer a passing `1/2`) · any copy's sha != manifest.

Files changed: `08_validation/sync_gate.mjs` only. The manifest's `gated_by` prose needed no edit —
the fix made the existing claim true.

## 5. Regression guard

**Mutant-proved ×2 on 2026-07-30**, in a throwaway full-repo lab at `/root/verify_lab`:

```
MUTANT A — append one byte to deploy/DEDARMS/DEDARMS.Lab.dll
FAIL [P1] add-in DLL carry copies match manifest sha —
     addin_lab_dll: 1 carry copy(ies) != manifest 43805105 — …/deploy/DEDARMS/DEDARMS.Lab.dll
SYNC-GATE: 21 passed, 1 failed.

MUTANT B — delete one Lab carry copy
FAIL [P1] add-in DLL carry copies match manifest sha —
     addin_lab_dll: 1/2 carry copy(ies) MISSING: …/deploy/DEDARMS/DEDARMS.Lab.dll
SYNC-GATE: 21 passed, 1 failed.
```

Both were **GREEN** before the fix. Lab restored to 22/22 after each. Real repo: 14/14 twice,
identical by check name.

Passing line after the fix:
`ok [P1] add-in DLL carry copies match manifest sha — addin_dll 2/2 @ d521ad30 · addin_lab_dll 2/2 @ 43805105`

## 6. Prevention

**When a manifest field describes which gate covers an artifact, that string is a claim and nothing
was checking it.** Lane C found this by reading `gated_by` and then looking for the check it named —
a cheap audit that had never been run. Worth repeating for every artifact whenever a slot is added.

Standing rule for the next artifact slot: adding one means grepping `sync_gate.mjs` for **every**
check that hardcodes an artifact name, not only the ones that iterate.
