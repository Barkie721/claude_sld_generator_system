# 11_future_updates — Future Updates

The system's forward register: what should happen next, why it is worth doing, and what "done" looks
like. This folder is the deliberate mirror of `10_failure_log/` — that one is the memory of **what
went wrong**, this one is the plan for **what's next**. Same three-file shape, same rubric-table
discipline, same immutable-entry naming.

It exists because forward-looking work was previously scattered across `CLAUDE.md` §11 "Known gaps",
prose asides in the runbook, and session memory. Scattered work has implicit priority, unestimated
effort, and — the expensive one in this repo — no visible distinction between work that is blocked on
the Windows Revit box and work that could be done on the build machine tonight.

**The discipline:** an entry states its **acceptance criteria and blast radius before work starts**,
the same way a failure entry must name its regression guard before it closes. An update whose "done"
condition is written only after the fact is how a golden re-freeze gets blessed by accident.

---

## What counts as a future update

A change worth doing that is **not a defect**:

- **New capability** — a symbol defined, a placer built, a pipeline stage automated.
- **Closing a documented gap** — the `CLAUDE.md` §11 list, an unauthored Revit family, an
  unspecified transform.
- **Spec / symbol coverage** — promoting a placeholder symbol to a real one, extending the schema.
- **Gate + tooling work** — a new gate, a new cross-check, a measurement tool.
- **Data layer** — a new lookup table, a re-normalization, a family-map expansion.
- **Process** — version control, release ritual, doc structure.

**A defect goes in `10_failure_log/`, not here.** The boundary matters: a failure log entry records
something that *is wrong now*; a future update records something that *is not built yet*. An FL entry
may legitimately **spawn** an FU when its fix is large enough to schedule rather than just do —
in that case cross-link the two and keep the detail in one place, never both.

Not every idea belongs here either. Log it if it would survive a month of not being done.

---

## Priority

| P | Meaning |
|---|---------|
| **P0** | Correctness or NEC exposure — a wrong drawing could ship without it. Do next. |
| **P1** | Blocks other work, or closes a known gap that has already cost real time. |
| **P2** | Real improvement, nothing is blocked on it. **The default.** |
| **P3** | Nice to have / cosmetic / someday. |

**Effort**

| E | Meaning |
|---|---------|
| **S** | Under one session. |
| **M** | About one session. |
| **L** | Two to three sessions. |
| **XL** | Multi-session, or it forces a golden re-freeze. |

**Readiness** — `ready` · `blocked:windows-revit-box` · `blocked:EOR` · `blocked:family-authoring` ·
`blocked:FU-XXXX`

Readiness is a **first-class field, not a footnote.** Priority alone is the wrong sort order in this
repo: a P1 that is `blocked:windows-revit-box` cannot be tonight's work, and a ready P2 can. Read the
register as *priority within what is actually startable*.

---

## Lifecycle of an entry

1. **Propose** — copy `future_update_template_V1_0_0.md` → `FU-XXXX_short-slug.md` (next ID from the
   register). Fill Problem + Proposed change + Priority/Effort/Readiness. Status `proposed`.
   Unknowable fields start as `TBD` — an honest `TBD` beats a guessed value.
2. **Accept** — Mayo signs off on doing it at all. Status `accepted`. Nothing is `accepted` by an
   author proposing their own idea.
3. **Plan** — Scope, Acceptance criteria, Blast radius and Verification plan are filled in **before**
   the first line of work. Status `planned`.
4. **Build** — status `in-progress`.
5. **Ship** — status `shipped`; record what actually changed and which gates were re-run green. If it
   moved the golden, name the re-freeze.
6. **Register** — add/update the one-row summary in `update_register_V1_0_0.md` at every transition.

**Terminal states other than `shipped`:** `deferred` (right idea, wrong time — say what unblocks it),
`rejected` (decided against — **say why**), `superseded` (a later FU replaces it — name the successor).

**Rejected entries are kept, never deleted.** A rejected idea that leaves no record gets re-proposed
by the next session, re-investigated, and re-rejected at full cost. This is the same discipline the
failure log applies backwards, applied forwards.

---

## Files

| File | Role |
|------|------|
| `README.md` | This — purpose, priority rubric, lifecycle. |
| `future_update_template_V1_0_0.md` | Copy-me template for a single update. |
| `update_register_V1_0_0.md` | Running index; one row per update, sorted by priority. |
| `FU-XXXX_*.md` | Individual update entries. |

---

## Naming

- Entries: `FU-XXXX_short-slug.md` — zero-padded 4-digit ID + kebab slug
  (`FU-0002_repo-under-git.md`).
- Shared docs carry the repo's `_V1_0_0` version suffix; per-update entries do **not** version —
  they are records of a decision, superseded by a new FU number, never re-versioned.
