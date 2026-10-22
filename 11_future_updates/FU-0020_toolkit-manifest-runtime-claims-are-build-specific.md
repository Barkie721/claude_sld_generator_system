# FU-0020 — the toolkit manifest's runtime claims are build-specific

| Field | Value |
|-------|-------|
| **ID** | FU-0020 |
| **Title** | Carry the toolkit manifest's runtime-verified claims as historical, build-specific evidence |
| **Proposed** | 2026-10-13 (raised by the 2026-09-16 source review) |
| **Proposed by** | `review` |
| **Owner** | the SLD side — **Mayo's triage of 2026-10-13** |
| **Status** | `accepted` — given an owner and target by Mayo, 2026-10-13. **Informational.** |
| **Priority** | `P3` — informational; by target milestone, Mayo 2026-10-13 |
| **Effort** | TBD |
| **Readiness** | `ready` |
| **Category** | `docs` |
| **Stage** | 6 Render/Revit |
| **Component** | the toolkit manifest's runtime-verification records |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` |
| **Schema impact** | `none` |
| **Version bumps** | none expected |
| **Gates affected** | none expected |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | **informational, at M8** (pyDEDARMS milestone) |

---

## 1. Problem
The toolkit manifest records the current 2025 Core/Lab assemblies as runtime-verified and both current
replay assemblies as unverified. Those claims hold for the builds that were run, not for any later
build. Read as current, they would relabel history as present-day evidence.

## 2. Proposed change
Nothing to build. At M8, read these claims as historical, build-specific evidence, and verify any
changed build on its actual target before accepting that runtime capability.

## 3. Scope
**In:** how the claims are read at M8.
**Out (non-goals):** re-running any assembly in Revit under this entry.

## 4. Acceptance criteria
- [ ] At M8, no runtime capability is accepted for a changed build on the strength of these records alone.

## 5. Blast radius
None — informational.

## 6. Verification plan
None — informational.

## 7. Risks / open questions
—

## 8. Alternatives considered
—

## 9. Links
- Triage: `revit_electrical-content-generator_system/logs/open-questions.md` OQ-113 (2026-10-13)
- Origin: `DEDARMS_Development_Plan.md` §25 Baseline Check (2026-09-16 review)
- Related: FU-0018, FU-0019, FU-0021
