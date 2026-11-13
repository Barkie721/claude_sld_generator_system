#!/bin/bash
# Full regeneration for this project. Phone storage is mounted noexec — run as:
#
#   bash run_pipeline.sh
#
# Stages: build -> validate (Phase 1+2) -> OPEN_ITEMS -> layout -> MERGE
#         -> validate (Phase 3) -> viewer -> snapshots+audit -> composed pages
#         -> 7 ungated geometry checks -> RESULTS.json
#
# Stages 8-13 are REPORTING, not gating: they print and exit 0. `set -e` is on,
# so a non-zero exit would abort the run and hide every later stage. Read the
# counts; do not rely on the exit status.
#
# The merge step is not optional. `run_layout.mjs --out` writes the BARE
# geometry block, NOT a merged topology — despite the __WITH_GEOMETRY name that
# Phase 3 expects. Without the merge, the second validate silently re-runs
# Phase 1+2 and every SH geometry rule stays skipped (55 rules, not 63).
#
# Do NOT run ../../run_all_gates.sh for this project — that suite is engine
# regression against the hospital golden. This project touches no engine code,
# so it cannot move those gates. THIS PIPELINE IS THE CHECK.
#
# ---------------------------------------------------------------------------
# COPYING THIS TEMPLATE
#   cp -r "09_tests/_PROJECT_TEMPLATE" "09_tests/<New Project>"
# Then edit ONE thing: put your narrative and build script in 1_source/. Nothing
# in 4_checks/ names the project — the filename prefix is the topology's
# metadata.slug, discovered at load time — and every path below derives from the
# build script's own filename. There is no slug to hand-set here.
# ---------------------------------------------------------------------------
set -euo pipefail

P="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$P/../.." && pwd)"

# run_layout.mjs:49 and the 4_checks/pipeline_steps.mjs writes below do NOT mkdir. Create the tree
# before anything writes into it, on every run — empty directories do not
# survive every copy tool.
mkdir -p "$P"/{1_source,2_build,3_output/{sheets,pages,zoom},4_checks,5_docs,6_revit,7_revisions}

# The only hand-edited input. Everything under 2_build/ and 3_output/ is
# regenerable and safe to delete.
# Globbed, not `ls`-piped: with `set -o pipefail` a no-match `ls` aborts the
# script before the diagnostic below can print.
shopt -s nullglob
BUILD_SCRIPTS=("$P"/1_source/*_build_topology.mjs)
shopt -u nullglob
if [ ${#BUILD_SCRIPTS[@]} -eq 0 ]; then
  echo "!! no 1_source/*_build_topology.mjs — this project has no source yet." >&2
  echo "!! Copy a narrative into 1_source/ and write its build script beside it." >&2
  exit 1
fi
if [ ${#BUILD_SCRIPTS[@]} -gt 1 ]; then
  echo "!! ${#BUILD_SCRIPTS[@]} build scripts in 1_source/ — one project per folder." >&2
  printf '!!   %s\n' "${BUILD_SCRIPTS[@]}" >&2
  exit 1
fi
BUILD_SCRIPT="${BUILD_SCRIPTS[0]}"
SLUG="$(basename "$BUILD_SCRIPT" _build_topology.mjs)"

TOPO="$P/2_build/${SLUG}_SLD_topology_V1_0_0.json"
GEOM="$P/2_build/${SLUG}_geom_block.json"
MERGED="$P/2_build/${SLUG}_SLD_topology_V1_0_0__WITH_GEOMETRY.json"
CFG="$P/2_build/${SLUG}_layout_config.json"
VIEWER="$P/2_build/${SLUG}_sld_viewer_V1_0_0.html"

# Every stage tees its UNFILTERED output here; the screen gets the filtered
# view. Stage 14 parses this file. Filtering before the tee is how a checker's
# final RESULT line gets silently truncated by a `sed`/`tail` meant only for
# readability — stage 11's filter in particular stops well before it.
LOG="$P/2_build/run.log"
: > "$LOG"

echo "== 1. build topology =="
node "$BUILD_SCRIPT" 2>&1 | tee -a "$LOG"

echo; echo "== 2. validate Phase 1+2 =="
node "$REPO/08_validation/validate_topology_V1_0_0.mjs" --layout-config "$CFG" "$TOPO" 2>&1 | tee -a "$LOG" | tail -3

echo; echo "== 2b. open items (Tier-3 halts the EOR still owes) =="
# The validator exits CLEAN on a halted topology. This is the only thing that
# surfaces what is actually blocking delivery.
node "$P/4_checks/make_open_items.mjs" 2>&1 | tee -a "$LOG"

echo; echo "== 3. layout =="
# run_layout prints its counts on STDERR (source L55-58) — 2>&1 or they never
# reach RESULTS.json.
node "$REPO/04_renderer/run_layout.mjs" --topo "$TOPO" --config "$CFG" --out "$GEOM" 2>&1 | tee -a "$LOG"

echo; echo "== 4. merge geometry into topology =="
# Node, paths as argv: an inline `python3 -c` with the paths spliced into the code
# string died on Windows (Git Bash converts a /c/... path only as a standalone
# argv). Output is byte-identical to the old json.dump(indent=2, ensure_ascii=False).
node "$P/4_checks/pipeline_steps.mjs" merge "$TOPO" "$GEOM" "$MERGED" 2>&1 | tee -a "$LOG"

echo; echo "== 5. validate Phase 3 (SH geometry rules) =="
# Expect 63 rules. A count of 55 means CV-14 / the SH rules capability-skipped —
# check that layout_config is EMBEDDED in the topology, not sidecar-only. The
# build script writes it twice on purpose (sidecar AND embedded); keep both.
node "$REPO/08_validation/validate_topology_V1_0_0.mjs" "$MERGED" 2>&1 | tee -a "$LOG" | tail -3

echo; echo "== 6. rebuild project viewer =="
# ⚠️ The line numbers in pipeline_steps.mjs bound the TOPO literal inside the reference viewer.
# That is a repo-relative dependency — unaffected by this folder layout, but it
# breaks the day 04_renderer/sld_viewer_engine_V1_0_0.html moves that block. The
# asserts turn that into a loud failure instead of a corrupt viewer.
node "$P/4_checks/pipeline_steps.mjs" viewer "$REPO" "$TOPO" "$VIEWER" 2>&1 | tee -a "$LOG"

echo; echo "== 7. snapshots + audit =="
# ⚠️ --out IS MANDATORY. snapshot_html.mjs:215 defaults it to a SIBLING OF THE
# HTML, which is now 2_build/ — so an omitted --out writes 2_build/snapshots/,
# the checkers find nothing, and every one of them reports 0 findings across 0
# sheets. On screen that is indistinguishable from a clean run.
# PNG engine: snapshot_html.mjs reads SLD_RASTER (rsvg | resvg | none; default
# rsvg). On the Windows PC run `SLD_RASTER=resvg bash run_pipeline.sh`. A missing
# engine stops the run; it never falls back to SVG-only.
node "$REPO/04_renderer/snapshot_html.mjs" --html "$VIEWER" --theme both --audit --out "$P/3_output/sheets" 2>&1 | tee -a "$LOG" | tail -8

# The guard for exactly that failure. Two themes per sheet; the sheet count
# comes from the topology, never a literal.
SHEET_N=$(node "$P/4_checks/pipeline_steps.mjs" sheets "$TOPO")
shopt -s nullglob
SVGS=("$P"/3_output/sheets/*.svg)
shopt -u nullglob
SVG_N=${#SVGS[@]}
echo "  assert: ${SVG_N} SVGs in 3_output/sheets/ for ${SHEET_N} sheets x 2 themes"
if [ "$SVG_N" -lt "$((SHEET_N * 2))" ]; then
  echo "  !! EXPECTED $((SHEET_N * 2)) SVGs, FOUND ${SVG_N}." >&2
  echo "  !! Every geometry checker below would report 0 findings across 0 sheets — a FALSE CLEAN." >&2
  echo "  !! Check that --out pointed at 3_output/sheets and not at 2_build/snapshots." >&2
  exit 1
fi

echo; echo "== 7b. composed Arch E1 pages =="
# --page only changes the filename suffix (__page) and still writes to --out;
# there is no separate snapshots_page/ code path in snapshot_html.mjs.
node "$REPO/04_renderer/snapshot_html.mjs" --html "$VIEWER" --theme light --page --out "$P/3_output/pages" 2>&1 | tee -a "$LOG" | tail -5

echo; echo "== 8. collinear overlap check (ungated: --audit is feeder-vs-device only) =="
node "$P/4_checks/check_feeder_overlaps.mjs" 2>&1 | tee -a "$LOG" | tail -25

echo; echo "== 9. feeder-on-feeder crossing check (ungated: nothing else tests this) =="
# --audit's feeder_crossing is feeder x DEVICE; check_feeder_overlaps is COLLINEAR
# only. Neither sees two feeders crossing at a right angle, which is exactly what
# the riser corridors are tuned to avoid. Both counts must read 0.
node "$P/4_checks/trace_feeders.mjs" 2>&1 | tee -a "$LOG" | sed -n '/FEEDER x FEEDER/,$p'

echo; echo "== 10. feeder-through-own-symbol + tag-on-symbol + feeder-through-text (ungated) =="
# trace_feeders skips a feeder's own source/destination and --audit excludes
# endpoint devices, so a jog row landing INSIDE its own parent panel is invisible
# to both. This catches that, plus tag pills overlapping device boxes, plus
# feeders cutting an A-8 equipment label (section C) — the label block is not
# part of the device box, which is how two real --audit findings got written off
# as false positives. Printed in full: `tail` here would hide sections A and B.
node "$P/4_checks/check_symbol_clash.mjs" 2>&1 | tee -a "$LOG"

echo; echo "== 11. tag-on-feeder-line clash (ungated) =="
# --audit's label_overlap is label x label; a pill sitting on a feeder run scores
# zero. Watch the HARD count, and keep the riser row pitch wide enough that the
# fan pills do not go TIGHT against the next row up.
# ⚠️ The filter below stops at the first blank line — well before the two
# ADVISORY sections and the RESULT line. Both still reach $LOG, which is what
# stage 14 reads. The headline's separator is an em dash (U+2014).
node "$P/4_checks/check_tag_feeder_clash.mjs" 2>&1 | tee -a "$LOG" | sed -n '/TAG x FEEDER/,/^$/p'

echo; echo "== 12. level-band membership (ungated) =="
# --audit excludes level lines from feeder_crossing outright and SH-3 excludes
# A-7 boxes, so a level line drawn straight through a panel — or a whole sheet
# of devices sitting in the wrong band — passes 63 rules / 0 errors. This is the
# only net under escapeCollision, which gives up after 4 passes with no signal.
# Section 3's per-level medians are the lookup table for the s2_shift_delta /
# D' solve: do not guess those numbers, read them here.
# `|| true`: a no-match grep exits 1, and under `set -e` + pipefail that would
# abort the run and hide stages 12b-14.
node "$P/4_checks/check_level_bands.mjs" 2>&1 | tee -a "$LOG" | grep -E '^(=|S[0-9A-Z]+ —|  [0-9]\.|       level |TOTAL|       datum|  acceptance)' || true

echo; echo "== 12b. A-1 tick detached from its own feeder (ungated) =="
# check_tag_feeder_clash EXCLUDES a tag's own tick and leader ("the tick is drawn
# on the line on purpose") — true only while the tag has not been moved ACROSS
# its run. A plain `dx` in a1_tag_placement does exactly that: renderR1Tags
# applies it to (fx,fy) BEFORE renderTag, so the tick travels with the pill and
# lands in whitespace. This stage is the regression guard for FL-0008. Use
# pill_dx/pill_dy (OFF-023) to move a tag across its run; dx/dy are correct only
# ALONG it.
node "$P/4_checks/check_tick_detach.mjs" 2>&1 | tee -a "$LOG"

echo; echo "== 13. composed page scale (ungated) =="
# The pipeline's "Legibility 1.00" is s_pred, which is CLAMPED at 1. This is the
# scale the page really composes at, and the only text-size number to quote.
# Watch the bind column: sheet-height planning arithmetic only holds while every
# sheet is height-bound.
node "$P/4_checks/check_page_scale.mjs" 2>&1 | tee -a "$LOG"

echo; echo "== 14. RESULTS.json =="
node "$P/4_checks/make_results.mjs" "$LOG" 2>&1 | tee -a "$LOG"

echo
echo "run complete.  numbers: 3_output/RESULTS.json  ·  EOR debt: OPEN_ITEMS.md"
echo "               full unfiltered stage output: 2_build/run.log"
