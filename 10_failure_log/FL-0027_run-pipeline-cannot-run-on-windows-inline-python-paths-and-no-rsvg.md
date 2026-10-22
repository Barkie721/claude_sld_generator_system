# FL-0027 — run_pipeline.sh cannot run on the Windows PC: inline-Python paths and no rsvg-convert

| Field | Value |
|-------|-------|
| **ID** | FL-0027 |
| **Title** | `run_pipeline.sh` dies at stage 4 on Windows (Git Bash paths spliced into `python3 -c` code strings), and stage 7 has no rasterizer there |
| **Opened** | 2026-10-04 |
| **Closed** | 2026-10-04 |
| **Status** | `fixed` |
| **Severity** | `S4`: loud, nothing wrong shipped; the pipeline simply could not run off the phone |
| **Stage** | `process`: the project pipeline (stages 4, 6, 7, 7b) |
| **Component** | `09_tests/_PROJECT_TEMPLATE/run_pipeline.sh` and its three copies; `04_renderer/snapshot_html.mjs` |
| **Failure class** | `other`: environment portability |
| **Detected by** | manual review (reading, 2026-10-04), then reproduced in Git Bash |

---

## 1. Symptom

Every one of the runs on disk before 2026-10-04 was made on the owner's Android phone. On the Windows PC under Git Bash:

1. **Stage 4 (merge), stage 6 (viewer) and the stage 7 sheet count** ran `python3 -c "...open('$TOPO')..."`. `$P` and `$REPO` are Git Bash paths (`/c/Users/...`). Reproduced 2026-10-04 with both the Microsoft Store `python3` alias (3.9.13) and a native Python 3.10:
   `FileNotFoundError: [Errno 2] No such file or directory: '/c/Users/.../2_build/svc3000_SLD_topology_V1_0_0.json'`
   Under `set -euo pipefail` that aborts the run at stage 4.
2. **Stage 7 / 7b**: `snapshot_html.mjs` spawned `rsvg-convert`, which is not installed on the PC, and it died with `rsvg-convert not runnable`.

## 2. Impact

There was no wrong output: both failures stop the run, and neither writes a partial result. But the pipeline could only run on the phone, which blocked the SLD tab design's "run it on this PC" question (Q-D5).

## 3. Root cause

1. **MSYS converts a POSIX path only when it is a standalone argv**, never when the path sits inside an argument. The Python snippets put the path *inside the code string*, so a native Windows Python received `/c/Users/...` literally. On the phone there is no conversion to need.
2. **The rasterizer was hard-wired**: `spawnSync('rsvg-convert', …)`, with no alternative.

## 4. Resolution

- **Python → Node.** New `4_checks/pipeline_steps.mjs` (subcommands `merge`, `viewer`, `sheets`) takes every path as its own argv, in the template and in the Sprouts, 3000A and Default 2500 copies (Sprouts edited in place; its stage 12c is kept). There are still no npm dependencies. **The output is byte-identical to the Python**: `pyDumps` copies `json.dump(indent=2, ensure_ascii=False)`, including Python's float repr (exponent form below 1e-4), and the viewer step folds `\r\n` the same way Python's text-mode read does. Measured as follows:
  - The merged `__WITH_GEOMETRY.json` is byte-identical to the phone-made file for Sprouts, 3000A and Default 2500.
  - The viewer HTML is byte-identical to real Python's output on the same reference viewer. The phone-made Sprouts and Default viewers are older, built at engine 1.0.15, and the reference is now 1.0.17.
  - A fuzz of more than 3,000 random floats plus exponent, unicode, control-character and integer-like-key cases came out byte-identical to CPython's `json.dump`.
- **Pluggable rasterizer** in `snapshot_html.mjs`: `--raster rsvg|resvg|none`, or `$SLD_RASTER`, with the flag taking precedence. The default stays `rsvg`, so the phone is unchanged; `--no-png` now means `none`.
  - `resvg` is a pinned `resvg.exe` **outside the repo**, at `%USERPROFILE%\tools\resvg\0.47.0\`. Its sha256 is checked against a constant in the script before the first capture; `$RESVG_PATH` can relocate the binary but does not unpin it.
  - `rsvg-convert --width W --keep-aspect-ratio -o out in` maps to `resvg -w W in out`.
  - Each capture records `raster: {engine, version}` in `manifest.json`.
  - **The chosen engine is verified up front**, and a missing, unknown or unpinned engine is exit 2. It never falls back to SVG-only.
- **Gates**: G6 now passes `--raster rsvg` explicitly, so an exported `SLD_RASTER=resvg` cannot leak into an rsvg-baselined gate. **No baseline was re-blessed.** On the PC the suite runs with `--no-png`.

## 5. Regression guard

- **The step failures stay loud by construction.** `pipeline_steps.mjs` exits non-zero on any read or parse error and on a moved TOPO block (the same two asserts as before), and the pipeline runs under `set -euo pipefail`. The rasterizer half is guarded inside `snapshot_html.mjs`: the up-front engine check, the sha pin, and an exists-check on every PNG it writes (any stale PNG is removed first).
- ⚠️ **Byte parity with the Python has no persisted guard.** It was measured once, as above. A suite test would need Python on the box, which is exactly what this change removes. If `pipeline_steps.mjs` is edited, re-measure: run `merge` on a project's `2_build/` inputs and `cmp` the result against its tracked `__WITH_GEOMETRY.json`.

## 6. Detection gap

Not escaped: it was found by reading before anyone ran the pipeline on the PC. No gate here runs a project pipeline at all (CLAUDE.md §9, "Do NOT run run_all_gates.sh for a project"), and all of them had only ever run on the phone.

## 7. Links

- Related failures: FL-0026 (the 3000A project is its guard, and it is one of the copies edited here)
- Gates involved: G5/G6 (rsvg-only, unchanged; use `--no-png` on the PC)
- Trial: a throwaway copy of `Sprouts Office Building - 2000A` was run end to end on the PC with `SLD_RASTER=resvg`, exit 0, 63 rules / 0 errors. Topology, layout config, geometry, merged file and all 3 SVGs were byte-identical to the phone's; the PNGs were visually equal, with glyphs differing only because Windows has the real Courier New. The copy was deleted after the run.
- Not covered: `02_specs/visual_reference/snapshot_catalog.mjs` still spawns `rsvg-convert` directly. It is outside the project pipeline, and G9 does not re-render.
