# FL-0025 — The hub told the Revit trip to build from a folder that exists in neither repo

| Field | Value |
|-------|-------|
| **ID** | FL-0025 |
| **Title** | `CLAUDE.md §10` carried `Revit Addins/DEDARMS/` as the build root and `Revit Addins/DEDARMS/deploy/install_dedarms.ps1` as the deploy command — a path that has not existed in **either** repo since Phase 7b — plus a `.cs` breakdown the two repos disagreed on |
| **Opened** | 2026-08-02 |
| **Closed** | 2026-08-02 |
| **Status** | `fixed` |
| **Severity** | `S4` |
| **Stage** | `process` |
| **Component** | `CLAUDE.md` (§10 add-in bullet, `:380`/`:384`; §Component table `:105`) |
| **Failure class** | `other` — stale cross-repo instruction (the Phase 7b/8 move class) |
| **Detected by** | **ESCAPED** — the 2026-08-02 staleness audit (`00_Docs/staleness_audit_2026-08-02.md` §4.1 / §7 E1+E2), two moves after the move that broke it |

---

## 1. Symptom

**Two sites, and the first is the one a person actually executes.**

**B1/E2 — dead runnable instructions (`:380`, `:384`).** The add-in bullet said:

- **Build:** `dotnet build -c Release` from **`Revit Addins/DEDARMS/`** (and `Revit Addins/DEDARMS.Lab/`)
- **Deploy with** **`Revit Addins/DEDARMS/deploy/install_dedarms.ps1`**

`find` over **both** trees returns nothing for `Revit Addins`. Live is
`DEDARMS Revit Toolkit/src/DEDARMS/` and `src/DEDARMS.Lab/`, and the installer sits at that repo's
**top-level `deploy/`** — `src/DEDARMS/deploy/` does not exist either, so the deploy line was wrong
in *both* halves, not just its prefix.

**E1 — a breakdown the two repos disagreed on (`:105`).** Said the feature folders held
**25/36/7/1** of **69** `.cs`, and that Lab had **5** files. Measured 2026-08-02:

| | Core | Sld | Electrical | Reports | **DEDARMS** | Lab | src+tests |
|---|---|---|---|---|---|---|---|
| said | 25 | 36 | 7 | 1 | **69** | 5 | 100 |
| **live** | **27** | **37** | 7 | 1 | **72** | **6** | **100** |

🚩 **The trap in that one line: the total was CORRECT and the breakdown was WRONG.** *"**100** source
`.cs` files excluding `obj/`+`bin/`"* still measures exactly 100. **A half-current sentence is why
this survived** — every cheap check of it passed. The toolkit's own `CLAUDE.md:78` says **72** and
has been right the whole time; **this repo was the stale side of the disagreement.**

## 2. Impact

**Nothing shipped wrong. No sha, DLL, gate or test count was ever affected**, and this repo has
recorded no shipping DLL sha at all since Phase 7b.

The blast radius is **the Revit trip** — the one activity whose whole point is running these
instructions on a Windows box with no phone to check them against, and the reason this was worth a
change-set now rather than at the next audit. A reader who starts at `CLAUDE.md §10` cannot build and
cannot deploy; the first command fails and the recovery path is to guess.

**S4** by the register's scale (*"a dangling pointer, a stale count, a misleading instruction"*).
Correct by class, and it understates the timing — see FL-0004 (toolkit) §2 for the same argument on
the same day.

⚠️ **One mitigation, honestly stated:** the toolkit's `docs/ops_build_and_test.md` covers the same
ground and **is correct today**. If a trip reader starts *there*, they were never exposed. Nobody has
verified where a Windows reader actually starts, so this is a real mitigation of unknown size — not a
reason the finding was less true.

## 3. Root cause

**The subject moved twice and the sentence describing it moved zero times.**
`05_revit/DEADARMS ADDIN/` → `13_addin/` (Phase 4, 2026-07-30) → **out of this repo entirely** into
`Mayo_Claude_Workspace/DEDARMS Revit Toolkit/src/…` (Phase 7b, 2026-07-31). `Revit Addins/` is older
still — it predates even the first of those.

The mechanism that hid it is the same one in FL-0004 (toolkit): **the moves were proved by
byte-identity**, which is exactly the property that carries a stale sentence across intact. Phase 8
then re-pointed the *living* documents — but §10's build/deploy bullet is prose about a tree that had
already left, and it was swept as documentation rather than as an instruction.

For `:105`, the specific mechanism is different and worth naming: **partial correctness.** The total
was re-counted at separation and the breakdown was not, so the line acquired one fresh number and
four stale ones. Anyone spot-checking "is the 100 still right?" got `yes`.

## 4. Resolution

`CLAUDE.md`, two edits, **repointing inside the existing prose rather than rewriting it** — the
surviving claims in that bullet are load-bearing and were verified to still hold:
the `-SkipLab` flag, the sha-verification, the mark-of-the-web clearing, and *"There is no longer a
post-build copy step — the `DeployAddin` xcopy was removed in separation Phase 5c."* **All kept
verbatim.**

- `:380` → `src/DEDARMS/` and `src/DEDARMS.Lab/`, tagged **`(toolkit repo)`**, with the dead
  `Revit Addins/…` root named as dead so the next reader does not "restore" it.
- `:384` → `deploy/install_dedarms.ps1`, tagged **`(toolkit repo)`, at that repo's ROOT**, stating
  explicitly that `src/DEDARMS/deploy/` does not exist.
- `:105` → `27/37/7/1 of its 72 .cs, recounted 2026-08-02`; `the 5 Lab files` → **6**.
  **The `100` was left untouched, deliberately** — it is correct, and "fixing" a correct number is
  how the next stale line gets written.

**The `(toolkit repo)` tag follows the sibling's own convention** for `(SLD repo)` citations
(`DEDARMS Revit Toolkit/CLAUDE.md:47-55`): a cross-repo citation is tagged inline **because the
reader may not have the other tree checked out, and saying so is the point of the tag.**

**Every repointed path proved with `ls` in-session** — positives present, `Revit Addins` and
`src/DEDARMS/deploy` confirmed absent in both trees. No gate checks this (§5), so the suite being
green proves nothing about these edits and was not treated as if it did.

## 5. Regression guard ← the point of this whole log

🚩 **THERE IS NONE. Stating that is the entry's job; inventing one would be the failure this log
exists to record.**

Verified 2026-08-02 rather than assumed: **no gate in either repo asserts that a path cited in a
document exists.** `sync_gate.mjs` reads `CLAUDE.md` at all — but only as an **anchor**: `P5`
(`:246-249`) matches the literal `` `sld_engine.mjs` rev **X** `` string against the manifest rev.
It resolves no paths. The nearest thing to a precedent anywhere is
`[T7] the hub still indexes every feature document` **in the sibling**, and it matches only
`](docs/*.md)` markdown links in one file — **not** inline code spans, which is how every path in
this FL was written.

**Ships unguarded, deliberately → FU-0014 (SLD)**, twinned with **FU-0007 (toolkit)**. The design
constraint that makes the FU tractable is recorded in FL-0004 (toolkit) §5: **the `(SLD repo)` /
`(toolkit repo)` tag convention is the waiver list such a checker would need**, because
"path that does not resolve here" and "path in the tree this suite is forbidden to read" are
otherwise indistinguishable to a single-repo gate.

## 6. Detection gap (`Detected by: ESCAPED`)

**Every gate was green and every gate was right.** 13/13 · sync 14/14 · behavior 52/52 · names 14/12,
before and after. Nothing was broken — something was *described* wrongly, and no gate reads prose as
a claim about the filesystem.

Two specific blind spots, both worth carrying forward:

1. **A stable line number is not a stable claim.** The `:105` sentence kept one true number, and the
   audit's sibling finding (`DEDARMS.Tests.csproj:91`, FL-0004) kept a true *line* under changed
   content. **Both defeat cheap re-derivation.** The rule this pair earns: re-derive **what a
   citation says**, never merely that it resolves.
2. **The cross-repo direction is invisible by construction** — ⚠️ **neither suite can see the other
   repo.** Three of these four errors point at the sibling. "All gates green" means half as much
   unless both suites were run, which they were (sequentially — never at once, FL-0012).

## 7. Links

- Twin entry, same class, other tree: **FL-0004 (toolkit)** — the test README's four dead instructions
- Deferred remainder: **FU-0014 (SLD)** · **FU-0007 (toolkit)**
- Session: **HO-0027 (SLD)**, twinned with **HO-0005 (toolkit)** ⚠️ *not* **HO-0005 (SLD)**, which is
  the owed Revit trip and is a different document
- Source: `00_Docs/staleness_audit_2026-08-02.md` §4.1, §7 (E1/E2) — **now carrying a dated
  disposition section**, appended rather than rewritten
- The moves that caused it: **HO-0012** (Phase 4) · **HO-0002 (toolkit)** (Phase 7b) · Phase 8
- Related: **FU-0005 (toolkit)** — four shipping `.cs` files with the same class of stale citation,
  **deliberately unfixed**; never edit a shipping `.cs`
- Gates involved: **none** — that is the finding
