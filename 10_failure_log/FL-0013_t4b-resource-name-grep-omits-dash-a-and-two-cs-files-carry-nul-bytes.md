# FL-0013 — T4b's resource-name extraction greps without `-a`, and the "only `strip_compare.mjs` has NUL bytes" rule is wrong

| Field | Value |
|-------|-------|
| **ID** | FL-0013 |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `closed` — `-a` applied, and the weak `NRES==0` guard replaced with a manifest-pinned SUPERSET assertion, 2026-07-30. ⚠️ **Item 4 is now WILL-NOT-FIX: the NUL bytes are NOT stray.** All five are deliberate composite-key delimiters (`panelName\0group`, `family\0type`, `ka.join('\0')`) and one is documented in xmldoc. Stripping them would have introduced key collisions in the pulldown cache, the 2023 replayer's symbol resolution, and gate G8. Measured by separation Phase 5c, which set out to do it. **The `-a` rule is therefore permanent, not a workaround** |
| **Severity** | S3 |
| **Stage** | gate |
| **Component** | `08_validation/build_gate.sh:355` (T4b `RESNAMES`); the standing `grep -a` ground rule in `CLAUDE.md`, `HO-0007 §6.6`, and the runbook |
| **Failure class** | latent silent under-coverage — a check whose input set can shrink without going red |
| **Detected by** | line-anchor audit of `RibbonBuilder.cs`, DEDARMS-separation Phase 2 VERIFICATION session (2026-07-30) |

---

## 1. Two facts, and only their combination is the defect

**Fact 1 — the ground rule names the wrong number of files.** Every living doc says, in some
wording, *"always `grep -a`, because `04_renderer/strip_compare.mjs` contains literal NUL bytes and
greps as binary."* Measured 2026-07-30 across the whole repo, **three** text files contain NUL
bytes, not one:

| File | NUL count |
|---|---|
| `04_renderer/strip_compare.mjs` | 2 |
| `05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS.Replay2023/Services/ReplayPreflight.cs` | 2 |
| `05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS/UI/RibbonBuilder.cs` | 1 (offset 2746) |

Both new ones are `.cs` files **inside the add-in Phase 5 is about to restructure**. Demonstration:

```bash
grep  -c "GetExecutingAssembly" …/UI/RibbonBuilder.cs   # → 0, exit 1
grep -ac "GetExecutingAssembly" …/UI/RibbonBuilder.cs   # → 1
```

**Fact 2 — T4b's own extraction omits `-a`.** `build_gate.sh:355`:

```bash
RESNAMES="$(grep -rhoE '"…\.Resources\.…"' --include=*.cs "$SRC/DEDARMS" | tr -d '"' | sort -u)"
```

`$SRC/DEDARMS` contains `RibbonBuilder.cs`. So T4b's list of names-to-verify is built by a grep that
will silently skip a file in its own search root.

## 2. Why it is green today, and why that is luck

All five resource-name literals live in files with **no** NUL bytes — `RibbonRegistry.cs` (3),
`VideoAsset.cs` (1), `CatRainOverlay.cs` (1), `FamilyResolver.cs` (1). Verified both ways this
session: the extraction returns the identical 5 names with and without `-a`.

The exposure is that **the check's coverage is defined by a grep that can silently return less**, and
T4b's vacuous-pass guard does not cover partial loss:

```bash
if [ "$NRES" -eq 0 ]; then bad …   # fires only when ALL names vanish
```

Drop from 5 names to 4 and T4b reports `ok — all 4 hardcoded names present`. It is FL-0010's exact
shape — *a count printed, and a smaller count still reads as success* — one layer further out, in
the code that decides **what to count**.

The realistic trigger is ordinary: `RibbonBuilder.cs` is the ribbon *builder*, sitting beside the
`RibbonRegistry.cs` that holds three of the five icon literals. Phase 5 moving one literal across
that boundary is not exotic.

## 3. Why this repo keeps meeting this

The NUL in `RibbonBuilder.cs` is a single byte in an otherwise plain-ASCII file; nothing
declares it, nothing gates it, and it was found only because a `grep -n` returned nothing while
`sed -n` printed the line. (⚠️ This section originally called it *"a single STRAY byte"*. It is
not stray — see item 4 below, corrected 2026-07-30. The invisibility is real and is the point;
the inference that it was accidental was wrong, and it very nearly cost a shipping defect.) **A grep that returns zero matches is indistinguishable from a grep that
was never allowed to look.** That is the same epistemic hole as FL-0009 (checks that decline to run)
and FL-0010 (lines that decline to parse).

Note also that the verification plan's own §0.4 A5 command and its Tier D greps omit `-a` in places —
the rule is widely stated and inconsistently applied, including by the documents that state it.

## 4. Fix

**APPLIED 2026-07-30 (items 1 and part of 2):**

1. ✅ **One character:** the extraction is now `grep -arhoE`. Verified output-identical — the same 5
   names with and without `-a` — so this is a pure closure of the hole, not a behaviour change. The
   surrounding comment block now states which three files carry NUL bytes and why the `-a` is
   load-bearing rather than decorative.

**STILL OWED:**

2. **Correct the ground rule everywhere else** — `CLAUDE.md`, `HO-0007 §6.6` and the runbook still say
   *"`strip_compare.mjs` has NUL bytes"* as though it were the only one. Should read *"three files do;
   always `-a`, and do not rely on the list staying at three."*
3. **Strengthen the guard**: T4b should assert the extracted count against a floor, or better,
   cross-check that every `GetManifestResourceStream(...)` call site in the tree resolved to a
   literal it extracted. `NRES -eq 0` is too weak — the failure mode is losing *some*, not all.
4. ~~Consider stripping the stray NUL from `RibbonBuilder.cs` and `ReplayPreflight.cs` outright.~~
   ❌ **WILL NOT FIX — THE PREMISE WAS WRONG. Closed 2026-07-30 by separation Phase 5c, which set
   out to do it and measured first.**

   **Not one of these NUL bytes is stray. All five are deliberate composite-key delimiters**, and
   the reason they are hard to see is exactly the reason they were chosen: a NUL cannot occur in
   any of the strings being joined, so it is an unambiguous separator.

   | Site | Code | What it keys |
   |---|---|---|
   | `RibbonBuilder.cs:79` | `var key = panelName + "\0" + group;` | the shared-pulldown cache |
   | `ReplayPreflight.cs:61` | `return family + "\0" + type;` | `SymbolKey` — family/type symbol resolution in the 2023 replayer |
   | `strip_compare.mjs:106` | `ka.join('\0') !== kb.join('\0')` | gate **G8**'s key-ORDER comparison |

   `ReplayPreflight.cs:30` even **documents** it in xmldoc: *"Key: `family\0type`. Value: the
   resolved symbol."* — so one of the two "stray" bytes was described in the file that carries it.

   **Stripping them would have introduced real collision bugs**, not tidied anything: with the
   delimiter gone, panel `"AB"` + group `""` and panel `"A"` + group `"B"` produce the same cache
   key, and the same class of collision reaches `SymbolKey` on the Revit 2023 side. Concatenating
   with a space instead would merely move the collision to names containing spaces, which panel and
   family names routinely do.

   ⚠️ **This item read as cheap cleanup for two revisions and would have shipped a defect into a
   blessed assembly.** It survived only because Phase 5c re-derived the bytes before editing them,
   per the standing rule. **The `-a` ground rule in item 1 is therefore PERMANENT, not a workaround
   for an accident** — these files contain NUL bytes by design and always will, and any future
   "let us clean these up" should be answered with this table.

## 5. Related

- **FL-0010** — count printed but never asserted. This is the same defect applied to the *input* of a
  check rather than its output.
- **FL-0011** — the other under-accounting defect in `build_gate.sh`, same session.
- HO-0007 §6 trap 6 — the `grep -a` rule this entry corrects.

---

## 6. ITEMS 2 AND 3 CLOSED — 2026-07-30

**Item 3 — the weak guard.** `NRES -eq 0` only ever fired when *all* names vanished; the realistic
failure is losing **some**, and 4-of-5 read as `ok — all 4 hardcoded names present`. T4b now also
asserts the derived set against a new manifest pin,
`artifacts.addin_dll.hardcoded_resource_names`, as a **SUPERSET — deliberately not equality**:

- a pinned name that stops being derived → **RED**, which is this entry's failure mode;
- a **new** consumer → still green, and still verified, so the auto-extension property that made the
  derivation worth having survives;
- only a deliberate **removal** requires editing the contract, which is the one case that should.

Same coverage relation decision D4a chose for the drift surfaces.

**Mutant, on the exact shape §2 describes** — one literal made undetectable by the grep
(`"DEDARMS.Resources." + "Cat1.png"`, an ordinary-looking refactor):

```
  FAIL  [T4b] … 1 PINNED resource name(s) are no longer DERIVED from the C# sources:
              DEDARMS.Resources.Cat1.png — the extraction shrank without going red, which is
              exactly FL-0013. … Do NOT re-pin to get green
```

Before the fix, that same mutant produced `ok — all 4 hardcoded names present`.

**Item 2 — the ground rule.** Corrected in `00_Docs/repo_runbook_V1_0_0.md` (both the `grep -a` rule
and the `known_issues` line) and in `FL-0004`. All now name **three** files and say the rule is `-a`
**unconditionally**, not "`-a` when you think you are near a listed file". The consumed handoffs
(HO-0001/0006/0007) were left alone; HO-0008 §8 already records the correction.

**The list was re-measured rather than copied** — this entry's own lesson applied to itself. Still
exactly three files, same three, same NUL counts (2 / 1 / 2).

**Item 4 is CLOSED as WILL-NOT-FIX (2026-07-30).** The NUL bytes are deliberate delimiters, not strays; see §4 item 4 for the evidence and for why stripping them would have been a defect rather than a cleanup.