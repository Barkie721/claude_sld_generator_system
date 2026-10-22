# 12_handoff — Session Handoffs

The system's **resume point**. One entry per session that ends with work still in flight, written so
the next session starts cold — no re-derivation, no re-reading the whole repo to find out where
things stand.

This is the third register in the set, and the boundary between the three is the whole point:

| Folder | Answers |
|--------|---------|
| `10_failure_log/` | **What went wrong** — and the guard that stops it recurring |
| `11_future_updates/` | **What should happen next** — and what "done" looks like |
| `12_handoff/` | **Where the work actually is right now** — and what to type first |

An FU says *"build the replay capture."* A handoff says *"three of the four files exist, `ToText()`
is stubbed, the DLL has NOT been re-blessed, and the next command is `bash run_all_gates.sh --quick`."*

It exists because a 13-gate suite's state is invisible from the filesystem, and because a build
target — the Revit add-in — runs only on a Revit box, not on the build machine. Git (this folder
has been in the workspace repository since 2026-10-06; FU-0002 records the earlier no-git ruling)
shows what changed, not what was verified or what comes next. Session state that lives only in
conversation memory is state that is lost.

---

## When to write one

**Write a handoff when a session ends and any of these is true:**

- Work is mid-flight — files edited, a phase partly done.
- Something was **verified** this session that would otherwise be re-verified next session.
- A gate is red, or a baseline is deliberately un-blessed.
- The next step is blocked on a Revit trip, an EOR decision, or Mayo's sign-off.
- A trap was discovered that is not yet written into `CLAUDE.md` or a failure entry.

**Do NOT write one when** the session ended clean and closed — an FU moved to `shipped`, gates green,
nothing outstanding. A handoff with nothing to hand off is noise, and it teaches the next reader that
these files are skimmable. They are not.

---

## The discipline

**1. Separate `VERIFIED` from `ASSUMED`.** §4 of the template is the most important section in this
folder. A fact checked against the source this session carries a `file:line`; a fact carried forward
from an earlier session or a plan document is `ASSUMED` until re-checked. Handoffs decay — an entry
that does not say which of its claims were actually observed is worse than no entry, because it gets
trusted.

**2. State the next action as a command, not an intention.** "Continue Phase 1" is not a handoff.
The exact next thing to type is.

**3. Record what is NOT done, especially the rituals.** The expensive failure in this repo is a DLL
that changed without a re-bless, or a baseline moved without a re-freeze. Those are invisible on
disk. Name them.

**4. Handoffs are immutable once the next session starts.** Do not edit HO-0004 to reflect what
happened after it — write HO-0005. The chain is the record.

---

## Status

| Status | Meaning |
|--------|---------|
| `open` | The next session should start here. **At most one entry is `open` per work stream.** |
| `consumed` | A later session picked it up. Name the successor HO in §7. |
| `stale` | Superseded by events without being worked — say what overtook it. Kept, never deleted. |

## Continuation state

The one-word answer to *"can I just start?"*

| State | Meaning |
|-------|---------|
| `clean` | No partial edits. Every file on disk is in a consistent state. Start fresh. |
| `mid-edit` | Files are partly changed. **§2 must list every touched file.** |
| `blocked` | Cannot proceed on the build machine. §6 names exactly what unblocks it. |

---

## Files

| File | Role |
|------|------|
| `README.md` | This — purpose, when to write, the discipline. |
| `handoff_template_V1_0_0.md` | Copy-me template. |
| `handoff_register_V1_0_0.md` | Running index, newest first. |
| `HO-XXXX_*.md` | Individual handoff entries. |

## Naming

`HO-XXXX_short-slug.md` — zero-padded 4-digit ID + kebab slug, next number from the register.
Sorted **newest-first** in the register, like `10_failure_log/`, not priority-sorted like
`11_future_updates/` — a handoff is read chronologically because the most recent one is the only one
that is `open`.

Per-entry files do **not** carry a `_V1_0_0` suffix; they are records of a moment, superseded by a
new HO number, never re-versioned.
