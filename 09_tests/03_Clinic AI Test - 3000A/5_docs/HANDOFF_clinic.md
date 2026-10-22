# HANDOFF — clinic (Clinic AI Test — 3000 A)

**Resume here.** State as of run 7, 2026-10-20, engine 1.0.18.

## Where it stands
- `bash run_pipeline.sh` is green end to end: P1+P2 0 errors / 0 warnings (55 rules); P3 0 errors /
  0 warnings (63 rules); 0 drops; render coverage 344/344.
- 5 Tier-3 halts open (`OPEN_ITEMS.md`): feeder distances, utility fault current, load schedule /
  service adequacy, generator breaker + feeder + capacity, generator X″d.
- Every geometry checker reads 0; the one HARD tag clash left is the by-design utility A-4 pennant.

## Engineering decisions worth re-checking first
1. **Service size.** 3000 A on 20,000 SF = 125 VA/SF — several times a typical clinic. Kept as
   stated; flagged in HALT-003.
2. **Generator vs ATS ratings.** 1825 A of ATS ratings on a 1503.5 A generator — needs the load
   study and equipment-branch delayed transfer / load shed (HALT-004).
3. **"225-240 V" and "440 V" panels** were read as 480Y/277V (NOTE-003).
4. **400 A plug / mechanical branches** are drawn as 400 A 480 V panels with internal primary
   breakers, because a 400 A OCPD cannot protect a 112.5 or 75 kVA primary (NEC 450.3(B), NOTE-004).
5. **ATS poles.** 3-pole with solid neutral (gen not separately derived), so no EM-side N-G bond.
   The golden uses 4-pole + EM bond; switch both together if the EOR wants an SDS generator.
6. **Section class.** Only the LS section of E4MSB-1-A carries `nec_class: '700'` — Critical and
   Equipment are NEC 517 branches, not Art. 701/702 systems (NOTE-009).

## Layout lessons (one-storey sheets)
- **Use internal_to breakers for every panel → step-down → panel chain.** That pass draws upward
  cleanly on a one-storey sheet. A feed-through partner of the chain's secondary panel goes in
  `feed_through_panels` (engine 1.0.18, OFF-031), never in a sub-feed.
- Sub-feed children always go **down** (`parentBottom + 120`); on a sheet with no floor anchors that
  is into the switchboard. Use lateral (`feed_left` / `feed_right`) sub-feeds to keep a cascade on
  the parent's row (R-001).
- An internal_to chain draws upward cleanly but nothing can hang off its secondary panel — the
  sub-feed pass has already run (R-001 run 3: 5 drops).
