# FU-0003 — author Revit families for L1-3 (N-G bond) and L3-3 (equipment connection)

| Field | Value |
|-------|-------|
| **ID** | FU-0003 |
| **Title** | Author the two remaining placeable family gaps — L1-3 N-G bond and L3-3 equipment connection |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P1` |
| **Effort** | `L` |
| **Readiness** | `blocked:family-authoring` |
| **Category** | `add-in` |
| **Component** | `07_data/normalized/revit_SLD_family_map_V1_0_0.json` (+ its `Resources\` twin and the xlsx), `05_revit/DEADARMS ADDIN/` |
| **Stage** | 6 Render/Revit |
| **Decision tier** | `Tier 2 default+override` |
| **Golden impact** | `golden-inert` — Revit-side placement only; the engine already draws both |
| **Schema impact** | `none` |
| **Version bumps** | family map: all **three** surfaces in one change-set (normalized JSON, embedded `Resources\` copy, `revit_SLD_family_map_V1_0_0.xlsx`) |
| **Gates affected** | `sync` (family-map copies must stay byte-identical) |
| **Depends on** | — |
| **Blocks** | FU-0001 can never measure these types until they exist |
| **Target** | `next Windows trip` |

---

## 1. Problem

The family map covers 23 node types across 21 Revit families. Two **placeable** types have no family
authored at all: **L1-3** (neutral-ground bond) and **L3-3** (equipment connection). The N-G bond is
not a decorative symbol — it is one of the NEC non-negotiables (250.24(C), `CLAUDE.md` §6), so it
appears on every service-entrance drawing the engine renders and on none of the Revit output.

Today they surface as run-time skips. `PreflightChecker` reports them (it walks derived and annotation
types since the pre-trip hardening), so the gap is visible before a run rather than discovered
mid-run — but visible is not placed.

Note the deliberate non-members of this list: `Conductor-ends / Stub or End cap` and the `Transducer`
placeholder are `sld_node_type: null` **on purpose**, and A-7 `level-floor` is mapped and placed. This
entry is only about the two genuine gaps.

## 2. Proposed change

Author `_E_SLD_` families for both types, add their map entries across all three family-map surfaces,
and confirm the existing placer path resolves them with no new C# — L1-3 and L3-3 are ordinary device
node types, so `DevicePlacer` + `FamilyResolver` should cover them once the map entry exists.

## 3. Scope

**In:** the two families, their map entries, and runtime verification that both place.

**Out (non-goals):**
- Any of the 8 placeholder *symbols* (FU-0004) — those are undefined in the spec, a different problem
  from defined-but-unauthored.
- `_E_SLD_level-floor E01` staying `"TBD"` — that is **correct and must not be "finished"**: the
  family has zero usable parameters, which is exactly why `LevelLinePlacer` handles A-7 the way it does.

## 4. Acceptance criteria

- [ ] Both families authored, loaded, and resolving through `FamilyResolver` with no new placer code.
- [ ] Map entries present and **byte-identical** across the normalized JSON and the embedded
      `Resources\` copy; the xlsx row ships in the same change-set.
- [ ] `PreflightChecker` no longer reports either type as unmapped.
- [ ] A Revit run places every L1-3 and L3-3 instance in the hospital topology, with zero skips.
- [ ] Both appear in the next `Measure Families` CSV so FU-0001 can gate them.
- [ ] Glyph matches the catalog — the catalog is the visual master for symbol appearance.

## 5. Blast radius

Revit-side only; the engine already draws both symbols and its geometry does not change. The real risk
is the **three-surface family-map sync** — the two JSON copies must stay byte-identical (the sync gate
enforces it) and the xlsx is hand-maintained. The DLL embeds its copy, so a map change means a
**rebuild and reinstall**, not just a file edit.

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 12/12, sync 16/16. Record the current map sha.
**After:** the engine-side gates must be **unchanged** — this must not move geometry. Sync gate green
on the new map sha with the DLL rebuilt in lockstep (a stale embedded copy is exactly FL-0001).
Runtime: preflight clean, placement report shows both types placed, count matches the topology.

## 7. Risks / open questions

- Requires family authoring in Revit — **cannot be done from the phone.** Sequence it with a Windows
  trip.
- Does L3-3 need a family at all, or is its `DeviceTagPlacer` text stack the intended representation?
  Confirm before authoring: if the text stack is the design, this is a **documentation** fix, not a
  family gap, and the entry should be re-scoped.

## 8. Alternatives considered

- **Draw both as detail lines** (the pre-family A-7 approach) — rejected as the default: detail-line
  output is not schedulable or taggable in Revit and A-7 only works that way because its family has no
  usable parameters. Worth reconsidering *only* if authoring proves disproportionate.

## 9. Links

- Related updates: FU-0001, FU-0004
- Specs / contracts touched: `CLAUDE.md` §11 (the gap list), `02_specs/symbols/sld_system_model_V1_0_0.md`
- Memory / session: 2026-07-25
