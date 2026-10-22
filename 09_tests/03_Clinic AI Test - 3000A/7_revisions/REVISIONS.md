# Clinic AI Test — revision log: every change requested after the drawing was generated

> **Canonical:** `00_Docs/project_instructions_V1_0_0.md` §7.1 owns the change-request protocol;
> this file is the per-project record it writes to. `scope: engine-suspect` entries are what
> `10_failure_log/` is mined from.

## 1. Issue history

| Rev | Date | Description | Seal status |
|-----|------|-------------|-------------|
| 0 | 2026-10-20 | Generated from verbal scope (AI compositor test) | unreviewed |

## 2. Change log

### R-001 · 2026-10-20 · scope: project · status: fixed (run 4)
**Seen:** run 1 — the plug branch chain (4P-1-A → 4T-1-A → 2P-1-A → 2P-1-B) hung *downward*
from 4P-1-A's `feed_bottom`, and 2P-1-A landed on the main breaker (SH-3 COLLISION_WARNING,
d-303 × d-314, 2046 px²). Run 2 (`feed_top` exit) — identical placement.
**Cause:** `placeSubFeeds` always places a child at `parentBottom + 120` (engine L11655 ff.);
only floor anchors lift it, and a one-storey sheet has none.
**Tried:** internal_to breaker form (run 3) — draws upward, but **5 drops**: placeSubFeeds runs
before placeInternalChains, so the feed-through 2P-1-B is never reachable (same finding as Sprouts r-317).
**Fix:** lateral sub-feeds — `4P-1-A feed_left → 4T-1-A`, `4T-1-A secondary_out → 2P-1-A`,
`2P-1-A feed_left → 2P-1-B`, with the plug column westmost in SEC-4. Lateral children stay on the
parent's row, so the chain sits above the main/metering sections. `feed_left` added to
`subfeed_start_ports`. SH-3 cleared, 0 drops.

### R-002 · 2026-10-20 · scope: engine-suspect · status: superseded by R-005 (lateral layout removed)
**Seen:** stage 10 `through_symbol=2` — F-303 and F-305 enter their own child's box.
**Cause:** the lateral branch of placeSubFeeds draws `side-mid → childTopX @ side-mid → childTop`,
i.e. the run reaches the child's centre-line at mid-height *inside* the child's extent, then turns
up into its top edge. Any lateral child whose top is above the parent's mid-height is entered from
inside. Not fixable from layout_config. Candidate FL entry if it repeats.

### R-003 · 2026-10-20 · scope: engine-suspect · status: fixed by config (R-008)
**Seen:** stage 11 HARD ×3 on S2 — the middle `1253` pill (F-333) of EQ4P-1-A's three-transformer
internal-chain fan sits across F-331 and F-335. The three primaries rise 35 px apart; a 50 px pill
cannot fit between them on any side. Needs either a wider internal-chain pitch for `ic ≥ 3` or a
tag-slide along the shared horizontal. No layout_config key reaches internal-chain pill placement.

### R-004 · 2026-10-20 · scope: project · status: wontfix
**Seen:** stage 13 composed scale 1.00 on both sheets (target 0.35–0.46).
**Why left:** the sheets are sparse (one storey, no risers), so the drawing renders at full scale —
the band was calibrated on the multi-storey hospital. Not a legibility defect.

### R-005 · 2026-10-20 · scope: project · status: superseded by R-009 — owner request
**Asked:** 4T-1-A directly above 4P-1-A, then 2P-1-A above it; 2P-1-B butt to butt with 2P-1-A.
**Done:** S1 `floor_order` gains two hidden pseudo-rows `1a` / `1b` above Level 1 (`level_order`
stays `[]`, so no level lines are drawn). 4T-1-A → `1a`, 2P-1-A and 2P-1-B → `1b` via
`floor_band_designations` + `level_map`; `riser_step_standard` 420; F-303 / F-304 straightened.
Measured: 4T-1-A centre x 995.0 = 4P-1-A centre; 2P-1-A centre 983 (12 px off plumb); 2P-1-B
100 px west of 2P-1-A, a 36 px gap, joined by a feed_bottom → feed_bottom U (tag `4004`).
**Not done:** see R-006.

### R-006 · 2026-10-20 · scope: engine-suspect · status: fixed — engine rev 1.0.18 (OFF-031), R-009
**Seen:** stage 10 `through_symbol=2`: F-303 runs up *through* 4T-1-A to land on its top
(`primary_in`), and F-304 leaves 4T-1-A's *bottom* (`secondary_out`), drops 90 px, then rises
past it (collinear_v 1). Stage 11: the `4004` pill sits on its own U-run.
**Cause:** placeSubFeeds assumes downward power flow — `termY` lands on the child's top unless
`end.port === 'feed_bottom'`, and only `start.port === 'feed_top'` exits upward. An L2-2 has
neither port (CV-8: `primary_in` / `secondary_out` / `flex_*`). Gap to 2P-1-B is the fan's fixed
~100 px child offset; no key sets a sub-feed child's X.
**Clean fix (engine):** call placeSubFeeds a second time after placeInternalChains (edges whose
source an internal chain just placed). Then 4T-1-A / 2P-1-A ride the internal-chain pass (draws
upward correctly — compare 4M-1-A → 4T-2-A → 2M-1-A) and 2P-1-B hangs off 2P-1-A. Needs a
crossExits de-dup guard, a gen_engine rebuild, rev bump + mirrors, 13/13 gates, and — if it moves a
published artifact — a decision in the tool repository first (GOV-43).

### R-007 · 2026-10-20 · scope: project · status: fixed (run 6) — owner request
**Asked:** 4T-2-A label clashing with 2P-1-C.
**Done:** SEC-4 reordered plug · lighting · mechanical; the kitchen breaker CB-04 moved into SEC-5
between the LS and C ATS feeders, so neither transformer's label block runs into the next column.

### R-008 · 2026-10-20 · scope: project · status: fixed (run 6) — owner request
**Asked:** F-307, F-325, F-328 tags on the right like the rest; F-333's tag clashing.
**Done:** `a1_tag_placement` `side: 'right'` on F-307 / F-325 / F-328. F-333:
`{ force_orient: 'vertical', side: 'right', dy: -120 }` — slides the tag ALONG its own run above
the jog, where F-331 / F-335 have turned away (stage 11 S2 HARD 3 → 0; tick_detached 0).

### R-009 · 2026-10-20 · scope: engine · status: fixed (run 7, engine 1.0.18) — owner request, owner-approved engine change
**Asked:** clean up the feeders into and out of 4T-1-A; 2P-1-B is a feed-through panel and must sit
right next to 2P-1-A (in the room they are always side by side); remove F-305 from the one-line but
keep it on paper.
**Engine (owner approved):** OFF-031 `layout_config.feed_through_panels` — a new pass,
placeFeedThroughPanels, run after placeInternalChains, butts the named panel against the L2-4 that
feeds it and counts that R-1 (+ A-1/A-2) as an intentional skip. Golden-inert by default `{}`.
Proof: G1 0.0000 px; G8, conformance, gen-idempotent, parity, behavior, acceptance, G5, G7, G9,
check-name all PASS; sync_gate 14/14. G6 is red before AND after for an environmental reason —
this container's rsvg-convert 2.58 rasterizes differently from the baseline machine — and the
composed **SVGs are byte-identical** before and after; PNG baselines deliberately NOT re-blessed.
**Project:** the plug step-down rides the internal-chain pass (internal CB `4P-1-A-CB` 225AF/175AT,
pa-319), the same path as the mechanical branch, so 4T-1-A sits plumb above 4P-1-A and 2P-1-A
plumb above it. `feed_through_panels: { '2P-1-B': 'left' }` — left because 2P-1-A's A-4 pennant is
on its right. Pseudo-rows 1a/1b, the straightens and the lateral sub-feeds are all removed.
Measured: 2P-1-B x 884 = 2P-1-A x 948 − 64 (butted, 0 px gap); through_symbol 2 → 0,
through_text 0, collinear 0, exits_outside 0, tag HARD 2 → 1 (the by-design utility pennant).

### R-010 · 2026-10-20 · scope: data · status: fixed (run 7) — owner request
**Asked:** rename 2P-1-C to 2K-1-A, K for kitchen.
**Found:** K was NOT in the legend — only the one-off owner tags `2K1` / `2K2` (3000A 208V
Service). TI-4 gates at error, so the rename alone fails validation.
**Done (owner approved):** equipment code `K — Kitchen Panel` added to
`07_data/normalized/equipment_designation_legend_V1_0_0.json` and to the source
`07_data/excel/equipment_designation_legend_V1_0_0.xlsx` together (row after `U — UPS`, merged
section headers shifted with it). TI-4: 0 errors with `2K-1-A`.

### R-011 · 2026-10-20 · scope: project · status: fixed (run 9) — owner request
**Asked:** on the emergency distribution, each ATS gets its own section.
**Done:** E4MSB-1-A distribution split into SEC-3-EM (ECB-01 → LS4A-1-A, `nec_class '700'`),
SEC-4-EM (ECB-02 → C4A-1-A), SEC-5-EM (ECB-03 → EQ4A-1-A), and SEC-6-EM for the spare + space so
no branch section carries anything else. Critical / Equipment sections stay `nec_class: null` —
NEC 517 branches, not Art. 701/702 systems (NOTE-009). All checkers unchanged at 0; P3 63 rules clean.
