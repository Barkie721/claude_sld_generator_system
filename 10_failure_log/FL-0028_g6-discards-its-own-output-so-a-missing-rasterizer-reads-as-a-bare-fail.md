# FL-0028 — G6 discards its own output, so a missing rasterizer reads as a bare FAIL

| Field | Value |
|-------|-------|
| **ID** | FL-0028 |
| **Title** | `run_all_gates.sh` G6 sends both `snapshot_html.mjs` runs to `/dev/null`, so "this box cannot render" and "the composed pages changed" print the same bare `FAIL` |
| **Opened** | 2026-10-13 |
| **Closed** | 2026-10-13 |
| **Status** | `fixed` — guarded by `mutants_gate_stderr.mjs` since 2026-10-13 (§5) |
| **Severity** | `S4`: the gate fails loudly and in the right direction; what's missing is the reason |
| **Stage** | `gate` |
| **Component** | `run_all_gates.sh` `g6()` (`:160–170`) |
| **Failure class** | `other`: diagnostic suppression |
| **Detected by** | manual review: the FU-0018 clean-checkout run, 2026-10-13 |

---

## 1. Symptom
A full `./run_all_gates.sh` on a fresh clone of `9db5ee6`, on the Windows PC, printed:

```
----- G6 composed-baselines -----
  FAIL  G6 composed-baselines
...
GATES: 12 passed, 1 failed.  FAILED: G6 composed-baselines
SUITE RED
```

That's all it printed: no file, no checksum line, no error. Running G6's three steps by hand showed
the cause:

```
[snapshot] ERROR: rsvg-convert not runnable: spawnSync rsvg-convert ENOENT (on the Windows PC use --raster resvg or SLD_RASTER=resvg; --no-png for SVGs only)
```

Run directly, the committed PNGs still match `04_renderer/baseline_composed_sha256.txt` **6/6 OK**. The
pages never changed; the gate simply could not render them.

## 2. Impact
No wrong output: G6 failed closed, which is correct. The cost is diagnosis. A reader sees a red
composed-page gate and can't tell an environment problem (no `rsvg-convert`) from a real regression
(composed pixels moved) without re-running the steps by hand. The first reading is the expensive
wrong one: someone chases an engine change that doesn't exist, or reaches for a re-bless.
`snapshot_html.mjs` already prints the exact remedy, and the gate throws it away.

## 3. Root cause
`g6()` runs both `snapshot_html.mjs` invocations with `>/dev/null 2>&1 || return 1` (`:164`, `:168`).
The redirect is presumably there to keep the snapshot chatter out of the suite log, but it drops stderr
along with stdout, and stderr is where the rasterizer error goes. Only the third step, `sha256sum -c`,
reaches the log, and a failing render returns before that step runs.

The same pattern was at `:113` (`node gen_engine.mjs >/dev/null 2>&1`) in the gen_engine idempotency
gate. It hadn't failed, but a crash there would have read the same way. It was brought into scope
and fixed later the same day (§4).

## 4. Resolution
**2026-10-13:** `run_all_gates.sh` `g6()` now redirects only stdout (`>/dev/null`) on both
`snapshot_html.mjs` runs, and a comment above the function cites this entry. That is enough because
`snapshot_html.mjs` writes to stderr in exactly two places, `die()` (`:48`) and the gate-failure
summary (`:363`), and both happen only on failure. A passing G6 prints nothing new.

Observed on the Windows PC, which has no `rsvg-convert`:

```
----- G6 composed-baselines -----
[snapshot] ERROR: rsvg-convert not runnable: spawnSync rsvg-convert ENOENT (on the Windows PC use --raster resvg or SLD_RASTER=resvg; --no-png for SVGs only)
  FAIL  G6 composed-baselines
```

The counts did not move: full **12 passed, 1 failed** (G6, as before), `--no-png` **9 passed, 0
failed**, so `EXPECTED_GATES` (FL-0017) is untouched. Both runs left the working tree clean apart from
the edit.

**Later on 2026-10-13, the gen_engine gate:** `gen_idempotent()` (`:114`) now redirects stdout only.
`gen_engine.mjs` has no stderr writes of its own, so only a crash reaches the log. Proved on a scratch
clone of `8014274` with `gen_engine.mjs` replaced by a single `throw`. Before the fix the suite printed
a bare `FAIL  gen_engine-idempotent`; after it, Node's `Error: FL-0028 probe: gen_engine broke` and its
stack print above the `FAIL`. On the live tree `--quick` is **6/6** and `--no-png` **9/9**, both
unchanged.

## 5. Regression guard  ← the point of this whole log
✅ **`08_validation/mutants_gate_stderr.mjs`, 6 arms, run by `08_validation/run_mutants.sh`**
(FU-0022, shipped 2026-10-13). It hides the rasterizer and breaks `gen_engine.mjs` in a lab, and
requires each gate's own error to reach the output. It was observed going red with each redirect
reverted: A1 for G6, B1 for gen_engine.

⚠️ Like every harness here it is **outside the 13-gate suite** (FU-0012). It fires when someone runs
`run_mutants.sh`, not on every gate run.

Not checked: a box that **has** rsvg. There, a passing G6 should print nothing extra, which follows
from the two failure-only stderr sites rather than from a run.

## 6. Detection gap (only if `Detected by: ESCAPED`)
Not escaped.

## 7. Links
- Related failures: **FL-0027** (no `rsvg-convert` on the Windows PC; fixed for `run_pipeline.sh` by
  `--raster resvg`. G6 deliberately pins `--raster rsvg` because its baselines are rsvg bytes, so that
  remedy doesn't apply here) · FL-0017 (the gate-count pin)
- Related updates: **FU-0018** (the run that found it) · **FU-0022** (the durable guard, proposed)
- Gates involved: G6, gen_engine-idempotent
- Session: 2026-10-13, FU-0018 clean-checkout run
