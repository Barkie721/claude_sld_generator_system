# FU-0007 — automated generator feeder sizing (NEC 445.13)

| Field | Value |
|-------|-------|
| **ID** | FU-0007 |
| **Title** | Automate generator feeder sizing per NEC 445.13 — today every field is EOR input |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P3` |
| **Effort** | `L` |
| **Readiness** | `blocked:EOR` |
| **Category** | `data layer` |
| **Component** | `07_data/normalized/`, the composer's Tier framework |
| **Stage** | 2 Topology |
| **Decision tier** | `Tier 3 EOR-required` |
| **Golden impact** | `golden-inert` if it only fills fields the hospital already carries |
| **Schema impact** | `none` expected |
| **Version bumps** | `00_Docs/project_instructions_V1_0_0.md` if the tier assignment changes |
| **Gates affected** | `acceptance`, `conformance` |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | `backlog` |

---

## 1. Problem

Generator feeders have no automated sizing — every field is EOR input, and a generator feeder is
currently a **Tier 3 halt** (`COMPOSITOR_HALT`). Every emergency-power project therefore stops at the
same place and waits for a human to supply numbers that are, for the common cases, a table lookup:
NEC 445.13 requires conductors at not less than 115% of the nameplate current rating.

The composer already does exactly this kind of lookup elsewhere — `nec_motor_fla`,
`nec_standard_ratings`, `feeder_schedule` and `fault_current_calc` are all normalized and consumed.
The generator case is the conspicuous hole.

## 2. Proposed change

Add the 445.13 sizing path as a **Tier 2 default + override**: compute the 115% conductor sizing,
select from `feeder_schedule`, log the default, and let the EOR override. The halt would remain only
for genuinely project-specific inputs.

## 3. Scope

**In:** the 115% conductor sizing rule and its feeder-schedule selection, plus the Tier 2 downgrade
and the logging that goes with it.

**Out (non-goals):**
- **Fire-pump breaker rating (NEC 695.4(B))** — stays Tier 3. Different rule, different rationale, and
  it is one of the §6 non-negotiables.
- Project-specific feeder distances and anything requiring site knowledge. Those stay Tier 3 and no
  amount of table lookup changes that.
- Overriding `DATA_LOOKUP_MISS`: a missing lookup still escalates. **Never fabricate a value.**

## 4. Acceptance criteria

- [ ] Sizing traces to NEC 445.13 and to a normalized data file — no hardcoded ampacities.
- [ ] Applied as a Tier 2 default: logged, visible, and EOR-overridable.
- [ ] A missing lookup still produces `DATA_LOOKUP_MISS` and escalates to Tier 3.
- [ ] The hospital golden's generator feeder is **unchanged** — the automated result must reproduce
      the EOR-supplied value that is already there. That is the single best test available, and if it
      does not reproduce it, the rule is wrong.
- [ ] `project_instructions_V1_0_0.md` §2.3 reflects the new tier assignment.

## 5. Blast radius

Composer behavior, not renderer. The golden is a **verification instrument** here rather than a
constraint: it already contains an EOR-sized generator feeder, so it is a known-answer test.

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 12/12, and record the hospital's existing generator feeder spec.
**After:** the acceptance gate stays green and the recomputed feeder matches the recorded spec exactly.
Negative-test by removing the lookup row and confirming a `DATA_LOOKUP_MISS` escalation rather than a
guessed value.

## 7. Risks / open questions

- **This is Mayo's call as EOR and may well be `rejected`.** Generator sizing is a sealed-drawing
  liability, and "the engineer supplies it" is a legitimate permanent answer. That outcome should be
  recorded here with its reasoning, not left as an open item — a rejected idea without a record gets
  re-proposed.
- 115% is the floor, not the whole rule: derating, ambient correction and paralleled sets can all
  govern. A partial implementation that looks complete is worse than the current halt.

## 8. Alternatives considered

- **Keep it Tier 3** — the status quo and entirely defensible. The cost is a halt on every emergency
  project; the benefit is that no number reaches a sealed drawing without an engineer choosing it.
- **Tier 2 with a mandatory review flag** — a middle path: compute it, but mark the feeder for explicit
  EOR confirmation before seal. Probably the right compromise if this is accepted at all.

## 9. Links

- Related updates: —
- Specs / contracts touched: `00_Docs/project_instructions_V1_0_0.md` §2.3/§2.4, `CLAUDE.md` §6, §11
- Memory / session: 2026-07-25
