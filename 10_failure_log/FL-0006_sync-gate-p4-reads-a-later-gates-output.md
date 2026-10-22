# FL-0006 — sync_gate P4 asserts against an artifact a LATER gate regenerates, so the suite goes red on run 1 and green on run 2 with no edit in between

> ⚠️ **EVIDENCE ARCHIVED 2026-07-28.** This entry cites paths under `09_tests/` that no longer
> exist: `5-Story Hospital - 2500 kVA/HANDOFF_review_pass_1.md` (cited at §10 "Still open") was deleted on 2026-07-28 at Mayo's instruction.
> The finding itself is unaffected — the P4 ordering bug is in `08_validation/sync_gate.mjs`, which is live and unchanged. The citation
> was corroborating detail, not the finding.
> To re-read the evidence, restore from the pre-delete repo tarball (the only copy; there is no
> git): `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`.
> Context and what the delete cost: `09_tests/README.md`.

| Field | Value |
|-------|-------|
| **ID** | FL-0006 |
| **Title** | `sync_gate` P4 compares the manifest engine rev against `04_renderer/snapshots_page/audit.json`, which G6 rewrites later in the same suite run |
| **Opened** | 2026-07-26 |
| **Closed** | — |
| **Status** | `open` |
| **Severity** | `S3` |
| **Stage** | `gate` |
| **Component** | `08_validation/sync_gate.mjs` (phase 4) × `run_all_gates.sh` gate ordering |
| **Failure class** | `other` — gate ordering / self-referential assertion |
| **Detected by** | `GATE` — the suite reported itself red, twice, during review pass 4 |

---

## 1. Symptom

After bumping the engine rev (1.0.5 → 1.0.6, and again → 1.0.7) and updating every living-doc
anchor, `run_all_gates.sh` reported:

```
  FAIL  [P4] snapshots_page/audit.json viewer_revision == manifest engine rev — audit 1.0.6 != manifest 1.0.7
  FAIL  sync-gate
GATES: 11 passed, 1 failed.  FAILED: sync-gate
SUITE RED
```

Re-running the identical suite immediately afterwards, **with no file edited in between**:

```
  PASS  sync-gate
GATES: 12 passed, 0 failed.
```

Running `sync_gate.mjs` standalone straight after the red suite also passes — 16/16, `SYNC-GATE
GREEN`.

## 2. Cause

`sync_gate.mjs` phase 4 asserts provenance by reading a **gate output**, not a source artifact:

- P4 reads `04_renderer/snapshots_page/audit.json` and compares its `viewer_revision` to
  `manifest.engine.rev`.
- `viewer_revision` is scraped from the viewer's `<meta name="revision">` at render time
  (`snapshot_html.mjs:232`), so the file is only as current as the last render.
- `run_all_gates.sh` runs **sync-gate at line 86** but **G6 composed-baselines later**, and G6 is
  what re-renders `snapshots_page/` — including `audit.json`.

So on the first run after any rev bump, P4 reads the *previous* run's audit and fails; G6 then
refreshes it, and the next run passes. The assertion is real and worth keeping — it just consumes
an artifact produced downstream of itself, which makes the gate a function of run history rather
than of repo state.

This is a false RED, not a false green — it cannot hide drift, it can only invent it. That is why
the severity is S3 and not S2. The cost is that a genuinely broken suite and a merely stale one
look identical on run 1, which trains the reflex "just run it again" — and *that* is the real
hazard.

## 3. Reproduction

```bash
cd "$REPO"
# 1. bump the rev anywhere (viewer meta + manifest + README_engine + CLAUDE.md, all consistent)
bash run_all_gates.sh     # -> SUITE RED, FAILED: sync-gate, P4 audit <old> != manifest <new>
bash run_all_gates.sh     # -> 12/12, no edit in between
```

## 4. Fix options (not yet applied — needs a call on which)

1. **Re-order** — move `run "sync-gate"` after G6 in `run_all_gates.sh`. One line, but it weakens
   sync-gate's role as an *early* drift detector: the point of running it near the front is to fail
   fast before spending minutes on PNG renders.
2. **Re-target P4** (preferred) — read the revision from the viewer's own
   `<meta name="revision">`, the same place `snapshot_html.mjs` scrapes it from. That makes the
   assertion a pure repo-state check, keeps it early, and keeps the manifest ↔ viewer proof
   intact. P5 already does exactly this for the viewer, so P4 would become the
   "renders carry the right revision" check only if it stays on the audit file.
3. **Both** — re-target P4 to the viewer meta, and add a separate late-running staleness check on
   `snapshots_page/audit.json` that is allowed to be advisory.

## 5. Guard

None yet. Whichever fix lands, the regression test is the reproduction above: bump the rev and
confirm run 1 is green.

## 6. Cross-references

- Surfaced during review pass 4 —
  `09_tests/5-Story Hospital - 2500 kVA/HANDOFF_review_pass_1.md` §10 "Still open".
- Related: [FL-0001](FL-0001_sync-gate-dll-embed-false-green.md) — the other sync_gate defect, and
  the mirror image of this one (false *green* rather than false red).
