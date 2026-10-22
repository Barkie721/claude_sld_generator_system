# FU-0000 — <one-line title in plain English>

> **Copy this file to start a new entry.** Name it `FU-XXXX_short-slug.md` (next number from
> `update_register_V1_0_0.md`), fill the header table + sections below, delete the `<…>` prompts and
> this quote block, then add the one-row summary to the register.
>
> Sections 3–6 (Scope, Acceptance criteria, Blast radius, Verification) must be filled **before work
> starts**, not written up afterwards. That is the point of the folder.

| Field | Value |
|-------|-------|
| **ID** | FU-XXXX |
| **Title** | <short, specific — "author Revit families for L1-3 and L3-3", not "family work"> |
| **Proposed** | YYYY-MM-DD |
| **Proposed by** | `Mayo` \| `Claude` \| `review` \| `trip finding` |
| **Status** | `proposed` \| `accepted` \| `planned` \| `in-progress` \| `shipped` \| `deferred` \| `rejected` \| `superseded` |
| **Priority** | `P0` \| `P1` \| `P2` \| `P3` (see README) |
| **Effort** | `S` \| `M` \| `L` \| `XL` (see README) |
| **Readiness** | `ready` \| `blocked:windows-revit-box` \| `blocked:EOR` \| `blocked:family-authoring` \| `blocked:FU-XXXX` |
| **Category** | `engine` · `add-in` · `symbols/spec` · `data layer` · `validation/gates` · `docs` · `process` · `deliverables` |
| **Stage** | 1 Intake · 2 Topology · 3 Validate P1+P2 · 4 Layout · 5 Preflight P3 · 6 Render/Revit · or `process`/`gate` |
| **Component** | <file or folder, e.g. `04_renderer/sld_engine.mjs`> |
| **Decision tier** | `Tier 1 autonomous` \| `Tier 2 default+override` \| `Tier 3 EOR-required` (CLAUDE.md §6) |
| **Golden impact** | `golden-inert` \| `golden-visible (re-freeze required)` \| `unknown — must measure` |
| **Schema impact** | `none` \| `additive` \| `breaking (version bump)` |
| **Version bumps** | <which `_V1_0_0` files + every downstream reference, per CLAUDE.md §8 — or `none`> |
| **Gates affected** | <G1 · G5–G9 · sync · parity · behavior · acceptance · conformance · gen-idempotent — or `none`> |
| **Depends on** | <FU-XXXX, FL-XXXX — or `—`> |
| **Blocks** | <FU-XXXX — or `—`> |
| **Target** | `next batch` \| `next Windows trip` \| `backlog` |

---

## 1. Problem
<Why this is worth doing, with evidence. What is currently wrong, missing, slow, or manual — and
what it has already cost. "L2-9 is undefined so busway distribution cannot be drawn at all" beats
"improve symbol coverage".>

## 2. Proposed change
<What to actually build or change. Concrete enough that someone else could start it.>

## 3. Scope
**In:** <what this entry covers>
**Out (non-goals):** <what it deliberately does NOT cover — the most valuable line in the entry.
Unbounded scope is how a one-session change becomes a re-freeze.>

## 4. Acceptance criteria
<Checkable statements, written before work starts. "Done" is when every box is true.>
- [ ] <criterion>
- [ ] <criterion>

## 5. Blast radius
<What else moves. Does the golden re-freeze? Which gates change? Which downstream references need a
version bump (CLAUDE.md §8 — nothing evolves in isolation)? Which of the three topology surfaces or
the two family-map copies must stay in sync? If the answer is genuinely "nothing", say so and say
how you know — `--gate` reporting 0.0000 px is NOT proof for a text or annotation change.>

## 6. Verification plan
<Which gates run BEFORE and which run AFTER, and what result counts as pass. Name them. The
before-and-after discipline exists because several gates in this repo are blind to whole classes of
change — G1 compares only device anchors + route vertices, so a PNG or strip compare is the real
net. State the re-bless recipe if a baseline is expected to move.>

## 7. Risks / open questions
<What could go wrong, what is still unknown, what needs a decision. A Tier 3 item names the EOR
decision it is waiting on.>

## 8. Alternatives considered
<What else was on the table and why it was rejected. Keep this even when the choice seems obvious —
it is what stops the same alternative being re-proposed and re-investigated next session.>

## 9. Links
- Related updates: <FU-XXXX, …>
- Related failures: <FL-XXXX, …>
- Specs / contracts touched: <file §section>
- Memory / session: <memory slug or session date>
