# FL-0023 — a prose-located anchor must also be UNIQUE, and a sha mentioned in passing must not speak for its artifact

| Field | Value |
|-------|-------|
| **ID** | FL-0023 |
| **Found** | 2026-07-31, by the HO-0018 cold review of separation Phase 6 |
| **Component** | gate (`08_validation/sync_gate.mjs`) + docs (`13_addin/CLAUDE.md`) |
| **Severity** | **S2** — three checks passed on states they exist to forbid; no shipping assembly affected |
| **Status** | **fixed** 2026-07-31, all three, mutant-proved |
| **Class** | true-by-construction / false green. **The sixth in this repo.** Direct descendant of FL-0022, which narrowed this shape without closing it |

---

## 1. What happened

Phase 6 split an 84 KB `13_addin/CLAUDE.md` into an 11 KB hub plus six documents. It correctly
identified that **four `sync_gate` checks read that path**, wrote a banner explaining them, and
mutant-proved all four. FL-0022 records the defect it created and fixed in that banner.

The cold review asked a different question of the same four checks — *not* "does the banner satisfy
them" but **"what would have to be true for each to go RED?"** — and three of them turned out to
accept states they exist to forbid.

**All three were live at a clean 24/24.** None was introduced by Phase 6; Phase 6 moved ~73 KB of
prose across them and the third one it created outright.

---

## 2. The three defects

### (a) `String.match` takes the FIRST hit, so an earlier restatement SHADOWS the ledger

Both P5 anchor checks read:

```js
rdText(ADDIN_CLAUDE_MD).match(/Current shipping DLL sha256: `([0-9a-f]+)…?`/)
```

`.match()` without `/g` returns **one** match — the first in the file. The hub is 86 lines and the
ledger sits at `:55`. Anything earlier that restates the anchor wins.

**Reproduced.** Insert a "quick summary for the trip" near the top carrying the **correct** shas, then
rot the real ledger lines to `d521ad30` / `bffcd1c8`:

```
ok    [P5] add-in CLAUDE.md "Current shipping DLL sha256" == manifest — be6ae51a
ok    [P5] add-in CLAUDE.md "Current shipping Replay2023 DLL sha256" == manifest — 1a3b7ead
SYNC-GATE: 24 passed, 0 failed.
```

The two shas a human then reads off the ledger exist **on disk nowhere**. That check's own comment
says the line it guards *"is the only human-readable record of WHICH file to carry to the Revit
box"* — so this is a wrong-DLL-carried-to-the-box state passing 24/24, on the eve of the trip that
is the critical path.

> ⚠️ **The shadowing site was already in the file, pre-loaded.** Hub `:39-40` are the FL-0022 banner
> rows that *document* these two anchors, 16 lines above the ledger. They are inert today only
> because their backticks are backslash-escaped and the payload is the literal `<sha>`. **Un-escape
> one and paste the current sha — the single most natural edit anyone would make to that banner —
> and the shadow is live.** FL-0022's rule ("shas in the ledger, artifact names in the prose") was
> holding this shut by convention alone.

### (b) An INCIDENTAL mention let Core's line speak for the Lab satellite

The honesty check selects candidate lines with `lines.filter(l => l.includes(short))` and then asks
whether **any** of them carries a never-run phrase. Core's ledger line names the Lab's sha in passing
— *"`DEDARMS.Lab.dll` moved with it (`43805105` → `2e86b97d`)"* — and also carries Core's own
`HAS NEVER RUN INSIDE REVIT`. So **Core's line satisfied the Lab's predicate by itself.**

**Reproduced.** Replace the Lab's *own* sentence with a false verification claim, touch nothing else:

```
$ grep -c "Has never run inside Revit" 13_addin/CLAUDE.md
0
ok [P1] runtime_unverified flag agrees with the add-in CLAUDE.md prose — 3 shipping DLL(s) agree
        with the doc individually: addin_lab_dll unverified (2e86b97d) · …
SYNC-GATE: 24 passed, 0 failed.
```

The doc now claims the Lab was verified in Revit; the manifest still flags it unverified; the check
prints "agrees". **By decision D2c a missing satellite is invisible at runtime**, which is why that
check's own comment calls this *"the one whose honesty marker matters most"* — and it is the one the
aliasing hit.

**The same bug fires in the opposite direction as a FALSE RED on a correct change-set.** When the
owed trip verifies only the Lab and its prose is honestly updated, the check finds Core's line,
believes the doc still warns about the Lab, and fails — and its printed remedy ("clear the prose in
the same change-set") is impossible without also lying about Core. **This one would have fired
mid-trip.**

> **Proximity is NOT the fix, and measuring it is what proves that.** On the Lab's *legitimate* line
> the sha is **612 characters** from its phrase; on the *shadowing* line it is **546**. The
> illegitimate line is closer. Any distance threshold gets this exactly backwards.

### (c) `13_addin/docs/` was completely ungated

`sync_gate.mjs` contains **zero** occurrences of `docs/`. No validator anywhere read a file under
`13_addin/docs/`.

```
all six 13_addin/docs/*.md TRUNCATED TO 0 BYTES  → SYNC-GATE: 24 passed, 0 failed.
13_addin/docs/ DIRECTORY DELETED ENTIRELY       → SYNC-GATE: 24 passed, 0 failed.
```

Phase 6 moved ~73 KB out of a path-pinned file into a directory nothing pinned. M6 proved the
**hub's** path is pinned; nothing pinned the six documents it delegates to. The hub cites
`docs/feature_replay.md` for the carry rules whose breach **has cost two trips** — an unenforced
citation into an unenforced file.

Stated fairly: the pre-split 84 KB body was equally uninspected *by content*. What the split lost is
the **file-exists pin those bytes used to inherit** by living inside a pinned path.

---

## 3. The fix

All three fixed by **widening checks in place** — the FL-0016 shape, so **no check name moved and no
gate-14 re-bless was needed.** 89 names still identical.

- **(a)** `matchAll` + **every** anchor must equal the manifest. Restating the sha stays legal;
  disagreeing does not. Chosen over "require exactly one match" so honest restatement is not banned.
- **(b)** **Ownership, not proximity:** on a line carrying several tracked shas, the never-run claim
  belongs to the **nearest** one. Core's line still speaks for Core (distance 14 vs the Lab's 546);
  it no longer speaks for the Lab. The Lab's own line (612, but sole sha on the line) still counts.
- **(c)** The `ADDIN_ROOT` check now asserts the hub's index resolves: the doc set is **derived from
  the hub's own links** (so a seventh document is covered the day it is linked) and asserted to be a
  **superset of the six that exist today** — the FL-0013 relation. Each must exist and exceed 512 B.

### Mutant-proved, both directions

| State | Before | After |
|---|---|---|
| decoy anchor (correct sha) + rotted ledger | 24/24 ✅ | **22/24 RED**, both anchors named |
| Lab's own never-run line falsified | 24/24 ✅ | **23/24 RED**, names `addin_lab_dll` |
| six `docs/*.md` truncated to 0 B | 24/24 ✅ | **23/24 RED** |
| `13_addin/docs/` deleted | 24/24 ✅ | **23/24 RED** |
| hub index link rotted to a typo | 24/24 ✅ | **23/24 RED** |
| **Lab trip-verified, flag cleared, prose honest** | **FALSE RED** ❌ | **24/24 green** ✅ |
| unmutated repo | 24/24 | **24/24** |
| the six original `mutants.sh` mutants (M1–M6) | all RED | **all still RED** |

---

## 4. 🚩 The process finding: mutant M3's control arm was dead, so (b) was never tested

`mutants.sh` M3 is labelled *"addin_lab_dll loses BOTH satisfying lines (**addin_dll left green**)"*.
It holds Core green by rewriting `HAS NEVER RUN INSIDE REVIT` → `never ran in Revit`. But the
predicate is

```js
/(never run|never been (loaded|run)|not yet run|has not run|not .{0,12}run inside revit)/i
```

and **`"never ran"` matches none of those.** Replayed verbatim, M3 fails naming **both**
`addin_lab_dll` **and** `addin_dll`. HO-0017 §3 records it as "RED naming `addin_lab_dll`" — true,
but incomplete, and the incompleteness is the whole point: **the isolation it advertised never held,
so the case where the Lab loses its own line while Core keeps its — defect (b) — was never
exercised.**

> **A mutant whose control arm also dies proves nothing about the variable.** Assert what stayed
> GREEN, not only what went red. Six mutants all going red read as six independent proofs; one of
> them was measuring nothing.

---

## 5. The lesson

FL-0022 said: *documentation of a check must never be able to satisfy it.* True, and not enough.

> **A prose-located anchor must also be UNIQUE, and a claim must be attributable to the artifact it
> is about.** `match` where you meant `matchAll`; `includes` where you meant "belongs to". Both read
> as "the doc says so" and neither asks **which line** or **about what**.

The durable technique this repo already chose — locate anchors by prose, never by line
(`dedarms_separation_decisions_V1_0_0.md`, the four-times-restated line-number block) — is right, and
**it has a second half nobody had written down: the prose you locate by must occur once.**

**Ask of every new check: not "can I make it go red?" but "can I construct a WRONG state it accepts?"**
All six of Phase 6's mutants went red, and three of the four checks were still broken.

---

## Related

[[FL-0022]] (this shape, narrowed but not closed) · [[FL-0019]] (e) true-by-construction ·
[[FL-0016]] widen-in-place, no re-bless · [[FL-0013]] derived-set-superset-of-FLOOR ·
[[FL-0010]] / [[FL-0011]] vacuous pass · [[HO-0018]] the review · [[HO-0017]] Phase 6
