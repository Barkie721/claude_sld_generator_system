# FL-0019 — five gate checks assert materially less than their names claim

| Field | Value |
|-------|-------|
| **ID** | FL-0019 |
| **Title** | `runtime_unverified` is an ANY/NONE quantifier · the ".addin well-formed" check never parses XML · T5 matches non-App classes by short name · the resource pin can be shrunk silently · a too-shallow `SLD_ADDIN_ROOT` lab scores 14/14 on the REAL golden |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-31 |
| **Status** | **`fixed`** — all five, mutant-proved; see §4 |
| **Severity** | S3 |
| **Stage** | gate |
| **Component** | `08_validation/sync_gate.mjs:145,421` · `08_validation/build_gate.sh` T5 · `build_gate.sh:70-71` + `DEDARMS.Tests.csproj:91` |
| **Failure class** | silent-skip |
| **Detected by** | Phase 5 verification, lanes A and E |

---

## 1. Symptom

Five distinct false greens, grouped because they share one shape: **the check's NAME over-claims
what its BODY asserts.** Each was reproduced.

**(a) `runtime_unverified` is ANY/NONE, not per-artifact.** `sync_gate.mjs:421` fails only if
(`flagged.length && !docSays`) or (`!flagged.length && docSays`). With two artifacts flagged,
clearing **one** leaves `flagged.length === 1`, `docSays === true` → GREEN, and the `ok` line
*asserts* a consistency it never checked:

```
ok [P1] runtime_unverified … — 1 artifact(s) unverified and the doc says so: addin_dll
SYNC-GATE: 22 passed, 0 failed
```

This is FL-0013's "losing SOME, not all" class, reintroduced in a check written *after* that lesson.
Live risk: a Revit trip that validates only `DEDARMS.dll` invites clearing exactly one flag — and the
satellite, whose absence is invisible at runtime by D2c, silently loses its honesty marker.

**(b) The `.addin` check is named "well-formed" and never parses XML.**
`sync_gate.mjs:145` `check('P1', 'Revit .addin manifests are well-formed and complete', …)`, success
text `:194` "all well-formed". The body is regex-only: double-hyphen-in-comment, comment balance,
root element, required-field presence. An unescaped `&` in element text is **genuinely malformed XML**
(`ElementTree: not well-formed, line 9 col 28`) and passes — the precise silent-non-load class the
check was born from. Same check: `<AddIn Type="Applicaton">` (typo Revit rejects) passes because the
pattern is `\w+`; a duplicate `AddInId` across two blocks passes; the `AddInId` **value** is never
checked, only its format, so changing a GUID the manifests say "MUST NEVER CHANGE" passes.

**(c) T5 validates non-`App` entries by SHORT class name.** `build_gate.sh` computes
`const short = c.split(".").pop()` and searches for `class <short>` anywhere under the project. So
`<FullClassName>DEDARMS.Replay2023.Totally.Wrong.ReplayImportCommand</FullClassName>` passes — a
click-time failure inside Revit, green on the phone.

**(d) The resource pin can be SHRUNK and nothing notices.** T4b asserts DERIVED ⊇ PINNED, which fires
when a *pinned* name stops being derived but never when a *derived* name stops being pinned; the
empty-guard only trips at zero. Dropping `DEDARMS_Icon.png` from the pin **and** renaming that
resource's `LogicalName` — the exact mutant that otherwise goes red — scored `BUILD-GATE 14/14` and
`ok … DEDARMS.dll 1/1 @ d521ad30`. "1/1" reports reduced coverage as success.

**(e) A too-shallow `SLD_ADDIN_ROOT` mutant lab scores 14/14 GREEN against the REAL golden.**
`DEDARMS.Tests.csproj:91` climbs exactly 3 levels. Too deep is loud (`MSB3030`); **too shallow is
silent** — if any ancestor directory holds a `09_tests/`, the climb escapes the lab and the gate
validates the real repo while the operator believes they are testing a mutant:

```
SLD_ADDIN_ROOT=<lab>/13_addin  -> fixtures/hospital_golden.json = 68726e5d (the LAB's, correct)
SLD_ADDIN_ROOT=<lab-shallow>   -> fixtures/hospital_golden.json = 85b57c19 (the REAL repo's)
                               -> BUILD-GATE: 14 passed, 0 failed.  GREEN
```

## 2. Impact

(a), (d) and (e) all corrupt **verification work itself** rather than the product — the most
expensive kind, because they make a future session's evidence worthless without telling it. (e) in
particular means any mutant result from a wrongly-placed lab is a measurement of the real tree; this
verification had to warn its own adversarial lane about it mid-flight, and that lane then proved its
lab depth with a marked golden before trusting a single result.

(b) and (c) are runtime risks in the highest-cost place: a malformed or mis-targeted `.addin` makes
Revit skip the add-in **with no error the user ever sees**, and the symptom is indistinguishable from
a dozen other causes.

None is currently triggered — the shipping artifacts and manifests are correct today.

## 3. Root cause

Common to all five: **the check was written to catch the specific failure that had just happened**,
and its name then generalised beyond the assertion. "well-formed" was born from one real trap (a
double hyphen in an XML comment) and never grew into actual parsing. `runtime_unverified` was written
to stop a flag going stale in *one* place and quantified over "any" because one artifact existed at
the time. The superset relation in (d) was a deliberate, documented choice to keep auto-extension —
correct in intent, but its blind side was never stated.

## 4. Resolution — **ALL FIVE APPLIED, 2026-07-31**

Fixed in the FL's own value order. No shipping assembly was touched, **no sync_gate check NAME
changed** (so gate 14 needed no re-bless — FL-0016's technique), and `EXPECTED_CHECKS` went
**14 → 15** in the same edit as the one added check.

1. **(e) — `build_gate.sh`, new check `T0.6`.** ⚠️ **The prescription above ("resolves under
   `$ADDIN_ROOT`") is NOT IMPLEMENTABLE AS WRITTEN, and the obvious reading of it is a tautology.**
   The golden is not *under* `$ADDIN_ROOT`; it is a sibling, at `dirname($ADDIN_ROOT)/09_tests/…`
   — which is **exactly** where the csproj's three-level climb from `DEDARMS.Tests` lands, since
   that climb is `dirname(dirname($SRC))`. Composing that path and comparing it to what the build
   copied therefore holds **by construction** and can never detect a depth mistake. The first draft
   of this fix did precisely that and was caught before it shipped (§6a).
   **What T0.6 actually asserts** is the relation that *does* have teeth: when `SLD_ADDIN_ROOT` is
   set — i.e. this is a lab — the golden compiled against must **not** be this repo's own. A lab
   that means to borrow it declares `BUILD_GATE_LAB_GOLDEN_OK=1`. The sha of whichever golden was
   used is printed either way, so the reader can see it without inferring it.
2. **(a) — `sync_gate.mjs`, per-artifact in both directions.** The shipping-DLL set is DERIVED
   (anything with `carry_copies`) and asserted a **superset** of the three that exist today, so a
   future assembly is covered automatically while losing one goes red — FL-0013's relation, chosen
   for FL-0013's reason. Each flagged artifact must be named **by its own sha** on a CLAUDE.md line
   that says it has not run in Revit. A non-boolean flag is now its own failure: **absent is not
   cleared, and only one of those is a claim somebody made.**
3. **(b) — a real well-formedness scanner** (~110 lines, in `sync_gate.mjs`). Node ships no XML
   parser and this host is offline, and adding `fast-xml-parser` would put a network dependency
   under a gate deliberately built without one. The scanner validates tag matching and nesting,
   single root, attribute quoting, duplicate attributes, `<` in attribute values, comment/CDATA/PI
   termination, the double-hyphen rule, and **entity correctness — the `&` law this file kept
   breaking silently.** Plus `Type` against the closed set, `AddInId` uniqueness per file, and
   `AddInId` **value** stability against a new manifest pin `revit_addin_ids` (both directions: an
   unpinned add-in and a pinned-but-undeclared one are both red).
   **And pair identity:** each project `.addin` must be byte-identical to its `deploy/` twin.
4. **(c) — T5 resolves the FULL name.** Declared types are composed as `<file namespace>` + `.` +
   `<type name>` across the project, and the `<FullClassName>` must be in that set. Revit resolves
   the string verbatim, so anything less was not the assertion the check name made.
5. **(d) — T4b reports derived-minus-pinned as a WARNING.** Deliberately not a failure: the
   superset relation exists so that ADDING a consumer stays green and is still checked, and failing
   here would take that away. What was missing was never a red — it was **visibility**. The `ok`
   detail also stopped reporting a shrunken pin as `1/1`; it now reads `N pinned of M derived`.

## 5. Regression guard — mutant-proved, 2026-07-31

Eleven mutants, all red-then-restored-green. Labs only: a `SLD_ADDIN_ROOT` tree at `/root/fl19lab`
for source/manifest-file mutants, and **shadow repos** (`build_gate.sh` + `lib/` + `03_contracts/` +
`07_data/`; for sync_gate, copies of `08_validation/ 03_contracts/ 13_addin/` with the rest
symlinked) for the two mutants that must edit `current_state_manifest.json`, which a lab cannot
reach. **No real source or contract was edited to produce any of these.**

| # | Mutant | Old | New |
|---|---|---|---|
| e1 | correct-depth lab, **marked** golden | — | `ok` citing the MARKED sha `67a2e41c`, not `85b57c19` — proof the lab read its own |
| e2 | too-shallow lab inside the repo (climb escapes to the real golden) | 14/14 **GREEN** | **RED**, naming the real golden it escaped to |
| e3 | same, with `BUILD_GATE_LAB_GOLDEN_OK=1` | — | `ok`, annotated *"borrowing the real golden BY DECLARATION"* |
| a1 | clear `runtime_unverified` on **one** of three, leave the prose | **GREEN** (`flagged.length===2`, `docSays`) | **RED**, naming `addin_dll` |
| a2 | delete the never-run prose for the **satellite only** | **GREEN** (other lines still matched) | **RED**, naming `addin_lab_dll` |
| a3 | delete the flag FIELD entirely | **GREEN** (`undefined !== true`) | **RED** — "absent is not cleared" |
| b1 | unescaped `&` in element text | **GREEN** | **RED** with line number |
| b2 | `Type="Applicaton"` | **GREEN** | **RED**, closed set named |
| b3 | duplicate `AddInId` across two blocks | **GREEN** | **RED** ×2 (uniqueness *and* the pin) |
| b4 | a GUID the manifest says MUST NEVER CHANGE, changed | **GREEN** | **RED** |
| b5 | delete an `<AddIn>` block from the project manifest only | **GREEN** | **RED** via pair identity (§6b) |
| b6 | delete it from **both** copies | **GREEN** | **RED** via the pin's undeclared sweep |
| c1 | `<FullClassName>DEDARMS.Replay2023.Totally.Wrong.ReplayImportCommand</FullClassName>` | **GREEN** (A/B-measured against the old short-name logic on the same mutant) | **RED** |
| d1 | drop `DEDARMS_Icon.png` from the pin (the FL's own §1(d) mutant) | `ok … 1/1` | `ok … 4 pinned of 5 derived` **+ a ⚠️ COVERAGE line naming the dropped resource** |

Suite after: **14/14 twice, identical by check name**, 89 named checks (was 88 — the one added is
`T0.6`), `--quick` 6/6, build-gate **15/15**, sync **24/24 · 22/22**, 112 tests, gate 14 green with
**no re-bless**, shipping shas unmoved.

## 6. What the fixing session got WRONG, recorded on purpose

**(a) The first draft of the (e) fix was a tautology — the exact defect this FL is about.** It
composed `dirname($ADDIN_ROOT)/09_tests/…` and compared it to the copied fixture, which is the same
path the csproj climb resolves; the comparison could not fail. It was written, it went green, and
it was only caught by asking *what would have to be true for this to go red*. **A check that
passes on the real tree has proved nothing until it has been made to fail.**

**(b) The (b) fix shipped with FL-0019(a)'s own bug inside it, and its own mutant found it.** The
`revit_addin_ids` sweep was a **union** across all four manifests, so deleting an `<AddIn>` block
from the project copy while its deploy twin still declared it left every pinned name "seen" and
scored GREEN — the only trace being the declaration count sliding 6 → 5 in the detail text. That is
"losing SOME, not all" reappearing *inside the fix for it*, in the same session, by the same author.
Closed by asserting **pair identity**. The lesson is not "be careful": it is that **a union can
never see a per-file loss**, and this repo has now met that shape four times (FL-0011, FL-0013,
FL-0019 a, here).

## 6. Prevention

A check's NAME is read far more often than its body — by future sessions, by handoffs, and by the
register. **Where the name promises a general property and the body tests a specific trap, rename the
check to the trap.** `"the .addin has no double-hyphen comment and carries every required field"` is
less impressive than `"well-formed"` and would not have misled anyone.
