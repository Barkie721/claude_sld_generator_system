# 10_failure_log — Failure Log

The system's memory of what went wrong and how it's now prevented. This folder exists so that no
defect is fixed *quietly*: every failure ends in a **regression guard** (a gate, test, or assertion)
that makes the same failure loud if it ever returns. That is the same discipline that produced gate
G8 — which exists only because earlier gates were blind to a whole class of geometry-export bug.

Fresh start: any prior failure log is retired. This is a clean V1 register.

---

## What counts as a failure

Anything the system did wrong, or nearly did, that a future run should not repeat:

- **Wrong output** — bad geometry, a misplaced/dropped element, a golden-case divergence, an
  NEC non-negotiable (CLAUDE.md §6) violated or suppressed.
- **A gate/test that lied** — went green while something was broken (the most dangerous kind — these
  grow the gate suite).
- **Revit runtime failures** — add-in crashes, family-resolution misses, transaction aborts.
- **Process failures** — a version bump that skipped a downstream reference, a snapshot re-blessed by
  mistake, an out-of-sync family-map copy.

Not every annoyance belongs here — log it if repeating it would cost real time or ship a wrong drawing.

---

## Severity

| Sev | Meaning |
|-----|---------|
| **S1** | Wrong drawing could ship, or an NEC non-negotiable was violated/suppressed. |
| **S2** | Golden-case divergence, or a gate blind spot that let a real defect through. |
| **S3** | Contained bug caught before output; correctness dented but not shipped. |
| **S4** | Cosmetic / process friction; no correctness impact. |

---

## Lifecycle of an entry

1. **Open** — copy `failure_log_template_V1_0_0.md` → `FL-XXXX_short-slug.md` (next ID from the
   register). Fill Symptom + Impact; Root cause / Resolution start as `TBD`.
2. **Investigate** — status `investigating`; fill Root cause.
3. **Fix** — status `fixed`; fill Resolution **and** Regression guard (mandatory). If it escaped
   every gate, fill the Detection-gap section too.
4. **Register** — add/update the one-row summary in `failure_register_V1_0_0.md`.

`wont-fix` is valid — record why and the accepted workaround. `recurred` means a guarded failure came
back anyway; that's a signal the guard was too weak — strengthen it, don't just reopen.

---

## Files

| File | Role |
|------|------|
| `README.md` | This — purpose, severity, lifecycle. |
| `failure_log_template_V1_0_0.md` | Copy-me template for a single failure. |
| `failure_register_V1_0_0.md` | Running index; one row per failure, newest first. |
| `FL-XXXX_*.md` | Individual failure entries — the register lists every one and carries the `Next ID`. |

---

## Naming

- Entries: `FL-XXXX_short-slug.md` — zero-padded 4-digit ID + kebab slug (e.g. `FL-NNNN_stale-level-line-y.md`, where `NNNN` is the register's `Next ID`).
- Shared docs carry the repo's `_V1_0_0` version suffix; per-failure entries do **not** version —
  they're immutable records, superseded by a new FL number, never re-versioned.
