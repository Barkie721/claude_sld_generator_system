# FL-0009 — four sync_gate DLL checks soft-skipped to `ok: true` when the DLLs were absent, and one of them never needed a DLL at all

| Field | Value |
|-------|-------|
| **ID** | FL-0009 |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `fixed` |
| **Severity** | S2 |
| **Stage** | gate |
| **Component** | `08_validation/sync_gate.mjs` — checks 3, 4, 7, 8 (arrival IDs) |
| **Failure class** | false green |
| **Detected by** | the DEDARMS-separation planning pass (adversarial red-team of the split handoff), 2026-07-30 |

---

## 1. Symptom

Four phase-1 checks returned success when they could not see the bytes they exist to compare:

| Check (arrival ID) | Line | Returned |
|---|---|---|
| 3 — add-in DLL carry copies match manifest sha | 75 | `{ ok: true, detail: 'no DLL on disk (skipped — built on the Windows box)' }` |
| 4 — Replay2023 DLL carry copies match manifest sha | 95 | `{ ok: true, detail: 'no DLL on disk (skipped — not yet built here)' }` |
| 7 — DLL embed matches manifest embeds_map_sha256 | 234 | `{ ok: true, detail: 'no DLL on disk (skipped — built on the Windows box)' }` |
| 8 — DLL embed == current family map (lockstep) | 246 | `{ ok: true, detail: 'no DLL on disk (skipped)' }` |

With the DLLs absent, the **entire family-map↔DLL lockstep proof evaporated into four green lines**,
and it did not announce itself: `SYNC-GATE GREEN` printed exactly as it does on a fully-proved run.

**Check 8 is the sharp case, and it inverts the usual story: it never opened a DLL in the first
place.** Its body compares `M.artifacts.addin_dll.embeds_map_sha256` against
`M.artifacts.family_map.sha256` — *two manifest fields*. Whether a DLL happened to be on the box was
irrelevant to whether the manifest was self-consistent. The guard at L246 was pure loss: it could
only ever hide a real lockstep violation, never prevent a spurious one.

## 2. Impact

This is a re-entry of **FL-0001's exact failure class** by a different route. FL-0001 was a check
that could not discriminate; this is a check that declines to try and reports success anyway. The
comment written above the FL-0001 fix — *"a check that cannot see the bytes must never report
success"* — was already in this file, at `extractEmbeddedMapSha`, while four checks below it did the
opposite.

Not yet an incident: all four carry copies happen to be present on this phone, so the skip branches
were never taken in a real run. The cost was latent and was about to become real — the planned
extraction of the add-in into its own repo would have removed the DLLs from this tree and turned
four checks green-and-vacuous in the same change-set that made them matter most.

## 3. Root cause

The soft-skips encode an assumption that was **already false when written**: that `DEDARMS.dll` is
"built on the Windows box" and therefore legitimately absent here. It is built on this phone
(`/root/dotnet/dotnet build -c Release`), and the manifest's own `addin_dll.note` documents that.
The repo has no VCS and no `.gitignore` — the DLLs are simply files in the folder — so there is no
fresh-clone-without-a-build scenario for the skip to serve.

## 4. Fix

`08_validation/sync_gate.mjs`, 2026-07-30:

1. **Check 8: deleted the L246 guard outright** — one line. The check now asserts unconditionally,
   which is what a manifest-vs-manifest comparison should always have done. Replaced with a comment
   recording why there is deliberately no disk guard.
2. **Checks 3, 4, 7: the "no DLL" branch now FAILS**, and names which paths were searched — "no DLL
   on disk" without saying where you looked is a useless diagnostic once it is a hard red.
3. Added a phase-1 check (**arrival ID 21**) asserting `ADDIN_ROOT` resolves to a real directory
   *and* contains the add-in `CLAUDE.md`. Without it, a moved or half-landed tree produces seven
   separate per-file "missing" reds and the actual cause appears in none of them. The `CLAUDE.md`
   probe is not redundant: a bare directory test passes against an empty folder of the right name,
   which is exactly what an interrupted move leaves behind.

Suite: **20/20 → 21/21 full, 18/18 → 19/19 quick.**

## 5. Guard, and how it was proved

Proved by A/B on **identical broken state**, not by argument. Both `addin_dll` carry copies were
moved aside and the pre-fix and post-fix scripts were each run against that state:

| | Result | The three DLL checks |
|---|---|---|
| pre-fix | `17 passed, 1 failed` | `ok … (skipped)` ×3 — the single red was only the collateral `.addin`-beside-its-DLL check |
| post-fix | `16 passed, 3 failed` | three hard reds naming the searched paths |

**Check 8 stayed green throughout**, which is the positive control: it proves the L246 deletion
worked rather than merely making the check louder.

⚠️ **Renaming ONE carry copy is not a valid regression test.** Check 3 uses
`carry_copies.filter(exists)` and check 7 uses `.find(exists)`; with two copies pinned, removing one
leaves `present.length === 1` and the changed branch is never reached. **Move both.**

## 6. Related

- **FL-0001** — the same class, found 2026-07-25. Its lesson was written down and then contradicted
  three checks later in the same file.
- **FL-0010** — filed the same day, from the same read: `baselineCheck` passes vacuously on a mangled
  baseline sha list. Same shape, phase 6.
- The DEDARMS separation handoff, §0.4(1) — this was its first "thing that will lie to you".
