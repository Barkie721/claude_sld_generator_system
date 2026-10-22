#!/usr/bin/env bash
# run_all_gates.sh — one entry point for the full SLD golden gate suite (G1-G9 +
# acceptance + conformance + gen_engine idempotency). Created 2026-07-23 (cleanup
# step 1, safety net) so a cleanup step cannot silently skip a gate.
#
# It ONLY wraps the recipe already documented in 04_renderer/README_engine.md
# ("Regression suite (golden case)") and CLAUDE.md — it invents no new checks.
# Every command runs against the LIVE engine/viewer so drift is caught.
#
# Usage:
#   ./run_all_gates.sh              # run everything (13 gates), summarize pass/fail
#   ./run_all_gates.sh --quick      # G1 + G8 + conformance + gen_engine + sync-gate + check-name baseline (fast, no PNG render)
#   ./run_all_gates.sh --no-png     # skip G5/G6/G7/G9 if the rsvg renderer is unavailable
#
# Exit 0 iff every selected gate passes. Non-zero and a FAIL line otherwise.
#
# 🚩 GATE 13 (T0, the C# build gate) WAS DELETED 2026-07-31 BY SEPARATION PHASE 7b, AND SO
# WAS `--no-build`. It compiled `13_addin/`, which has left this repo for
# GitHub `Barkie721/revit_dedarms_toolkit_system` (not cloned on this machine); `08_validation/build_gate.sh` was deleted
# with it, and its port lives there as `08_validation/toolkit_build_gate.sh`. THIS SUITE NOW
# COMPILES NOTHING AGAIN, deliberately and correctly — there is no longer a `.cs` file in
# this repo for it to compile. ⚠️ THE CONSEQUENCE IS WORTH SAYING OUT LOUD: a green run here
# is silent about the Revit add-in in exactly the way the pre-FU-0011 "12/12 green" was, and
# the difference is that the add-in now has its OWN suite which must be run in its OWN repo
# (`bash 08_validation/run_toolkit_gates.sh`). Two repos, two suites, and NEITHER of them
# reports on the other. `--no-build` was removed rather than kept as a no-op: a flag that
# silently does nothing is the shape this repo keeps logging.
#
# GATE 14 (the sync-gate check-NAME baseline) WAS ADDED 2026-07-30 by decision D7. It is
# Node-only, so it runs in --quick too.
#
# Full mode reports 13/13; --quick 6/6.
# Gate numbers are ARRIVAL IDs, not execution indices — a new gate goes on the end rather
# than renumbering, and gate 14 KEEPS ITS NUMBER now that 13 is gone: renumbering it to 13
# would silently repoint every document that cites "gate 14" at a gate that never existed.
#
# NOTE: this is the step-1 skeleton. G5/G6 shell out to snapshot_html.mjs which
# needs the rsvg PNG toolchain; on a box without it, use --no-png and rely on the
# structural gates. PNG gates remain the ONLY net for text-only changes (see
# README_engine, "Flag, never mitigate" + the text-rendering caveats) — never
# claim a text change is safe on --no-png.
#
# ⚠️ --no-png ALSO SKIPS G7 (titleblock-derivation), which needs no rsvg at all —
# it just happens to sit inside the same guard block. Documented here rather than
# moved, because moving it changes which gates a --no-png run reports; if you do
# move it, update this note, the skip echo below, and the runbook §4 table.

#
# ── THE MUTANT HARNESS IS NOT IN THIS SUITE, AND THAT IS A DECISION (FU-0012, 2026-08-01) ──
# This repo has TWO mutant harnesses. `08_validation/mutants_drop_staleness.mjs` (12 arms)
# covers the `[P1] published_drop shas == the LIVE upstream files` check, and
# `08_validation/mutants_gate_stderr.mjs` (6 arms, FL-0028) proves that G6's and the
# gen_engine gate's own errors reach this suite's output. Neither runs here. They have their
# own runner:
#
#     bash 08_validation/run_mutants.sh          # builds a lab, runs it, cleans up
#
# ⚠️ SO A GREEN 13/13 SAYS NOTHING ABOUT WHETHER THESE CHECKS CAN STILL GO RED. That is the
# whole reason a mutant harness exists, and it is said here rather than only in a handoff
# because a gap named in a handoff is a gap nobody sees at the terminal.
#
# The three options were suite-invoked / separate runner / manual-only. Separate runner won:
# the harness invokes the whole gate once per arm and needs a writable lab off `noexec`
# storage, so wiring it in would put a SOFT-SKIP path — the exact failure mode it hunts
# (FL-0009) — inside the suite, and would move EXPECTED_GATES and the gate-14 check-NAME
# baseline for a change that adds no new assertion about the product. Manual-only lost
# because "run it when you remember" is a written warning used as a control, and this repo's
# record on that is bad. Full reasoning: `run_mutants.sh`'s header and FU-0012.
#
# ⚠️ THE TOOLKIT REPO HAS ITS OWN `run_mutants.sh` AND ITS OWN FOUR HARNESSES. Same decision,
# recorded there too — neither repo can see the other. Never run the two at once (FL-0012).

set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOLD="$REPO/09_tests/Hospital Example (Golden Case)"
VIEWER="$REPO/04_renderer/sld_viewer_engine_V1_0_0.html"
ORACLE="$GOLD/hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json"

QUICK=0; NOPNG=0
for a in "$@"; do
  case "$a" in
    --quick) QUICK=1 ;;
    --no-png) NOPNG=1 ;;
    *) echo "unknown flag: $a"; exit 2 ;;
  esac
done

PASS=0; FAIL=0; FAILED_GATES=""
run() { # run <name> <cmd...>
  local name="$1"; shift
  echo "----- $name -----"
  if "$@"; then echo "  PASS  $name"; PASS=$((PASS+1))
  else echo "  FAIL  $name"; FAIL=$((FAIL+1)); FAILED_GATES="$FAILED_GATES $name"; fi
}

# --- G1: geometry gate vs golden WITH_GEOMETRY (0.0000 px) ---
g1() { ( cd "$REPO/04_renderer" && node run_layout.mjs --gate "$ORACLE" ); }
run "G1 geometry-gate" g1

# --- G8: additive-export proof (hospital golden, structure only) ---
g8() { ( cd "$REPO/04_renderer" && node strip_compare.mjs ); }
run "G8 strip-compare" g8

# --- Conformance walk (hospital golden topology) ---
conformance() { ( cd "$REPO/03_contracts" && node conformance_walk_V1_0_0.mjs \
    "$GOLD/hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json" ); }
run "conformance-walk" conformance

# --- gen_engine idempotency: regenerate(viewer) must byte-equal committed sld_engine.mjs ---
gen_idempotent() {
  ( cd "$REPO/04_renderer"
    local before after bak
    bak="$(mktemp)"; cp sld_engine.mjs "$bak"
    before="$(sha256sum sld_engine.mjs | cut -d' ' -f1)"
    # stdout only: gen_engine.mjs writes no stderr of its own, so a crash's trace shows (FL-0028)
    node gen_engine.mjs >/dev/null || { cp "$bak" sld_engine.mjs; rm -f "$bak"; return 1; }
    after="$(sha256sum sld_engine.mjs | cut -d' ' -f1)"
    if [ "$before" != "$after" ]; then
      echo "  sld_engine.mjs changed: $before -> $after (RESTORED from backup)"
      cp "$bak" sld_engine.mjs; rm -f "$bak"; return 1
    fi
    rm -f "$bak"
  )
}
run "gen_engine-idempotent" gen_idempotent

# --- Sync gate (P1): cross-surface consistency — map×2, viewer/golden, engine==regen,
#     DLL embed, hospital 3-surface, provenance + living-doc anchors vs the manifest.
#     --quick mirrors the suite's quick mode (skips the phase-6 PNG-baseline sha compare,
#     which G5/G6 already cover in full mode). ---
SYNC_FLAG=""; [ "$QUICK" -eq 1 ] && SYNC_FLAG="--quick"
sync_gate() { ( cd "$REPO" && node 08_validation/sync_gate.mjs $SYNC_FLAG ); }
run "sync-gate" sync_gate

if [ "$QUICK" -eq 0 ]; then
  # --- Parity (element counts vs oracle) ---
  parity() { ( cd "$GOLD/tests_V1_0_0" && node parity_test.mjs "$VIEWER" "$ORACLE" ); }
  run "parity" parity

  # --- Behavior (52 checks against the live viewer) ---
  # 43 until 2026-08-01; FU-0008 added 9 — the transform algebra behind the
  # extent scan, the FL-0007 pennant regression test, and the per-sheet
  # "viewBox minus the pad == true ink" assertion that FL-0007 §6 says no gate
  # had. That last one is THE regression guard for this defect. It needs no
  # rsvg, so unlike G5/G6 it survives a --no-png run — but it sits in the
  # full-mode block with the rest of `behavior`, so --quick still cannot see it.
  behavior() { ( cd "$GOLD/tests_V1_0_0" && node behavior_test.mjs "$VIEWER" ); }
  run "behavior" behavior

  # --- Acceptance gate (self-verifying, 2 hospital cases) ---
  acceptance() { node "$REPO/08_validation/check_acceptance_V1_0_0.mjs"; }
  run "acceptance" acceptance

  if [ "$NOPNG" -eq 0 ]; then
    # --- G5: golden PNG baselines (4/4) ---
    g5() { ( cd "$GOLD" && sha256sum -c tests_V1_0_0/baseline_sha256.txt ); }
    run "G5 png-baselines" g5

    # --- G6: composed page + title-block PNG baselines (6/6) ---
    # `--raster rsvg` is explicit so an exported SLD_RASTER=resvg (the Windows PC's
    # pipeline setting) cannot leak in: the baselines are rsvg bytes, resvg can never
    # match them, and they are NEVER re-blessed from a resvg run. No rsvg -> --no-png.
    # stdout only goes to /dev/null: snapshot_html.mjs writes to stderr only on failure,
    # so a box that cannot render says why under the FAIL line (FL-0028).
    g6() {
      ( cd "$REPO"
        node 04_renderer/snapshot_html.mjs --raster rsvg \
          --html 01_inputs/templates/titleblock_template_30x42_V1_0_0.html \
          --theme both --out 04_renderer/snapshots_titleblock >/dev/null || return 1
        node 04_renderer/snapshot_html.mjs --raster rsvg \
          --html 04_renderer/sld_viewer_engine_V1_0_0.html \
          --page --page-meta 01_inputs/hospital_titleblock_data_V1_0_0.json \
          --theme both --audit --out 04_renderer/snapshots_page >/dev/null || return 1
        cd 04_renderer && sha256sum -c baseline_composed_sha256.txt )
    }
    run "G6 composed-baselines" g6

    # --- G7: title-block derivation ---
    g7() { node "$REPO/04_renderer/check_titleblock_derivation.mjs"; }
    run "G7 titleblock-derivation" g7

    # --- G9: symbol-catalog snapshot baselines (108/108) ---
    # The catalog is the VISUAL MASTER for symbol appearance, and was the last
    # ungated artifact surface in the repo (added 2026-07-24, review TIER 7).
    # Compares the committed PNG+SVG snapshots against their frozen shas; it does
    # NOT re-render (the catalog re-freeze is a deliberate, separate act, exactly
    # like re-blessing G5/G6). audit.json / manifest.json are EXCLUDED on purpose:
    # both carry a `generated` timestamp that moves on every re-freeze.
    # Re-bless after an intended catalog change with:
    #   cd 02_specs/visual_reference && node snapshot_catalog.mjs \
    #     --html sld_catalog_V1_0_0.html --all --theme both --audit
    #   ( cd snapshots && ls *.png *.svg | sort | while read f; do sha256sum "$f"; done ) \
    #     > baseline_catalog_sha256.txt
    g9() { ( cd "$REPO/02_specs/visual_reference/snapshots" \
             && sha256sum -c ../baseline_catalog_sha256.txt ); }
    run "G9 catalog-baselines" g9
  else
    echo "----- G5/G6/G7/G9 SKIPPED (--no-png) — PNG gates are the ONLY net for text changes -----"
  fi

  # --- Gate 13: DELETED 2026-07-31 by separation Phase 7b. ---
  # It ran `08_validation/build_gate.sh`, which built the three add-in projects and asserted
  # the 112-test count against `artifacts.addin_tests`. Every one of those subjects left this
  # repo in the same change-set, together with the gate script and the `addin_tests` manifest
  # slot. Nothing was weakened and nothing was re-blessed to make this pass: the gate has no
  # subject here any more, and a gate whose subject is gone must be DELETED rather than left
  # to pass over an absent tree. Its port runs in the toolkit as `toolkit_build_gate.sh`.
  # ⚠️ IF YOU ARE LOOKING FOR IT BECAUSE A DOC SAYS "run gate 13": that doc predates
  # 2026-07-31. The C# build now happens in the DEDARMS Revit Toolkit repo, and this suite
  # cannot tell you anything about it.
fi

# --- GATE 14: sync-gate check-NAME baseline (D7, decision record 2026-07-30). ---
#
# THE RUNNER OWNS THIS, NOT sync_gate. §5 Q1's failure mode: a top-level import sync_gate
# cannot resolve makes it die on a raw ESM stack with ZERO check lines and NO `SYNC-GATE:`
# authority line, which reads in a log as a crash rather than a red gate. Measured 2026-07-30
# by deleting the lib it then imported (lib/dll_embed_V1_0_0.mjs): 0 check lines. A self-check
# living inside sync_gate dies with everything else and cannot see the one case the guard
# exists for, so the guard has to sit outside it. ⚠️ THAT PARTICULAR IMPORT IS GONE — Phase 7b
# deleted the two checks that used it and the lib with them — but the SHAPE is unchanged and
# still applies to the four imports sync_gate has left. The example is history; the reason is
# not.
#
# It runs sync_gate ITSELF, in BOTH modes, on every invocation — including `--quick`. The
# question is "is the set of checks still the set we blessed", and answering it for only the
# mode you happen to be running would miss a check that vanished from the other one. It is
# Node-only and ~1.2 s, so it costs `--quick` nothing worth having.
#
# NUMBERED 14 AND PLACED LAST DELIBERATELY, AND IT KEEPS THAT NUMBER. When it arrived,
# `build_gate.sh` was "gate 13" in ~30 places including the manifest, four living docs and
# several consumed handoffs, so a new gate went on the END rather than renumbering an
# identifier other documents cite — "check N is an ARRIVAL ID, not an execution index".
# ⚠️ GATE 13 IS NOW GONE (Phase 7b) AND THIS IS STILL GATE 14. Sliding it down to 13 to
# close the hole would repoint every "gate 14" citation at a gate that never existed, which
# is the identical failure the arrival-ID rule was written to prevent. It sits OUTSIDE the
# `--quick` guard above for the reason in the previous paragraph.
checkname_diff() { bash "$REPO/08_validation/checkname_diff.sh"; }
run "sync-gate check-name baseline" checkname_diff

# ---------------------------------------------------------------------------
# EXPECTED_GATES — the runner's own arithmetic pin. ADDED 2026-07-30 (FL-0017).
#
# WHY: the checks below this layer each had an arithmetic pin of their own (sync_gate has
# the gate-14 check-NAME baseline; the since-deleted build_gate.sh had EXPECTED_CHECKS), but
# THIS file — the layer whose "N/N" every document quotes — had none.
# Measured by the Phase 5 verification: deleting a whole `run ...` line made the suite print
#     GATES: 5 passed, 0 failed.   ALL SELECTED GATES GREEN
# A DELETED GATE READ AS A SMALLER GREEN. That is FL-0011's class ("status counts cannot
# see what a stage never attempted") at the outermost layer, where it is least visible.
#
# The count is DERIVED from the flags rather than hardcoded once, because the modes
# legitimately differ: full 13 · --quick 6 · --no-png drops G5/G6/G7/G9.
# ⚠️ ADDING A GATE MEANS UPDATING THIS ARITHMETIC. That is the point — a gate should not be
# able to arrive, or vanish, without someone touching this line.
EXPECTED_GATES=13
if [ "$QUICK" -eq 1 ]; then
  EXPECTED_GATES=6
else
  [ "$NOPNG"   -eq 1 ] && EXPECTED_GATES=$((EXPECTED_GATES-4))   # G5, G6, G7, G9
fi
ATTEMPTED=$((PASS+FAIL))

echo "======================================================"
echo "GATES: $PASS passed, $FAIL failed.${FAILED_GATES:+  FAILED:$FAILED_GATES}"
if [ "$ATTEMPTED" -ne "$EXPECTED_GATES" ]; then
  echo "⚠️  GATE-COUNT MISMATCH: $ATTEMPTED gate(s) ran, $EXPECTED_GATES expected for this mode."
  echo "    A gate was ADDED, REMOVED, or SKIPPED WITHOUT A FLAG. Do NOT read the pass count as"
  echo "    coverage until this is explained — a deleted gate otherwise reads as a smaller green."
  echo "SUITE RED"
  exit 1
fi
[ "$FAIL" -eq 0 ] && echo "ALL SELECTED GATES GREEN" || echo "SUITE RED"
exit "$FAIL"
