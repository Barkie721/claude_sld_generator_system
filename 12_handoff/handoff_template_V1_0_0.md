# HO-0000 — <one-line title: where the work stands>

> **Copy this file to start a new entry.** Name it `HO-XXXX_short-slug.md` (next number from
> `handoff_register_V1_0_0.md`), fill the header table + sections, delete the `<…>` prompts and this
> quote block, then add the one-row summary to the register.
>
> §4 (Verified vs assumed) and §5 (Start here) are the sections that make this file worth writing.
> If you fill nothing else, fill those two.

| Field | Value |
|-------|-------|
| **ID** | HO-XXXX |
| **Written** | YYYY-MM-DD |
| **Session** | <date + a one-phrase description, or a memory slug> |
| **Status** | `open` \| `consumed` \| `stale` |
| **Continuation state** | `clean` \| `mid-edit` \| `blocked` |
| **Work stream** | <FU-XXXX, a phase name, or a free-text stream — what this handoff is *about*> |
| **Gates last run** | <which command, when, and the result — or `not run this session`> |
| **DLL re-bless owed?** | `no` \| **`YES — <which artifact>`** |
| **Golden re-freeze owed?** | `no` \| **`YES — <which baseline>`** |
| **Blocked on** | `—` \| `windows-revit-box` \| `EOR` \| `Mayo sign-off` \| `FU-XXXX` |
| **Next action** | <the literal first thing to do, one line> |

---

## 1. Where the work stands
<Two or three sentences. Someone who has never seen this work should be able to read only this
section and know what is being built and how far along it is. Not a diary — a state description.>

## 2. What changed this session
<Every file created, edited or deleted. If nothing was written, say "no files changed — this was a
design/verification session" and say what was decided instead.>

| File | Change | Complete? |
|------|--------|-----------|
| `<path>` | <what changed> | yes / **partial — <what's missing>** |

**Rituals NOT performed:** <re-bless, re-freeze, register row, memory write — or `none owed`. This
line exists because these are invisible on disk.>

## 3. What is currently true on disk
<The state a fresh session will actually find. Does it build? Do the gates pass? Is anything half-
written that would confuse someone reading it cold? Name any file that looks finished but isn't.>

## 4. Verified vs assumed
**The most important section.** A `VERIFIED` line was observed this session and carries its
evidence. An `ASSUMED` line came from a plan, an earlier session, or memory and has **not** been
re-checked — treat it as a claim, not a fact.

### VERIFIED this session
| Fact | Evidence |
|------|----------|
| <claim> | `<file:line>` / <command + result> |

### ASSUMED — carried forward, not re-checked
| Claim | Source | Cost if wrong |
|-------|--------|---------------|
| <claim> | <plan §X / HO-XXXX / memory> | <what breaks> |

## 5. Start here
<The exact next action, as commands. Include the bootstrap paste if the work needs one. A reader
should be able to copy this section and be working inside a minute.>

```bash
<the literal commands>
```

Then: <the first substantive step, specific enough to start without re-reading anything>.

## 6. Traps and gotchas
<Everything discovered the hard way that is not yet written into `CLAUDE.md`, the runbook, or a
failure entry. If a trap is big enough to bite twice, it belongs in `10_failure_log/` — say so and
cross-link, and keep the detail in one place, never both.>

## 7. Open decisions
<What is waiting on a human. Name the decider. A decision that is "waiting on someone" without a
named someone is not waiting on anyone.>

| # | Decision | Who decides | Blocks what |
|---|----------|-------------|-------------|
| 1 | <question> | Mayo / EOR / Revit trip | <what stalls without it> |

## 8. Links
- Plan / spec: <path §section>
- Related updates: <FU-XXXX, …>
- Related failures: <FL-XXXX, …>
- Previous handoff: <HO-XXXX — or `first in this stream`>
- Successor: <HO-XXXX once consumed — or `—`>
- Memory: <memory slug>
