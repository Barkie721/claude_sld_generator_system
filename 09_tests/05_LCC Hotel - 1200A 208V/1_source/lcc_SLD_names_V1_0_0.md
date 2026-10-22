# LCC Hotel — name and topology inventory (from the marked-up SLD snippet)

> Status: **intake, step 1 of the recreate.** Source is a scanned, red-lined snippet of an existing
> single line, not a narrative. This file is the authoritative list of names and parent→child links
> the topology build will use. Items marked **?** are read with low confidence and are held as open
> questions (§5) until the EOR confirms them. Nothing here is built yet.

## 1. Source equipment

| Item | Read from drawing |
|---|---|
| Name | HOTEL SWITCHGEAR (red-highlighted on the markup) |
| System | 120/208 V, 3 Ø, 4 W (4 W assumed — 120 V implies a neutral) |
| Bus | 1200 A |
| Main | 1200/3 breaker, fed from below (utility/transformer upstream is off-snippet) |
| Feeder breakers | 6 (listed left → right in §2) |

## 2. Switchgear feeder breakers (left → right)

| # | Breaker | Load | Load rating | Feeder tag |
|---|---|---|---|---|
| 1 | 100/3 | UPS | — | 15 |
| 2 | 450/3 | PANEL P1 | 450 A | 4 |
| 3 | 450/3 | PANEL P2 | 450 A | 4 |
| 4 | 225/3 | PANEL P1AA | 225 A | 5 |
| 5 | 450/3 | PANEL P3 | 450 A | 4 |
| 6 | 450/3 | PANEL P4 | 450 A | 4 |

Connected feeder breakers sum to 2,025 A on a 1,200 A bus (normal diversity, noted only).

## 3. Full name list (24 nodes as drawn, + 1 red-line add)

| Node | Type | Rating / phase | Parent | Feeder tag | Level from SWGR | Notes |
|---|---|---|---|---|---|---|
| HOTEL SWITCHGEAR | Switchgear | 1200 A, 120/208 V 3 Ø | (service — off-snippet) | — | 0 | |
| UPS | UPS | 100 A breaker | HOTEL SWITCHGEAR | 15 | 1 | No downstream shown |
| P1 | Panel | 450 A | HOTEL SWITCHGEAR | 4 | 1 | Feeds six 90 A panels (tag 13) |
| P1A | Panel | 90 A | P1 | 13 | 2 | |
| P1B | Panel | 90 A | P1 | 13 | 2 | |
| P1C | Panel | 90 A | P1 | 13 | 2 | |
| P1D | Panel | 90 A | P1 | 13 | 2 | First letter overmarked red — read as P1D **?** |
| P1E | Panel | 90 A | P1 | 13 | 2 | |
| P1F | Panel | 90 A | P1 | 13 | 2 | |
| **P1G** | Panel | — | P1 | 13 **?** | 2 | **Red-line ADD**, boxed in red, red feeder down to P1 |
| P2 | Panel | 450 A | HOTEL SWITCHGEAR | 4 | 1 | |
| P4 (upper) | Panel | — | P2 | 16 | 2 | **Name clash** with the switchgear-fed P4 — see Q1 |
| P4AA | Panel | — | P4 (upper) | 17 | 3 | |
| P1AA | Panel | 225 A | HOTEL SWITCHGEAR | 5 | 1 | Red handwritten note below box, reads "tonight"/"tarlight" **?** |
| P2A | Panel | — | P1AA | 19 | 2 | Fed from P1AA, not from P2 (as drawn) |
| P3 | Panel | 450 A | HOTEL SWITCHGEAR | 4 | 1 | Four feeders up and right |
| P3A | Panel | — | P3 | 18 | 2 | |
| P3B | Panel | — | P3 | 19 | 2 | |
| LIGHT. | Panel (lighting) | — | P3B **?** | 20 | 3 | Tied to P3B by a bottom link; direction not shown |
| S1 | Panel | 1 Ø (red-line "1PH") | P3 | 19 | 2 | "1PH" is a red-line add |
| P4-8 | Panel | 1 Ø ("1PH" printed) | P3 | 21 | 2 | **Red slash through box + red squiggle on its feeder** — delete? see Q4 |
| P4 (right) | Panel | 450 A | HOTEL SWITCHGEAR | 4 | 1 | |
| P4A | Panel | 100 A | P4 (right) | 14 | 2 | |
| P4B | Panel | 100 A | P4 (right) | 14 | 2 | |

## 4. Tree (as drawn, red-lines applied provisionally)

```
HOTEL SWITCHGEAR  1200A 120/208V 3PH  (MCB 1200/3)
├─ 100/3 ─[15]─ UPS
├─ 450/3 ─[4]── P1 450A
│               ├─[13]─ P1A 90A
│               ├─[13]─ P1B 90A
│               ├─[13]─ P1C 90A
│               ├─[13]─ P1D 90A
│               ├─[13]─ P1E 90A
│               ├─[13]─ P1F 90A
│               └─[13?]─ P1G          (red-line add)
├─ 450/3 ─[4]── P2 450A
│               └─[16]─ P4 (upper)    (name clash)
│                       └─[17]─ P4AA
├─ 225/3 ─[5]── P1AA 225A
│               └─[19]─ P2A
├─ 450/3 ─[4]── P3 450A
│               ├─[18]─ P3A
│               ├─[19]─ P3B
│               │       └─[20]─ LIGHT.
│               ├─[19]─ S1 1PH        (red-line 1PH)
│               └─[21]─ P4-8 1PH      (red-line struck?)
└─ 450/3 ─[4]── P4 450A
                ├─[14]─ P4A 100A
                └─[14]─ P4B 100A
```

## 5. Open questions (block the topology build)

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Two panels are named **P4** (the one under P2 and the 450 A one off the switchgear). What is the upper one's real name? | Rename upper to `P4-U` (placeholder) |
| Q2 | P1G: is its feeder tag 13 like the other P1 subpanels, and what rating? | Tag 13, 90 A |
| Q3 | Red marks over each "PANEL"/name: field-verification ticks, or corrections? | Ticks, no rename |
| Q4 | P4-8: red slash + squiggle = delete, or relocate (red line runs off to the right)? | Delete |
| Q5 | LIGHT.: fed from P3B (tag 20), or P3B fed from LIGHT.? Is there a transformer in tag 20? | P3B → LIGHT., no transformer |
| Q6 | Red note under P1AA ("tonight"?) — meaning? | Ignore |
| Q7 | Upstream of the 1200 A main: utility transformer kVA (only mandatory intake item)? | 1200 A × 208 V × √3 ≈ 432 kVA → 500 kVA |
| Q8 | "LCC" — project name for the folder/title block? | `LCC Hotel` |
| Q9 | Ratings missing for P3A, P3B, LIGHT., S1, P4 (upper), P4AA, P2A — leave blank or default? | Tier-3 halt (OPEN_ITEMS) |
| Q10 | Is HOTEL SWITCHGEAR the service entrance, or fed from an upstream building switchboard? The composer's "GFP on mains ≥1000 A" rule cites NEC 230.95, which applies only to solidly grounded wye services **>150 V to ground**; 208Y/120 V is 120 V to ground, so 230.95 does not require GFP here. | Treat as service; flag the GFP rule as a Tier-3 conflict rather than force an L1-1 GFP |
