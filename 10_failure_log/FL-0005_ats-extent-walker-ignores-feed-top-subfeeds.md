# FL-0005 — ATS subtree-extent walker counts only `feed_bottom` sub-feeds; the golden's own four `feed_top` risers are uncounted

> ⚠️ **EVIDENCE ARCHIVED 2026-07-28.** This entry cites paths under `09_tests/` that no longer
> exist: the **5-Story Hospital - 2500 kVA** project folder (review pass 1, `snapshots/audit.json`) was deleted on 2026-07-28 at Mayo's instruction.
> The finding itself is unaffected — the defect is in `04_renderer/`, which is live, and OFF-010 (`ats_extent_subfeed_ports`) is
> still the mitigation. What is gone is the reproduction case — the S2 sheet that went 0 → 3 feeder
> crossings after the riser port change. **This entry is `mitigated`, not closed, and now has no
> on-disk case that demonstrates the default still reproduces the defect.**
> To re-read the evidence, restore from the pre-delete repo tarball (the only copy; there is no
> git): `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`.
> Context and what the delete cost: `09_tests/README.md`.

| Field | Value |
|-------|-------|
| **ID** | FL-0005 |
| **Opened** | 2026-07-26 |
| **Closed** | — |
| **Status** | `mitigated` (opt-in config key; default still reproduces the defect by design) |
| **Severity** | S3 |
| **Stage** | 4 Layout |
| **Component** | `04_renderer/sld_viewer_engine_V1_0_0.html` → `placeATSsAndGenerator()` → `_panelSubtreeExtent()` |
| **Failure class** | two implementations of one concept drifted apart |
| **Detected by** | 5-Story Hospital review pass 1 — S2 went 0 → 3 feeder crossings after the riser port change |

---

## 1. Symptom

`_panelSubtreeExtent` collects a panel's sub-feed children with a hardcoded port test:

```js
r.start.port === 'feed_bottom'
```

`placeSubFeeds` — the pass that actually **places** those children — has used the config-driven
`SUBFEED_START_PORTS` (default `['feed_bottom','feed_top']`) since OFF-004. The two passes
therefore disagree about what a sub-feed *is*. Every upward `feed_top` riser is invisible to the
extent math that sets the spacing between ATS clusters on an emergency sheet.

On the 5-story hospital, switching the four S2 branch risers to `feed_top` exits made each branch
distribution panel read as a row of **leaf** panels. The pitch solver packed the four ATS clusters
from ~1500 px spacing down to ~420 px while each fan is still 1000–1400 px wide, so the EQ and O
subtrees interleaved:

| | E | C | EQ | O |
|---|---|---|---|---|
| correct cluster X | 353 | 823 | 2168 | 3463 |
| under-counted X | 353 | 823 | 1243 | 1663 |

Result: 3 feeder crossings (`EQ4A-1-A→EQ4S-1-A × O4B-1-A`, `EQ4S-1-A→EQ4M-4-A × O4T-1-A`,
`O4B-1-A-CB→O4T-1-A × EQ4S-1-A`).

## 2. Impact

Any topology whose emergency-sheet risers exit `feed_top` gets ATS clusters packed to the heuristic
minimum and overlapping subtrees. Silent: nothing in the validator sees it, and the crossings only
surface in `snapshot_html.mjs --audit`, never in a gate.

**The hospital golden trips this too.** Its S2 carries four `feed_top` sub-feeds the walker does not
count — `F-050` (E4S-1-A→E4B-2-A), `F-045` (C4S-1-A→C4B-2-A), `F-058` (EQ4S-1-A→EQ4M-2-A) and
`F-056` (EQ4S-1-A→EQ4M-R-A). Its frozen ATS spacing is therefore built on an under-count. It happens
to look right because those four are the *second* child of a fan whose other children are
`feed_bottom` and already force a wide-enough extent — the under-count is masked, not absent.

## 3. Root cause

The port set was hardcoded when `placeSubFeeds` also hardcoded it. OFF-004 made the placer
config-driven and did not carry the change into the extent walker. Nothing gates the two against
each other, so the drift was invisible until a topology used `feed_top` for *every* riser rather
than for the odd one out.

## 4. Resolution

**Mitigated, not fixed** (engine rev 1.0.1, OFF-010). The port set is now
`layout_config.ats_extent_subfeed_ports`, defaulting to `['feed_bottom']` — the legacy hardcode,
byte-for-byte. Projects that riser upward opt in:

```json
"ats_extent_subfeed_ports": ["feed_bottom", "feed_top"]
```

The default is deliberately still wrong. Correcting it to match `subfeed_start_ports` would widen
the golden's E/C/EQ extents and move its ATS positions — G1 red on the frozen oracle. That is a
re-freeze decision for Mayo, not a silent bug fix, so the honest default is the one that reproduces
today's geometry.

**Owed:** re-freeze the golden with the walker reading `SUBFEED_START_PORTS` directly and delete the
key. Until then, every new emergency-sheet project must remember to set it.

## 5. Regression guard

None automated — and that is the gap. G1 cannot catch this (it only proves the golden is unchanged,
and the golden's own under-count is *inside* the baseline). The candidate guard is an engine-level
assertion that `ATS_EXTENT_PORTS` is a superset of the sub-feed start ports actually present on an
emergency sheet, emitted into `geometry.layout_warnings` — visible without changing any geometry.

## 6. Detection gap

Found only because a human asked why S2 crossings went 0 → 3, and the position diff against a tar
snapshot showed all 106 S2 devices had moved. Without that before/after diff the compressed layout
reads as a plausible "tighter sheet". `--audit` reported the crossings but not the cause.

## 7. Links

- Related failures: FL-0002 (also an engine constant that disagrees with a measured source)
- Specs / contracts touched: `layout_config` schema (new key `ats_extent_subfeed_ports`)
- Gates involved: none catch it; full 12-gate suite green before and after (G1 0.0000)
- Evidence: `09_tests/5-Story Hospital - 2500 kVA/` review pass 1; `snapshots/audit.json`
- Memory / session: 2026-07-26 review pass 1
