# FL-0010 — `baselineCheck` skipped unparseable lines silently, so a mangled or emptied baseline list passed as green

| Field | Value |
|-------|-------|
| **ID** | FL-0010 |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `fixed` |
| **Severity** | S3 |
| **Stage** | gate |
| **Component** | `08_validation/sync_gate.mjs` — `baselineCheck`, phase 6 (arrival IDs 19 and 20) |
| **Failure class** | false green |
| **Detected by** | read-through during the FL-0009 fix, DEDARMS-separation Phase 1 session |

---

## 1. Symptom

`baselineCheck` parsed each line of a `*_sha256.txt` list with

```js
const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
if (!m) continue;          // <-- a line that stops parsing stops being checked
n++;
```

A line that failed the regex was **silently dropped**, and `n` counted only the lines that matched.
So the check's verdict depended entirely on lines that still looked well-formed:

| Damage | Old verdict |
|---|---|
| list truncated to empty | `ok — 0 baselines match` |
| one of six lines corrupted | `ok — 5 baselines match` |
| all six corrupted | `ok — 0 baselines match` |

The count was *printed*, so a careful reader could in principle notice 6 become 5. Nothing
**asserted** it, and nobody reads a green line.

## 2. Impact

Phase 6 is the PNG visual-regression net — gates G5/G6/G9's baseline lists are the only thing
standing between a restyle and a silent visual change. A corrupted list did not merely lose
coverage; it reported that coverage as satisfied. Combined with the standing advice that `--no-png`
"drops four gates", the failure mode is a run that *looks* like it took the expensive path.

Never observed in the wild — both lists are intact (4 and 6 entries). Filed because it is the same
shape as FL-0001 and FL-0009: **an assertion that declines to run and reports success.**

## 3. Root cause

`continue` was written for tolerance — skip blank lines, headers, comments. Neither list has any.
Both are 100% `<64-hex>  <relative path>` lines, so in this codebase an unparseable line is always
damage, never formatting. The tolerance had no case to serve and cost the assertion.

Generalisation worth carrying: **this repo has a recurring "count printed but never asserted"
pattern.** The same defect exists in `DEDARMS.Tests/Program.cs`, which prints
`RESULT: passed=N` and exits on `failed`/`errors` only — a test that stopped being discovered would
not fail the run. Printing a number is not gating it.

## 4. Fix

`08_validation/sync_gate.mjs`, 2026-07-30 — two changes inside `baselineCheck`:

1. An unparseable non-blank line is now pushed to `bad` (with the offending text, truncated to 60
   chars) instead of being skipped.
2. `n === 0` is now an explicit failure: *"an empty or truncated list cannot prove anything."*

No expected-count constant was introduced. Pinning "expect 4" and "expect 6" would add a third place
to keep in sync for no extra detection — any real damage either mangles a line or empties the file,
and both are now caught.

## 5. Guard, and how it was proved

Mutant-probed both ways against the composed list, then restored and re-verified:

| Mutant | Result |
|---|---|
| list truncated to empty | `FAIL … yielded 0 baselines — an empty or truncated list cannot prove anything` |
| one line's sha prefix corrupted to `ZZZZ` | `FAIL … unparseable line: "ZZZZ691d18014df2…"` |
| restored | `ok — 6 baselines match`, suite **21/21** |

Before the fix those same two mutants produced `ok — 0 baselines match` and `ok — 5 baselines
match`.

## 6. Related

- **FL-0009** — filed the same day from the same read-through; four DLL checks soft-skipping to
  green. Same class, phase 1.
- **FL-0001** — the original of this class, 2026-07-25.
- **FL-0006** — also phase-adjacent and still open: sync_gate P4 reads `audit.json` that G6
  regenerates later in the same run, so run 1 after a change is a false *red*. Unrelated mechanism,
  opposite direction.
