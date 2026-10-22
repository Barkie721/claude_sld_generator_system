# FU-0021 — the extension spec may still carry a per-row certification reference

| Field | Value |
|-------|-------|
| **ID** | FU-0021 |
| **Title** | Remove any per-row certification reference from the extension spec |
| **Proposed** | 2026-10-13 (SLD-side finding, OQ-113) |
| **Proposed by** | `review` |
| **Owner** | the SLD side — **Mayo's triage of 2026-10-13** |
| **Status** | **closed, no change** — Mayo ruled 2026-10-13 that the SLD-side text no longer carries the reference (see §4). The README has no terminal state for "nothing to change"; this is not `rejected`, since nothing was decided against |
| **Priority** | `P1` — earliest target (M1); by target milestone, Mayo 2026-10-13 |
| **Effort** | TBD |
| **Readiness** | `ready` |
| **Category** | `symbols/spec` · contract |
| **Stage** | 2 Topology |
| **Component** | the `sld_topology/v1` extension spec — exact file to be located at plan time |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `unknown — must measure` |
| **Schema impact** | TBD |
| **Version bumps** | TBD |
| **Gates affected** | TBD |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | **before M1** (pyDEDARMS milestone) — the earliest target of this triage |

---

## 1. Problem
The finding is that the extension spec **may still** carry a per-row certification reference. Under
the consumer's DEC-022, a selection-table row cites a catalog entry by its `family_key` and carries no
certification object of its own: certification is the consumer's register (DEC-023), and the SLD
producer has no Revit, runs no placement fixture and holds no allowlist, so it cannot assert what is
placeable. A row carrying its own certification can drift from the entry it names.

## 2. Proposed change
Establish whether the reference is present. If it is, remove it so rows cite by `family_key` only.

## 3. Scope
**In:** the certification reference in the extension spec.
**Out (non-goals):** any other change to the selection table.

## 4. Acceptance criteria
- [x] Whether the reference is present is established and recorded here. *(Absent: Mayo's ruling, 2026-10-13, below.)*
- [x] If present, it is removed under a DEC-049 record written before the change. *(Not present, so nothing to remove and no DEC-049 record.)*

### 📌 2026-10-13 — where the reference is, and is not
- **Not in this folder.** At `9db5ee6`, `claude_sld_generator_system/` has no mention of
  certification, `family_key`, a selection table, or the `selection{}`/`equipment{}`/`placement{}`
  namespaces outside this register (grep over `.md`/`.json`/`.mjs`, `09_tests/` excluded). Git history
  has never held a `sld-topology-v1-extension` file, in the workspace repo or in any of the four
  `_git-backups-2026-10-06` repos.
- **The consumer still says the text exists.** `revit_electrical-content-generator_system/contracts/specs/inbound-diagram.md:142`
  reads: *"The SLD side's text still describes a certification reference on the row; read it as what
  the row carries, not as where certification is decided."* That spec replaced the consumer's old
  `docs/04-contracts/sld-topology-v1-extension.md` (CROSSWALK).
- **The one place left to look can't be reached.** `Barkie721/revit_dedarms_toolkit_system` returns
  404 through `gh`, and DEC-049 says it was renamed.

### ✅ 2026-10-13 — ruled by Mayo: the text no longer exists
Asked to point at the text or rule on it, **Mayo ruled that the SLD-side text no longer carries a
per-row certification reference.** This entry closes with **no change on the SLD side**.

Line 142 of the consumer's spec is now the stale side, and correcting it is the consumer's job. It is a
contract-pack spec, so it goes through that repository's own contract route. Its OQ-113 row records
the ruling and notes that line 142 still disagrees (commit `8014274`). Line 142 itself is unedited.

## 5. Blast radius
TBD — an SLD-side contract change needs a prior milestone-scoped record (DEC-049).

## 6. Verification plan
TBD.

## 7. Risks / open questions
Which document "the extension spec" names on this side is not yet pinned down.

## 8. Alternatives considered
—

## 9. Links
- Triage: `revit_electrical-content-generator_system/logs/open-questions.md` OQ-113 (2026-10-13)
- Consumer rulings: DEC-022, DEC-023, DEC-049 (in `revit_electrical-content-generator_system/decisions/`)
- Related: FU-0018, FU-0019, FU-0020
