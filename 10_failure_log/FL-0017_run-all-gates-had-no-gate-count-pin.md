# FL-0017 — `run_all_gates.sh` had no expected-gate-count pin: a deleted gate read as a smaller green

| Field | Value |
|-------|-------|
| **ID** | FL-0017 |
| **Title** | The outermost runner — the layer every document quotes as "14/14" — was the only one with neither a count pin nor a name baseline |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `fixed` |
| **Severity** | S3 |
| **Stage** | gate |
| **Component** | `run_all_gates.sh` |
| **Failure class** | silent-skip |
| **Detected by** | Phase 5 verification, lane E (adversarial) |

---

## 1. Symptom

Delete one whole `run …` line from the runner and the suite still declares success:

```
grep -v 'run "conformance-walk" conformance' run_all_gates.sh > run_all_gates.sh
bash run_all_gates.sh --quick
→ GATES: 5 passed, 0 failed.
→ ALL SELECTED GATES GREEN            exit 0
```

## 2. Impact

Every living doc, the manifest, and several handoffs quote this runner's output as the headline
proof of health — "14/14", "6/6 quick", "13/13 no-build". A gate that is deleted, commented out, or
accidentally skipped simply shrinks the denominator, and the banner still says GREEN. Nothing in the
repo would notice.

This is FL-0011's finding ("status counts cannot see what a stage never attempted") at the **outermost
layer**, where the count is most quoted and least guarded. The inner layers were already protected:
`build_gate.sh` has `EXPECTED_CHECKS` plus a shortfall banner, and `sync_gate.mjs` is covered by
gate 14's check-NAME baseline. The runner had neither.

## 3. Root cause

The runner grew by accretion — gates 13 and 14 were both appended in 2026-07-30 sessions — and its
own header comment states the expected totals in **prose** ("Full mode reports 14/14; --no-build
13/13; --quick 6/6") while nothing asserted them. A comment is not a check.

## 4. Resolution

Added an `EXPECTED_GATES` pin immediately before the summary, **derived from the flags** rather than
hardcoded once, because the four modes legitimately differ:

```bash
EXPECTED_GATES=14
if [ "$QUICK" -eq 1 ]; then
  EXPECTED_GATES=6
else
  [ "$NOPNG"   -eq 1 ] && EXPECTED_GATES=$((EXPECTED_GATES-4))   # G5, G6, G7, G9
  [ "$NOBUILD" -eq 1 ] && EXPECTED_GATES=$((EXPECTED_GATES-1))   # gate 13
fi
ATTEMPTED=$((PASS+FAIL))
```

A mismatch prints a named diagnosis and exits 1 **regardless of the pass count**.

Files changed: `run_all_gates.sh` only.

⚠️ Adding a gate now means updating this arithmetic. That is deliberate: a gate should not be able
to arrive, or vanish, without someone touching this line.

## 5. Regression guard

**Mutant-proved 2026-07-30** in `/root/verify_lab`, deleting the conformance-walk gate line:

```
GATES: 5 passed, 0 failed.
⚠️  GATE-COUNT MISMATCH: 5 gate(s) ran, 6 expected for this mode.
    A gate was ADDED, REMOVED, or SKIPPED WITHOUT A FLAG. Do NOT read the pass count as
    coverage until this is explained — a deleted gate otherwise reads as a smaller green.
SUITE RED
EXIT CODE = 1
```

The **exit code** was checked separately from the banner text, because a piped `tail` masks it and
that is precisely how a non-zero exit goes unnoticed in a harness.

Restored: `--quick` 6/6 exit 0, full suite 14/14 twice, identical by check name.

## 6. Prevention

Three layers now each guard themselves differently — runner by **count**, build-gate by **count +
shortfall banner**, sync-gate by **name baseline**. The name baseline remains the strongest of the
three (it catches a rename, which a count cannot). Consider extending the name approach to the
runner if gate churn continues.
