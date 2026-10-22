# FU-0018 — the suite's scripts and the golden-case folder must spell the same path

| Field | Value |
|-------|-------|
| **ID** | FU-0018 |
| **Title** | Resolve the golden-case folder spelling between the suite's scripts and the tree |
| **Proposed** | 2026-10-13 (raised by the 2026-09-16 source review) |
| **Proposed by** | `review` |
| **Owner** | the SLD side — **Mayo's triage of 2026-10-13** |
| **Status** | ✅ **closed, no change, 2026-10-13** — Mayo closed it on the evidence below |
| **Priority** | `P2` — by target milestone, Mayo 2026-10-13 |
| **Effort** | TBD |
| **Readiness** | `ready` |
| **Category** | `validation/gates` |
| **Stage** | `gate` |
| **Component** | `09_tests/Hospital Example (Golden Case)/` and every script that names it |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` — the golden's content is preserved; only its path is in question |
| **Schema impact** | `none` |
| **Version bumps** | TBD |
| **Gates affected** | TBD — every gate that resolves the golden by path |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | **before M8** (pyDEDARMS milestone) |

---

## 1. Problem
The 2026-09-16 source review found the SLD scripts and the published fixture's source path refer to
`09_tests/Hospital Example (Golden Case)` while the reviewed tree contained
`09_tests/_Hospital Example (Golden Case)` (leading underscore). A suite that cannot find its own golden
is not a frozen, verified-good dependency.

⚠️ **Not reproduced on this machine, 2026-10-13:** the working tree and the committed tree at `9db5ee6`
both spell the folder **without** the underscore, matching the scripts. The review read the earlier
standalone repository at a commit. The finding stays open until the check below runs, not on this
observation.

## 2. Proposed change
Confirm which spelling is canonical, make the scripts, the published fixture's source path and the
tree agree, and run the relevant SLD suite from a clean checkout. Preserve the golden's content.

## 3. Scope
**In:** the path spelling only.
**Out (non-goals):** any change to golden content or baselines.

## 4. Acceptance criteria
- [x] Every script and the published fixture's source path name the folder the tree actually contains.
- [x] The relevant SLD suite passes from a clean checkout. *(9/9 under `--no-png`; the full run is 12/13 with only G6 red, for reasons that are not the path — see both 2026-10-13 results below. Mayo accepted this as met.)*

### 📌 2026-10-13 — clean-checkout result
A fresh `git clone` of `9db5ee6` into a scratch directory, with nothing else on it:

- **Spelling:** the clone's tree is `09_tests/Hospital Example (Golden Case)`, the same name the
  scripts, `03_contracts/current_state_manifest.json` and `published_drop/drop_manifest.json` use.
  No path error appeared in either run.
- **`./run_all_gates.sh --no-png`:** **9 passed, 0 failed**, exit 0.
- **`./run_all_gates.sh` (full):** **12 passed, 1 failed**, and the failure was G6 composed-baselines.
  **This is not the path:** `rsvg-convert` is not installed on this machine, so `snapshot_html.mjs`
  exits `rsvg-convert not runnable: spawnSync rsvg-convert ENOENT` before rendering. The committed
  PNGs then still match `baseline_composed_sha256.txt` 6/6. G6 hides this because it sends its own
  output to `/dev/null`, so the suite prints a bare FAIL (logged as **FL-0028**). The runner's header says "No rsvg → --no-png".

**So the mismatch the review found does not exist at `9db5ee6`.** The entry closes once the full
suite has passed from a clean checkout on a box that has rsvg.

### 📌 2026-10-13, later — the full run on this PC, with rsvg installed
Mayo had `rsvg-convert` installed on the Windows PC (MSYS2 `mingw-w64-ucrt-x86_64-librsvg`,
**rsvg-convert 2.62.3**, cairo 1.18.4, pango 1.57.1; on PATH for the run only). A fresh clone of `3fdeb61`:

- **`./run_all_gates.sh` (full):** **12 passed, 1 failed**, G6 again. This time G6 renders, and all six
  composed PNGs miss `baseline_composed_sha256.txt`.
- **The engine output is identical:** every regenerated SVG is byte-equal to the committed one. Only the
  PNGs differ, at the same size, in 0.67% of pixels on a page and 0.31% on the title block.
- **The difference is the font.** The pages ask for `'Courier New',monospace`. The baselines were made on
  the phone (`/mnt/sdcard`, 2026-08-06), which has no Courier New and drew a sans monospace fallback; this
  PC has real Courier New and draws it with serifs. Lines and geometry match; only glyphs differ.

**So G6 can only pass where the baselines were made.** Its baselines are the phone's rsvg *and* the phone's
fonts, and no box with Courier New installed can match them, whatever its rsvg version. This does not touch
the path question: the gates that read the golden-case folder all passed again. The phone is still the only
box that can show the full 13/13.

### ✅ Closed, no change — 2026-10-13
**Mayo closed FU-0018 on this evidence.** The question it was raised for, whether the scripts and the
tree spell the golden-case folder the same, is answered: they do, and every gate that reads the folder
passes from a clean checkout. G6's red on the PC is the font, not the path, so a phone run would only
re-prove G6 and is not required. Nothing in the tree changed.

## 5. Blast radius
TBD — must be measured at plan time. If `03_contracts/published_drop/drop_manifest.json` changes,
the drop's pins move and it is a deliberate re-drop (DEC-049).

## 6. Verification plan
TBD — before and after: `run_all_gates.sh` from a clean checkout.

## 7. Risks / open questions
Whether the mismatch still exists anywhere (see §1).

## 8. Alternatives considered
—

## 9. Links
- Triage: `revit_electrical-content-generator_system/logs/open-questions.md` OQ-113 (2026-10-13)
- Origin: `DEDARMS_Development_Plan.md` §25 Baseline Check (2026-09-16 review)
- Related: FU-0019, FU-0020, FU-0021 (same triage)
