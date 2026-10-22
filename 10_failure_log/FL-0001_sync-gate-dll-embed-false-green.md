# FL-0001 — sync_gate's DLL-embed check tested containment, not identity, and sat green on a stale DLL

| Field | Value |
|-------|-------|
| **ID** | FL-0001 |
| **Title** | sync_gate P1 "carried DLL embeds the CURRENT family map" reported green while the DLL embedded the *previous* map |
| **Opened** | 2026-07-25 |
| **Closed** | 2026-07-25 |
| **Status** | `fixed` |
| **Severity** | `S2` |
| **Stage** | `gate` |
| **Component** | `08_validation/sync_gate.mjs` (phase 1) |
| **Failure class** | `other` — gate blind spot (not one of the CLAUDE.md §9 renderer classes) |
| **Detected by** | `ESCAPED` — surfaced by a manual documentation audit, not by any gate |

---

## 1. Symptom

`sync_gate.mjs` printed:

```
ok    [P1] carried DLL embeds the CURRENT family map — current map bytes embedded
```

while the shipping DLL did **not** embed the current family map. Extracting the .NET manifest
resource from `bin/Release/DEDARMS.dll` and hashing it:

```
embedded map sha256: 87525ed6…  (35,106 bytes)
on-disk family map:  df7cfc4f…  (34,174 bytes)
current map embedded verbatim? NO
```

The manifest (`03_contracts/current_state_manifest.json`) had recorded the correct state all along —
`addin_dll.note` said *"STALE PENDING REBUILD … embeds the PREVIOUS family-map bytes (87525ed6)"* —
so the gate and the machine-truth file disagreed, and the gate was the one that was wrong.

The check was live and green through the entire V1_0_0 baseline reset (2026-07-24), during which
sync_gate was repeatedly cited as 15/15 green.

## 2. Impact

Two distinct harms, the second worse than the first:

1. **The lockstep guard was absent while appearing present.** The family map must stay byte-identical
   across its two copies *and* the DLL that embeds it. Phase 1 enforced the two copies correctly, but
   the DLL leg was unenforced. Any rebuild-forgotten or map-changed-without-rebuild drift would have
   passed silently, and the failure mode it protects against — the add-in resolving families from the
   wrong map at runtime on the Revit box — is exactly the kind that costs a whole Windows trip.

2. **The false green corrupted a correct record.** An earlier 2026-07-25 docs-audit session, treating
   the gate as authoritative, "fixed" `05_revit/DEADARMS ADDIN/CLAUDE.md` line 177 by changing the
   embedded-map sha from `87525ed6…` to `df7cfc4f…` — **overwriting the right value with the wrong
   one.** The only living-doc record of what the shipping DLL embeds was thereby made wrong, and it
   then contradicted the manifest. A lying gate does not merely fail to catch drift; it actively
   manufactures it downstream.

No wrong drawing shipped and no NEC non-negotiable (CLAUDE.md §6) was touched — hence S2, not S1.

## 3. Root cause

**The check tested containment, not identity.**

```js
const map = rd(M.artifacts.family_map.copies[0]);
const i = map.indexOf('coverage_summary');   // distinctive block
const tok = map.slice(i, i + 140);
if (!rd(dllPath).includes(tok)) return { detail: 'CURRENT map bytes NOT embedded …' };
return { ok: true, detail: 'current map bytes embedded' };
```

It took a 140-byte window of the *current* map starting at the `coverage_summary` token and asked
whether the DLL contained that substring anywhere. The premise was that `coverage_summary` is a
"distinctive block" — but distinctive is not the same as **volatile**. That block
(`"mapped": 20, "placeholder_family_exists": 3, …`) was byte-identical in both the old and the new
map, because the change between them was the addition of per-family placement fields, which never
touches the coverage counters.

So the probe could not discriminate. Verified directly: the 140-byte token *is* present in the old
embedded blob, which is why the check passed on a stale DLL.

The generalizable defect: **a containment test can only ever prove a lower bound.** It answers "does
B appear somewhere in A", never "is A's copy of B the current one". Any guard whose job is lockstep
must compare identities — full bytes or a full hash.

## 4. Resolution

`08_validation/sync_gate.mjs` phase 1: the single probe was replaced by an extract-and-hash helper
plus **two** assertions, and a new manifest field to anchor them.

- New `extractEmbeddedMapSha(dllBuf)` — locates the map by its `"$schema": "revit_family_map/` token,
  walks back to the opening brace, reads the 4-byte little-endian .NET resource length prefix, slices
  the blob, and **JSON-parses it as an integrity check** before hashing. Every failure path returns a
  FAIL; a check that cannot see the bytes must never report success, which is precisely how the
  original went wrong.
- New manifest field `artifacts.addin_dll.embeds_map_sha256` (+ `embeds_map_short`,
  `embeds_map_note`, `stale_pending_rebuild`) — the map sha the DLL *actually* embeds.
- **Assertion 1 (honesty)** — sha extracted live from the DLL must equal `embeds_map_sha256`. Proves
  the recorded value is not a guess.
- **Assertion 2 (lockstep)** — `embeds_map_sha256` must equal `family_map.sha256`. Waived to a loud
  `KNOWN-STALE (declared)` pass **only** while `stale_pending_rebuild` is `true`; an undeclared
  mismatch is a hard FAIL. Leaving the flag `true` once genuinely in lockstep is *also* a FAIL, so it
  cannot be forgotten at re-bless time.

This keeps today's real staleness *declared and visible* rather than invisible, without the gate
crying wolf about a condition the manifest already records.

Files changed:
- `08_validation/sync_gate.mjs` — probe → helper + 2 checks (suite 15 → **16 checks**)
- `03_contracts/current_state_manifest.json` — 4 new `addin_dll` fields
- `05_revit/DEADARMS ADDIN/CLAUDE.md` — line 177 embedded-map sha corrected back to `87525ed6…`
  (undoing the harm in §2.2) + rebuild/re-bless instructions
- `00_Docs/repo_runbook_V1_0_0.md` §1a — the incident and the new gate behavior
- `04_renderer/README_engine.md` — 15 → 16 checks

## 5. Regression guard

**`sync_gate.mjs` P1 assertion 2 — "DLL embed == current family map (map↔DLL lockstep)".** Undeclared
drift between the DLL's embedded map and the on-disk map is now a hard FAIL naming both shas. Wired
into `run_all_gates.sh` in both full and `--quick` modes, so it runs on every suite invocation.

**Mutant-proved** (2026-07-25, manifest restored byte-identical afterward):

| Mutation | Result |
|----------|--------|
| `stale_pending_rebuild` → `false` | **FAIL** — `UNDECLARED DRIFT: DLL embeds 87525ed6 but map is df7cfc4f` |
| `embeds_map_sha256` set to the current map sha (i.e. re-asserting the original lie) | **FAIL** — `DLL embeds 87525ed6 but manifest records df7cfc4f` |
| `embeds_map_sha256` deleted | **FAIL** — both checks report the missing field |

The second mutation is the decisive one: it reproduces the exact false claim the old probe passed,
and the new guard fails it.

Companion guard, assertion 1 (honesty), closes the follow-on hole — a rebuild that updates the DLL
but not `embeds_map_sha256` now fails immediately, so the manifest cannot drift from the artifact it
describes.

## 6. Detection gap

**Why every gate stayed green.** The DLL-embed check was the *only* gate covering this surface —
nothing else in the 12-gate suite reads the add-in DLL at all. G1/parity/behavior/G5–G9 are engine,
geometry and render gates; the DLL is downstream of all of them and is never exercised on this phone
(no Revit). So the single check was both the only net and a broken one, with no redundancy to catch
its failure.

Worse, the check was **self-confirming in the wrong direction**: its pass message
(`current map bytes embedded`) asserted a stronger claim than its logic tested, so reading the output
reinforced the false belief. The 2026-07-25 session that overwrote add-in `CLAUDE.md` did exactly
that.

**Lessons taken:**
- Treat every *"does artifact A contain artifact B"* check in this repo as suspect until shown to be
  an identity comparison. Containment proves a lower bound, never currency.
- A check's **pass string must not claim more than its predicate proves.** `'current map bytes
  embedded'` was a lie the code never verified; `'87525ed6 (35106 B) == manifest'` now states exactly
  what was compared.
- When a gate and the manifest disagree, **the manifest wins** (runbook §1) — and the gate is the
  suspect, not the file. This incident is the precedent.
- A sole-coverage gate deserves a mutant probe *when written*, not after it fails. Every one of the
  other 15 sync_gate checks was mutant-probed at authoring time; this one apparently was not.

## 7. Links

- Related failures: — (first entry)
- Specs / contracts touched: `03_contracts/current_state_manifest.json` (`artifacts.addin_dll`);
  `00_Docs/repo_runbook_V1_0_0.md` §1a, §5 (DLL embed-extraction recipe), §9a step 2
- Gates involved: sync-gate (phase 1) — suite 15 → 16 checks
- Follow-up: **CLOSED 2026-07-25** — the DLL was rebuilt, `sha256` + `short` + `embeds_map_sha256`
  re-blessed and `stale_pending_rebuild` set to `false`; assertion 2 flipped from
  `KNOWN-STALE (declared)` to `in lockstep`, so the guard now proves identity with no waiver in play.
  The rebuild also proved the point of this entry a second time: sync_gate P5 caught the add-in
  `CLAUDE.md` sha anchor that the re-bless had missed.
- Memory / session: `sld-v1-baseline-reset-2026-07-24` (2026-07-25 docs-audit + runbook session)
