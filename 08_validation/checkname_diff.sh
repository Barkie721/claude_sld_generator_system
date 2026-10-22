#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# checkname_diff.sh — D7. Assert that sync_gate still runs the checks it ran last time,
# BY NAME.
#
# WHY THIS EXISTS
# "Diff the NAMES, never the totals" is the rule that has now caught something in three
# consecutive sessions (HO-0008 §3 proved it twice). A check that stops running does not
# announce itself: the total drops, and a dropped total looks exactly like a check that was
# deliberately removed. Only the names distinguish those.
#
# WHY IT IS NOT INSIDE sync_gate.mjs
# §5 Q1's failure mode: a top-level import sync_gate cannot resolve makes it die on a raw ESM
# stack with ZERO check lines and NO `SYNC-GATE:` authority line (HO-0008 §3, measured against
# the lib it then imported — lib/dll_embed_V1_0_0.mjs, which Phase 7b deleted along with the
# two checks that used it. The example is history; the shape applies to every import it has
# left, and to `03_contracts/current_state_manifest.json`, which it parses at module scope). A
# self-check living inside sync_gate dies with everything else and cannot see the one case
# the guard exists for. So the runner owns it, and it treats sync_gate as a black box.
#
# WHY A COMMITTED FILE RATHER THAN §11.2's AD-HOC "capture before, capture after"
# There is no git. A "before" capture that is skipped is unrecoverable — only the whole-repo
# snapshot can recover it. §0.4(2) records that this exact trap already bit the SLD Replay
# work. Phases 4, 5 and 7 each need this: three chances to forget, under exactly the
# pressure that causes forgetting. A committed baseline cannot be forgotten.
#
# THE CAPTURE GUARD (§5 Q1) IS THE LOAD-BEARING PART
# Never bless, and never compare against, an empty capture. An empty baseline diffs clean
# against a dead gate forever — a check that passes by proving nothing, which is FL-0001's
# class and the reason this file is careful. Both `--bless` and the comparison require a
# non-zero line count AND the `SYNC-GATE:` authority line before they will proceed.
#
# USAGE
#   bash 08_validation/checkname_diff.sh            # compare both modes against the baseline
#   bash 08_validation/checkname_diff.sh --bless    # regenerate the baseline (deliberate act)
# ---------------------------------------------------------------------------
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$REPO/08_validation/sync_gate_checknames_V1_0_0.txt"
BLESS=0
[ "${1:-}" = "--bless" ] && BLESS=1

# Extract `[Pn] name` from a sync_gate run.
#
# The two leading spaces and the `[Pn]` are both part of the anchor, which is what keeps the
# summary block's `  FAILED [P1] name: detail` lines out of the capture — "FAIL" followed by
# a space matches, "FAILED" does not, because ` +\[` requires the next non-space to be `[`.
#
# `s/ — .*$//` strips at the FIRST em-dash separator, not the last. The detail carries shas
# and counts and churns on every legitimate re-bless, so only `[phase] name` is stable. All
# 14 names carry exactly one " — " today (re-measured 2026-07-31), but stripping at the first
# is what stays correct if a name ever contains one.
extract() { grep -aE '^  (ok|FAIL) +\[P[0-9]\] ' | sed -E 's/^  (ok|FAIL) +//; s/ — .*$//'; }

# Run sync_gate and return its check names, or fail loudly. Never returns a partial capture.
capture() { # capture <mode: full|quick>
  local mode="$1" out names
  if [ "$mode" = "quick" ]; then
    out="$(node "$REPO/08_validation/sync_gate.mjs" --quick 2>&1)"
  else
    out="$(node "$REPO/08_validation/sync_gate.mjs" 2>&1)"
  fi
  # GUARD 1 — the authority line must be present. Without it sync_gate did not reach its own
  # summary, which means it died rather than reported, and nothing below is a capture.
  if ! printf '%s' "$out" | grep -aq '^SYNC-GATE: '; then
    echo "CAPTURE FAILED ($mode): no 'SYNC-GATE:' authority line in the output." >&2
    echo "  sync_gate did not reach its summary — it crashed rather than reported." >&2
    printf '%s\n' "$out" | tail -15 | sed 's/^/    /' >&2
    return 1
  fi
  names="$(printf '%s\n' "$out" | extract)"
  # GUARD 2 — a non-zero line count. An empty capture must never be written or compared.
  if [ -z "$names" ]; then
    echo "CAPTURE FAILED ($mode): zero check lines extracted despite a SYNC-GATE: line." >&2
    echo "  The output format changed and this script's anchor no longer matches it." >&2
    return 1
  fi
  printf '%s\n' "$names"
}

FULL="$(capture full)"   || exit 1
QUICK="$(capture quick)" || exit 1
NFULL="$(printf '%s\n' "$FULL"  | grep -c .)"
NQUICK="$(printf '%s\n' "$QUICK" | grep -c .)"

# ---------------------------------------------------------------------------
# BLESS
# ---------------------------------------------------------------------------
if [ "$BLESS" -eq 1 ]; then
  {
    echo "# sync_gate check-NAME baseline — D7. Blessed by: bash 08_validation/checkname_diff.sh --bless"
    echo "# NAMES ONLY. The text after ' — ' is deliberately absent: it carries shas and counts"
    echo "# and churns on every legitimate re-bless, which would make this file noise."
    echo "# Order is execution order and is significant — a reordered check is a real change."
    echo "# Re-bless ONLY when you have deliberately added or removed a check, and say which in"
    echo "# the same change-set. Re-blessing to clear a red you did not intend is the failure"
    echo "# this file exists to prevent."
    echo "# --- FULL ($NFULL) ---"
    printf '%s\n' "$FULL"
    echo "# --- QUICK ($NQUICK) ---"
    printf '%s\n' "$QUICK"
  } > "$BASELINE"
  echo "BLESSED $BASELINE — full=$NFULL quick=$NQUICK"
  exit 0
fi

# ---------------------------------------------------------------------------
# COMPARE — mode-aware. Both sets live in one file with explicit section markers rather than
# being derived from each other: `--quick` happens to be "full minus the [P6] checks" today,
# and encoding that relationship would silently rot the day the phase layout changes.
# ---------------------------------------------------------------------------
if [ ! -f "$BASELINE" ]; then
  echo "  FAIL  [D7] sync-gate check-name baseline — no baseline at $BASELINE."
  echo "        Bless one deliberately: bash 08_validation/checkname_diff.sh --bless"
  exit 1
fi

section() { # section <FULL|QUICK>
  awk -v want="$1" '
    /^# --- FULL \(/  { sec="FULL";  next }
    /^# --- QUICK \(/ { sec="QUICK"; next }
    /^#/ { next }
    sec == want && length($0) { print }
  ' "$BASELINE"
}

RC=0
for mode in FULL QUICK; do
  [ "$mode" = "FULL" ] && got="$FULL" || got="$QUICK"
  want="$(section "$mode")"
  if [ -z "$want" ]; then
    echo "  FAIL  [D7] check-name baseline ($mode) — the $mode section is empty or missing in the baseline."
    echo "        An empty expectation diffs clean against anything. Re-bless deliberately."
    RC=1; continue
  fi
  if d="$(diff <(printf '%s\n' "$want") <(printf '%s\n' "$got"))"; then
    n="$(printf '%s\n' "$got" | grep -c .)"
    echo "  ok    [D7] check-name baseline ($mode) — $n names, unchanged"
  else
    echo "  FAIL  [D7] check-name baseline ($mode) — the set of checks CHANGED:"
    printf '%s\n' "$d" | sed 's/^/        /'
    echo "        '<' = in the baseline but NOT run now (a check silently stopped running)."
    echo "        '>' = running now but NOT in the baseline (a check was added)."
    echo "        If deliberate: bash 08_validation/checkname_diff.sh --bless, in the same change-set."
    RC=1
  fi
done
exit "$RC"
