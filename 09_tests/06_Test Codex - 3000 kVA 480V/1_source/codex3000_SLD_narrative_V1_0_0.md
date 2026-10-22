# Test Codex — 3,000 kVA, four levels

## User brief

“Create a single line 3000kVA service. All 480V with 3 lighting branches, 2 power and 3 mechanical. 4 levels; figure out the rest. Add step-down transformers only on Level 3 for each branch.”

## Composition

- 3,000 kVA utility service, 480Y/277 V, 3 phase, 4 wire. Utility primary shown as 13.2 kV pending confirmation.
- Calculated service full-load current: 3,000,000 / (sqrt(3) × 480) = 3,608.44 A.
- Preliminary 4,000 A main and bus; LSIG/GFP main, revenue meter and service N–G bond.
- Eight independent 480 V branch risers: lighting A/B/C (250 A each), power A/B (600 A each), mechanical A/B/C (600 A each).
- Each riser serves Levels 1, 2, 3 and 4. Each uses full-rated MLO panelboards/feed-through arrangements, protected by its upstream branch breaker. Verify listed feed-through arrangements and cumulative loads.
- Level 3 has eight separate 480Δ–208Y/120 V step-down taps, one per branch. Each tap is supplied from an internal primary breaker in that branch’s Level 3 480 V panel. Its secondary supplies a local MCB panel on Level 3 only.
- Lighting and mechanical taps: 75 kVA, 125 A primary protection, 250 A secondary MCB per schedule. Power taps: 150 kVA, 250 A primary protection, 500 A secondary MCB per schedule.
- Levels 1, 2 and 4 retain 480Y/277 V; Level 4 continues from each Level 3 480 V panel, independently of the transformer tap.
- One future feeder space per branch bay (eight total), providing equipment expansion space and drawing clearance.
- One normal-power sheet E-501; no emergency system or terminal equipment schedule supplied.

## Assumptions and open engineering inputs

All panel/branch/transformer ratings are preliminary capacity allowances, not calculated load selections. Service capacity is not a claim of connected or demand load. Feeders use the repository’s published tables without project-specific derating or voltage-drop analysis. Typical dry-type transformer impedances are lookup midpoints, not nameplate values. The service-lateral schedule is illustrative and must be reconciled with utility ownership and service-conductor requirements.

Five unresolved engineering items are generated in `OPEN_ITEMS.md`: utility fault current/AIC; utility primary/nameplate impedance; conductor routes and installation; demand loads/MCA/MOCP/coordination; transformer secondary protection and SDS grounding/bonding. They do not prevent producing this coordination drawing, but they prevent release for construction.

This SLD is for design development and coordination. It requires review and seal by a licensed Professional Engineer before construction use.
