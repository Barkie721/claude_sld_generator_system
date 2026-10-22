# FU-0002 — put the repo under version control; there is currently no rollback point

> 🚫 **DECLINED BY MAYO, 2026-07-31. DO NOT RE-RAISE THIS.**
>
> It was offered explicitly, in the session immediately before separation **Phase 7b — the
> irreversible half, which deleted `13_addin/` from this repo** — and turned down. That makes it a
> **decision that was made with the risk in full view**, not a gap nobody noticed.
>
> **The agreed mitigation is in force and is working:** every phase since 2026-07-30 takes a
> pre/post snapshot pair, each verified `tar tzf | wc -l == find | wc -l` and `gzip -t` clean.
> `Download/` currently holds the 7b, review and Phase 8 pairs. **Those tarballs are the entire
> rollback for this repo — treat them as such.**
>
> The body below is left exactly as written in 2026-07-25 and its reasoning still stands on its
> own terms. **Read it as the case that was heard, not as pending work.**

> 📌 **Dated note, 2026-10-06 — the ruling above is kept as the record; the situation has moved on.**
> This folder has been under git since then: the former SLD repository's first commit was `46cc2ab`
> (2026-08-11), and on 2026-10-06 the folder was folded into the workspace repository
> `Barkie721/revit_electrical-dedarms_system` (commit `89e70e3`) without its history, which is kept
> only in `_Mayo_Claude_Workspace/_git-backups-2026-10-06/claude_sld_generator_system.git`. Git is now
> the rollback; the snapshot tarballs above are no longer the entire one. Nothing here re-raises the
> 2026-07-31 decision — it records that the repository's shape changed after it.

| Field | Value |
|-------|-------|
| **ID** | FU-0002 |
| **Title** | Put the repo under git — the snapshot tars were deleted and nothing replaced them |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P1` |
| **Effort** | `S` |
| **Readiness** | `ready` |
| **Category** | `process` |
| **Component** | repo root |
| **Stage** | `process` |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` — adds `.git/`, touches no tracked content |
| **Schema impact** | `none` |
| **Version bumps** | none |
| **Gates affected** | none |
| **Depends on** | — |
| **Blocks** | every `XL` entry that forces a golden re-freeze — those are the changes most in need of an undo |
| **Target** | `next batch` |

---

## 1. Problem

**Verified 2026-07-25: there is no `.git` in the repo root.**

The 2026-07-24 cleanup pass deleted five build directories and **both** `_cleanup_snapshots` tars
(repo 101M → 61M). Those tars were the only rollback point, and git was named as the intended
replacement but never set up. The repo has been operating since with **no undo of any kind**.

The exposure is specific, not theoretical. This system's characteristic change is a **golden
re-freeze**: a byte-locked trio procedure across the viewer, `gen_engine.mjs` and the golden viewer
copy, followed by re-blessing PNG and sha baselines. A re-freeze applied on a wrong premise currently
cannot be walked back — the previous bytes are gone the moment they are overwritten. The frozen-oracle
policy protects the golden from casual edits; it does nothing once an intentional edit turns out to
have been wrong.

## 2. Proposed change

`git init` at the repo root, author a `.gitignore`, and commit the current state as the V1 baseline.

## 3. Scope

**In:** repository initialization, `.gitignore`, one baseline commit, and a short "how we commit here"
note in the runbook.

**Out (non-goals):**
- **No remote, no push.** Local history only. Publishing this repo anywhere is a separate decision
  that is not being made here.
- No branching model, no hooks, no CI.
- No history reconstruction — the baseline commit is 2026-07-25 state, not an attempt to
  back-fill the batch log.

## 4. Acceptance criteria

- [ ] `git log` shows one baseline commit at the repo root.
- [ ] `git status` is clean immediately after that commit — nothing accidentally untracked.
- [ ] `.gitignore` excludes build output and scratch dirs but **not** the committed PNG/SVG snapshot
      baselines: those are gate inputs (G5, G6, G9) and losing them takes those gates dark.
- [ ] Repo size after `git gc` is recorded, and the binary-heavy folders are a conscious decision
      rather than an accident.
- [ ] `bash run_all_gates.sh` is green **before** the baseline commit — the snapshot must capture a
      known-good state.

## 5. Blast radius

Adds `.git/`; changes no tracked file. The one real consideration is **size**: the repo carries a lot
of committed PNG/SVG baselines and the DLL, so decide deliberately what is tracked before the first
commit rather than after.

Watch the FUSE-mtime behavior noted in the standing gotchas — Android storage moves mtimes in ways
that can make git see spurious changes. Verify a clean `git status` on a second run, not just the first.

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 12/12, sync 16/16.
**After:** re-run → identical results (git cannot affect them; a difference means something was moved
during setup). Then `git status` twice, several minutes apart, to confirm the working tree stays clean
under FUSE mtime drift.

## 7. Risks / open questions

- **Does the blessed DLL belong in git?** It is a build artifact, but it is also sha-pinned by the
  sync gate and its identity is load-bearing. Tracking it is probably right — flag for a decision.
- Line-ending and executable-bit normalization on this platform could touch many files at once. Check
  the first `git add` diff for unexpected whole-file changes before committing.

## 8. Alternatives considered

- **Re-create the tar snapshots** — rejected: that is what was just deleted, it has no diffing or
  history, and it is what made the repo 101M.
- **Do nothing until a remote is chosen** — rejected: local history delivers the entire benefit here
  (undo before a re-freeze) and needs no hosting decision. Coupling the two just defers both.

## 9. Links

- Related updates: —
- Related failures: —
- Memory / session: 2026-07-24 cleanup — both `_cleanup_snapshots` tars deleted, git named as the
  intended next step and not yet done
