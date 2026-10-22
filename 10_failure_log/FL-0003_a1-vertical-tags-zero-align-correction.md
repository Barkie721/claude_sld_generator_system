# FL-0003 — 27 vertical A-1 feeder tags measure a zero align correction; probably correct, unverified on screen

| Field | Value |
|-------|-------|
| **ID** | FL-0003 |
| **Opened** | 2026-07-25 |
| **Closed** | — |
| **Status** | `investigating` |
| **Severity** | S4 |
| **Stage** | 6 Render/Revit |
| **Component** | `05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS/Services/AnnotationPlacer.cs` → `PlaceFeederTag()` :400 |
| **Failure class** | other (suspected non-issue; logged so the next trip settles it by eye) |
| **Detected by** | manual review of the 2026-07-25 placement CSV |

---

## 1. Symptom

In the 2026-07-25 placement report, the 80 A-1 feeder tags split cleanly into two alignment populations:

| Population | n | `align_dx, align_dy` |
|------------|---|----------------------|
| horizontal leader | **53** | `(+44.00, −26.764917)` — identical to 6 decimals |
| vertical leader | **27** | `(±0.0, ±0.0)` — exactly zero |

The 27 are the 19 noted `leader flipped 180°; tick-center pinned to attach` plus 8 unflipped ones
(`a-020`, `a-024` on S1; `a-072`, `a-074`, `a-076`, `a-078`, `a-080`, `a-082` on S2). For all 27,
`anchor == target == placed` exactly.

An exactly-zero result from a quantity that is supposed to be *measured* is what drew attention.

## 2. Impact

If the zero is wrong, up to 27 feeder tags on E-501/E-502 sit with their tick off the wire by the
family's insertion offset — cosmetic, no electrical content affected, no NEC exposure. If the zero is
right (see §3, which is the current reading) there is no impact at all.

## 3. Root cause

**Most likely: not a defect — the two populations are the two authored variants of the tag family, and
the vertical variant's tick genuinely sits on its insertion point.**

Reading `PlaceFeederTag()`, the split is by design and the classification is correct:

```
bool horizontal = Math.Abs(dxPx) >= Math.Abs(dyPx);   // pill offset axis
bool flipped    = horizontal ? dxPx < 0 : dyPx < 0;
```

Confirmed against the exported geometry — the `pill` offset is purely along one axis in every case:

| id | attach | pill | classified |
|----|--------|------|-----------|
| `a-006` | 1880, 4465.63 | **x+77**, same y | horizontal → corrected |
| `a-020` | 3095, 3958 | same x, **y+47.5** | vertical, pill below → not flipped |
| `a-007` | 1803, 476 | same x, **y−47.5** | vertical, pill above → flipped |

The offset is then **measured**, once per `(symbol.Id, horizontal, flipped)` cache key, by
`SymbolGeometry.ExtremeCurveMidpoint()` — the midpoint of the drawn curve farthest along
`attach − pill`. `SetAnnotationParameters(..., horizontal, ...)` reshapes the leader before that
measurement, so the horizontal and vertical shapes are two different drawn geometries with two
different tick positions. It is entirely consistent for the family author to have put the tick on the
origin in the vertical shape and 48.24 px off it in the horizontal shape — the measured
`origin_dx = 48.24` for A-1 in the family-dimensions CSV is the horizontal number.

A genuine measurement failure would **not** look like this: it takes the `offset is null` path, which
emits the warning *"Feeder-tag family … has no measurable geometry"* and sets the note to
*"no measurable geometry — left at raw attach point"*. Neither appears in this run — all 27 carry the
normal `tick-center pinned to attach` note, i.e. the measurement ran and returned zero.

## 4. Resolution

`TBD` — deferred by Mayo 2026-07-25. Almost certainly nothing to fix.

**Settle it by eye on the next trip** (30 seconds, no code): open E-502 and zoom any of
`a-072` / `a-076` / `a-080` — engine anchors `(175, 3132)`, `(600, 1660)`, `(995, 410)` — and check the
tag's tick actually crosses the feeder. If it does, close this `wont-fix` with the explanation in §3
recorded as the answer. If it doesn't, the fix is in the vertical branch of `ExtremeCurveMidpoint`'s
direction vector.

## 5. Regression guard

None yet, and none warranted while the finding is unconfirmed. If §4 shows the tags *are* off, the
guard is an assertion in the placement-CSV check that a **measured** align offset of exactly `(0, 0)`
for a family/variant whose sibling variant has a large offset is reported rather than silently
accepted.

## 6. Detection gap

n/a — nothing escaped. Recorded because reading the run report is currently the only way anyone would
ever notice, and that reading is not repeatable across trips.

## 7. Links

- Related failures: FL-0002 (same review pass)
- Specs / contracts touched: schema §14.1 (annotation `label` / pill), A-1 in the symbol catalog
- Gates involved: none
- Evidence: `09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hosptial - placement report.csv`
- Memory / session: the 2026-07-25 Revit run
