# FU-0017 — the family map, measured against a real company model for the first time

> ⚠️ **RENUMBERED 2026-08-03: this was written as `FU-0015` and collided.** Two sessions wrote this
> repo inside the same hour. The *other* `FU-0015` — the cross-sheet bus-tap regression guard — was
> already cited by `FL-0026`, `FU-0016`, `09_tests/3000A 208V Service/…` and `REVISIONS.md`, so **it
> kept the number and this entry moved.** No content changed.

| Field | Value |
|-------|-------|
| **ID** | FU-0017 (**SLD repo**) — written as FU-0015, renumbered the same day |
| **Proposed** | 2026-08-03 |
| **Title** | Trip 4's capture notes are a measured coverage report for `revit_SLD_family_map_V1_0_0.json`: **40 families unmapped, 3 claimed twice** — and the ambiguities are a map defect, not a coverage gap |
| **Category** | data · contract |
| **Priority** | **P2** — but it is the cheapest input the family-rename thread will ever get |
| **Effort** | ~~S to decide,~~ **M–L to act** — the decision is made |
| **Readiness** | **`ready`** — the data is on disk and the scope question is answered |
| **Status** | `proposed` — **scope DECIDED 2026-08-03, see §0** |
| **Opened by** | trip 4, 2026-08-03 — `12_handoff/HO-0028` |

---

## 0. 🚩 DECIDED BY MAYO, 2026-08-03 — the map covers the WHOLE COMPANY LIBRARY

**Asked and answered:** the family map is **eventually to cover the entire company library**, not just
the engine-generated subset.

**That settles §3's open question and changes this entry's shape:**

- **The 40 `UNMAPPED` notes are a real backlog, not noise.** They are the first measured slice of the
  gap between what the map knows and what the company actually draws with.
- **`UNMAPPED` is therefore a legitimate long-lived state, not an error** — the map will be
  incomplete for as long as this backlog runs, so the capture must keep reporting it *without* the
  report reading like a fault. **Do not "fix" the notes by silencing them.**
- ⚠️ **This list is a floor, not a census.** It is what **one view of one model** used. The real
  library is larger, and nothing here enumerates it. **Do not treat 40 as the size of the job** —
  the next capture of a different sheet will add to it.
- **The 3 `AMBIGUOUS` entries stay first in line regardless.** They are a defect in what the map
  *already claims*, and widening coverage on top of an inconsistent base multiplies the problem
  rather than diluting it.

**Recommended order:** fix the 3 ambiguities → decide how coverage gets *measured* (a capture-driven
list beats hand-maintenance, and trip 4 just proved the capture can produce one) → then work the
backlog. **Sequence it against the rename thread**, since renaming a family the map already carries
moves both sides at once.

---

## 1. What the trip produced

The 2025 capture emitted **90 notes**. 47 are `ROTATION DERIVED` (the rotation fallback working).
**The other 43 are the family map talking**, and nobody has ever seen this list before:

- **3 × `AMBIGUOUS`** — two map entries claim the same family/type:
  - `_E_SLD_Circuit-Breaker V01 / CB` → **L1-1, L2-1**
  - `_E_SLD_Circuit-Breaker V01 / Spare` → **L2-1, L2-7**
  - `_E_SLD_Transducer V01 / Combined` → **L1-4, L2-8**
- **40 × `UNMAPPED`** — in the real company template and absent from the map. Including
  `_E_SLD_Bus E01/Bus`, `_E_SLD_Bus-duct E01/Bus`, `_E_SLD_switch E01/Standard`,
  `_E_SLD_symbolic_XFMR E01/PRIMARY TRANSFORMER`, `_E_SLD_Motor V02/Motor with Controller`,
  `_E_SLD_PV-array-symbolic E01/standard`, five `_E_SLD_Conductor-ends E01` types, four
  `_E_SLD_Rectangle*` types, both `_E_SLD_Transducer V01` singles, both `_E_SLD_Meter V01` types,
  `_E_SLD_Available Short-Circuit Current V01`, **eight `_E_SLD_ Feeder Table …` families**, and the
  annotation families `Hex Note V1/Loop`, `Leader Arrow V01`, `00-DT-G-Callout_Bracket E01/Default`,
  three `PAE-DT-G-Loop Annotation E01` types.

**The full verbatim list is in the trip artifact**, not retyped here:
`09_tests/SLD Master Template/6_revit/2026-08-03_trip4_replay_into_2023/…V04.txt`, the
`CAPTURE NOTES (90)` block. ⚠️ **That folder was removed 2026-10-21; read it from git at `32c3e2e`**
(`git show "32c3e2e:claude_sld_generator_system/09_tests/SLD Master Template/…"`).

## 2. Why this is worth an entry

**The 3 `AMBIGUOUS` rows are a defect, not a gap.** A family/type claimed by two node types means the
reverse lookup has no single right answer and picks one. That is a map-integrity problem that exists
whether or not anyone ever widens coverage, and **it has been sitting in a shipped, sha-pinned,
embedded resource** without anything noticing — the map is gated for *byte identity*
(`embeds_map_sha256` ↔ `family_map.sha256` @ `df7cfc4f`), which says nothing about whether its
contents are self-consistent.

**The 40 `UNMAPPED` rows are the family-rename thread's shopping list, arrived for free.** The open
thread (memory: *company family-name renaming*) assumed the mismatch list would come from the 2023
**preflight**. It does — but the preflight reports what the 2023 model is *missing*, while this
reports what the 2025 map does not *know*. **Two different lists, and this is the one nobody had.**

## 3. What is NOT claimed here

⚠️ **`UNMAPPED` is not a bug, and under §0's decision it never becomes one.** The reverse lookup
exists to attach `src{}` provenance; replay itself re-places by family and type name and never
consults the map. **None of these 40 caused a failure on this trip**, and none of them will —
widening the map is about provenance coverage, not about making anything work that is currently
broken.

⚠️ **So do not let this entry justify itself with the wrong urgency.** It is a P2 that improves what
the capture can *explain*, sitting behind FL-0005's P1 which is about what the replay gets *wrong*.

## 4. If the map is edited

🚩 **The map is an embedded resource and is gated in lockstep.** Editing
`Resources/revit_SLD_family_map_V1_0_0.json` means rebuilding `DEDARMS.dll` and re-blessing **both**
shas together (`embeds_map_sha256` and `family_map.sha256`), plus the installer pin and the
`CLAUDE.md` line. **Looks golden-inert** — the golden baselines are engine/SVG outputs and never
consult the family map — but verify rather than assume.

## 5. Links

- Evidence: `09_tests/SLD Master Template/6_revit/2026-08-03_trip4_replay_into_2023/` — **removed
  2026-10-21; in git at `32c3e2e` only**
- Handoffs: `12_handoff/HO-0028` (SLD) · `07_handoff/HO-0006` (toolkit repo)
- Related: **FL-0005 (toolkit repo)** — two of the unmapped families are the same ones that failed to
  place, **for an unrelated reason**. Do not conflate: the placement failure is
  `FamilyPlacementType`, not map coverage.
