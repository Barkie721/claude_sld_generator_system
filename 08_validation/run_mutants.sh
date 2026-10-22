#!/usr/bin/env bash
# run_mutants.sh — run THIS repo's mutant harnesses, deliberately.
#
# Created 2026-08-01 as the answer to FU-0012 (SLD) / FU-0006 (toolkit). ⚠️ THE SAME
# DECISION IS RECORDED IN BOTH REPOS AND THE TOOLKIT HAS ITS OWN COPY OF THIS SCRIPT —
# neither repo can see the other, so a decision written in one is only half made.
#
#   bash 08_validation/run_mutants.sh              # build a lab, run every harness, clean up
#   bash 08_validation/run_mutants.sh --keep-lab   # leave the lab for inspection
#   MUTANT_LAB=/root/somewhere bash 08_validation/run_mutants.sh
#
# ── WHY THIS IS A SEPARATE RUNNER AND NOT PART OF `run_all_gates.sh` ────────────────────
# The choice was between three options (FU-0012 §2): suite-invoked, a separate runner, or
# explicitly manual-only. This is the middle one, and the reasoning is:
#
#   · SUITE-INVOKED was rejected on COST and on BLAST RADIUS. Each harness invokes the
#     whole gate once per arm — 12 invocations here, 45 across both repos — and every one
#     needs a writable lab off `/storage` (which is `noexec`). A harness that could not
#     build its lab would have to either fail the suite or soft-skip, and **a soft-skip is
#     the exact failure mode these harnesses exist to hunt** (FL-0009). Wiring them in
#     would also move `EXPECTED_GATES` and the gate-14 check-NAME baseline, i.e. a re-bless,
#     for a change that adds no new assertion about the product.
#   · MANUAL-ONLY was rejected because "run it by hand when you remember" is a written
#     warning used as a control, and this repo's own record on that is bad. An unrun
#     instrument is an absent instrument.
#
# So: the harnesses stay OUT of the gate count, and they get a runner with an ARITHMETIC
# PIN of its own so one cannot vanish silently. That is FL-0017's lesson (`EXPECTED_GATES`)
# applied one layer up.
#
# ⚠️ WHEN TO RUN IT: after editing any check a harness covers, and before any change-set
# that re-blesses a gate baseline. It is NOT part of the routine gate run and does not
# need to be.
#
# ⚠️ NEVER RUN THIS AT THE SAME TIME AS `run_all_gates.sh`, or at the same time as the
# toolkit's suite or its `run_mutants.sh`. Two suites at once is a false red (FL-0012).
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAB="${MUTANT_LAB:-/root/sld_mutant_lab}"
KEEP=0
for a in "$@"; do
  case "$a" in
    --keep-lab) KEEP=1 ;;
    *) echo "unknown flag: $a"; exit 2 ;;
  esac
done

# ── THE PINS ───────────────────────────────────────────────────────────────────────────
# One line per harness: <file>|<env var>|<expected arm count>.
#
# ⚠️ BOTH NUMBERS ARE LOAD-BEARING AND BOTH ARE ASSERTED. `EXPECTED_HARNESSES` catches a
# harness that was deleted or never ran; the per-harness arm count catches an ARM that was
# deleted inside a harness that still reports green. FL-0017 measured what happens without
# the first (a deleted gate read as a smaller green); FL-0023 measured what happens when an
# arm silently stops exercising anything (M3's control was dead and the defect it aimed at
# went unexercised, while the harness still said GREEN).
#
# ADDING OR REMOVING A HARNESS OR AN ARM MEANS EDITING THIS BLOCK. That is the point.
HARNESSES=(
  "mutants_drop_staleness.mjs|SLD_LAB|12"
  "mutants_gate_stderr.mjs|SLD_LAB|6"       # FL-0028 / FU-0022, added 2026-10-13
)
EXPECTED_HARNESSES=2

echo "======================================================"
echo "SLD MUTANT HARNESSES — deliberate run, NOT part of the 13-gate suite"
echo "  repo: $REPO"
echo "  lab:  $LAB"
echo "======================================================"

# ── build the lab ──────────────────────────────────────────────────────────────────────
# Off /storage on purpose: it is `noexec`, the harnesses refuse to mutate a path inside
# the real workspace, and a mutant harness that mutates the repo it is proving is not a
# harness.
case "$LAB" in
  /sdcard/*|/storage/*|"$REPO"*)
    echo "!! MUTANT_LAB ($LAB) is on /storage or inside the repo. Refusing." >&2
    echo "!! The harnesses refuse this too — pick a path under /root." >&2
    exit 2 ;;
esac
rm -rf "$LAB"
mkdir -p "$LAB"
if ! cp -r "$REPO/." "$LAB/" 2>/dev/null; then
  echo "!! could not build the lab at $LAB" >&2
  exit 2
fi
LAB_N="$(find "$LAB" | wc -l)"
REPO_N="$(find "$REPO" | wc -l)"
echo "  lab built: $LAB_N entries (repo has $REPO_N)"
if [ "$LAB_N" -ne "$REPO_N" ]; then
  echo "!! LAB IS NOT A FAITHFUL COPY ($LAB_N vs $REPO_N entries). A harness run against a" >&2
  echo "!! partial tree proves nothing about the real one." >&2
  exit 2
fi

# ── run them ───────────────────────────────────────────────────────────────────────────
RAN=0; FAILED=0; FAILED_NAMES=""
for spec in "${HARNESSES[@]}"; do
  IFS='|' read -r file envvar arms <<< "$spec"
  echo
  echo "----- $file (expect $arms arms) -----"
  out="$(env "$envvar=$LAB" node "$REPO/08_validation/$file" 2>&1)"
  status=$?
  echo "$out" | sed 's/^/  /'
  RAN=$((RAN+1))

  # ⚠️ SCORE ON THE SUMMARY LINE, NOT ONLY ON THE EXIT CODE. A harness that dies before it
  # reaches its first arm exits non-zero with no MUTANTS line at all, and an exit-code-only
  # reading cannot tell that apart from arms that ran and failed. Absent is its own verdict.
  line="$(echo "$out" | grep -a '^MUTANTS:' | tail -1)"
  if [ -z "$line" ]; then
    echo "  !! NO 'MUTANTS:' SUMMARY LINE — the harness died before scoring (exit $status)."
    echo "  !! That is NOT the same as 'no arms failed'. Treating as a failure."
    FAILED=$((FAILED+1)); FAILED_NAMES="$FAILED_NAMES $file(no-summary)"
    continue
  fi
  got_ok="$(echo "$line"  | sed -E 's/^MUTANTS: ([0-9]+) correct.*/\1/')"
  got_bad="$(echo "$line" | sed -E 's/.* ([0-9]+) wrong.*/\1/')"
  got_tot="$(echo "$line" | sed -E 's/.*of ([0-9]+)\..*/\1/')"

  if [ "$got_tot" != "$arms" ]; then
    echo "  !! ARM-COUNT MISMATCH: ran $got_tot arm(s), $arms pinned in this runner."
    echo "  !! An ARM was added or REMOVED. A shrunken harness reports green just as loudly"
    echo "  !! as a complete one — resolve this before reading the score."
    FAILED=$((FAILED+1)); FAILED_NAMES="$FAILED_NAMES $file(arm-count)"
  elif [ "$got_bad" != "0" ] || [ "$status" -ne 0 ]; then
    echo "  !! $got_bad arm(s) wrong (exit $status)."
    FAILED=$((FAILED+1)); FAILED_NAMES="$FAILED_NAMES $file"
  else
    echo "  PASS  $file — $got_ok/$got_tot arms correct"
  fi
done

[ "$KEEP" -eq 1 ] || rm -rf "$LAB"
[ "$KEEP" -eq 1 ] && echo && echo "  lab kept at $LAB (--keep-lab)"

echo
echo "======================================================"
echo "MUTANT HARNESSES: $((RAN-FAILED)) passed, $FAILED failed.${FAILED_NAMES:+  FAILED:$FAILED_NAMES}"
if [ "$RAN" -ne "$EXPECTED_HARNESSES" ]; then
  echo "⚠️  HARNESS-COUNT MISMATCH: $RAN ran, $EXPECTED_HARNESSES expected."
  echo "    A harness was ADDED or REMOVED without this runner's pin being updated. Do NOT"
  echo "    read the pass count as coverage until this is explained."
  echo "MUTANTS RED"
  exit 1
fi
[ "$FAILED" -eq 0 ] && echo "ALL MUTANT HARNESSES GREEN" || echo "MUTANTS RED"
exit "$FAILED"
