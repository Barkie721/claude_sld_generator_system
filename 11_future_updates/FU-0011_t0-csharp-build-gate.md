# FU-0011 — T0: a C# build-and-test gate, because the 12-gate suite is completely blind to the add-in

| Field | Value |
|-------|-------|
| **ID** | FU-0011 |
| **Proposed** | 2026-07-30 |
| **Category** | validation/gates |
| **Priority** | P1 |
| **Effort** | M |
| **Readiness** | `ready` |
| **Status** | **`shipped` 2026-07-30** — see §6. Raised and shipped the same day |
| **Raised by** | DEDARMS-separation Phase 0/1 session — this is Phase 2 of that plan |
| **Shipped as** | `08_validation/build_gate.sh` (gate 13) + `08_validation/lib/dll_embed_V1_0_0.mjs` + the `artifacts.addin_tests` manifest slot |

---

## 1. The problem, measured

`run_all_gates.sh` contains **zero** references to `dotnet`, a `.csproj`, a `.cs` file or a `.py`
file. Verified by grep 2026-07-30. Every one of its 12 gates is a Node script operating on the
renderer, the topology and the baselines.

**So "12/12 gates green" says nothing whatever about the Revit add-in** — 96 `.cs` files, 18,674
lines, two shipping assemblies. The "112 tests pass" figure that appears beside it in every handoff
comes from a completely separate, manually-typed command. Nothing couples the two, and nothing
notices if the second one stops being run.

It is worse than uncoupled, in two ways:

1. **The test count is printed but never asserted.** `DEDARMS.Tests/Program.cs` writes
   `RESULT: passed=N failed=M …` and returns `failed == 0 && errors == 0 ? 0 : 1`. A test that
   silently stopped being *discovered* — a `<Compile Include>` link dropped during a refactor, say —
   would not fail the run. It would just quietly test less. This is exactly how the count drifted
   through 37 → 69 → 109 → 112 with the manifest still saying 69 as of this morning.
2. **The C# work that is actually planned is 100% invisible to every existing gate.** The add-in
   restructure (folder reorganisation, `internal` → `public` visibility changes, the
   `RibbonBuilder.cs:33` assembly-location fix, a `DEDARMS.Lab` satellite) cannot be verified by
   anything in this repo today. Worse, the one thing the suite *would* notice pushes the wrong way:
   getting back to green after a restructure means re-blessing `addin_dll.sha256` for a DLL that has
   never run inside Revit — the manifest agreeing with itself while quietly invalidating the trip
   evidence.

## 2. Proposal

`08_validation/build_gate.sh`, wired into `run_all_gates.sh` as gate 13 (behind a flag if the
12-gate suite should stay fast).

1. Build **both** shipping projects with the absolute interpreter path — `dotnet` is **not** on
   `$PATH` here; it is `/root/dotnet/dotnet`, SDK 8.0.422.
2. Gate on **0 ERRORS, tolerating MSB3073.** "0 warnings" can never pass on this phone: the
   post-build `xcopy` deploy step is Windows-only and always warns on Linux. `DEDARMS.Tests` also
   carries 12 pre-existing nullable/CS0649 warnings.
3. Run the tests via `/root/dotnet/dotnet exec bin/Release/net8.0/DEDARMS.Tests.dll`.
   **NOT `dotnet test`** (cannot resolve an ARM64 test host here) and **NOT `dotnet run`**
   (`/storage` is `noexec` → `Win32Exception (13)`).
4. **Assert the expected test count**, not merely `failed == 0`. This is the whole point of §1.2.
   Pin the number in `current_state_manifest.json` so there is one place to update deliberately.
5. Handle the build-location split correctly — see the trap below.

Also worth folding in: **T4**, extracting the family map actually embedded in the built DLL by its
4-byte LE length prefix and hashing it against `07_data/normalized/…json`. That logic already exists
inside `sync_gate.mjs` (`extractEmbeddedMapSha`) and is FL-0001's fix; building it into T0 means a
future restructure cannot silently break it.

## 3. ⚠️ The trap this gate must be designed around — measured 2026-07-30

**`DEDARMS.dll`'s sha is build-location-dependent, so T0 can never sha-match a scratchpad build
against the manifest.**

Measured, not assumed: two clean rebuilds in the same off-`/storage` scratchpad produced
`ceac2f29` **both times** — so the build *is* deterministic. But neither equals the blessed
`9f16a1e7`, which was built in place. `DEDARMS.csproj` sets no `<Deterministic>` and no `<PathMap>`
(its `DEDARMS.Replay2023` sibling *does* set `Deterministic=true`), so absolute source paths reach
the output.

This collides head-on with the standing build advice, which is to build **off** `/storage`
(`noexec`, and FUSE leaves the in-repo `obj/` stale). Three ways out, in order of preference:

1. **T0 gates on 0 errors + the asserted test count, and never on a sha.** Cheapest, honest, and
   sufficient — the sha's job is carrying the right file to the Revit box, which `sync_gate`
   already covers.
2. Add `<PathMap>`/`<Deterministic>` to `DEDARMS.csproj` so the sha stops depending on where it was
   built. Cleaner long-term, but it changes the output bytes, so it costs a re-bless and forfeits
   `9f16a1e7`'s status as the build that actually ran in Revit on 2026-07-29.
3. Build in place. Rejected: `/storage` is `noexec` and an in-place build overwrites a blessed carry
   copy.

**Recommendation: (1) now, (2) folded into the next legitimate rebuild.**

Second trap, related: **`DEDARMS.Tests` must build IN PLACE.** `DEDARMS.Tests.csproj:91` reaches the
hospital golden by a repo-relative 4-level climb, so a scratchpad copy fails MSB3030. Its `bin`/`obj`
must then be deleted afterwards. T0 therefore has *two different* build strategies in one script,
and that asymmetry is the main reason this is [M] and not [S].

## 4. Acceptance

- `bash run_all_gates.sh` reports **13/13**.
- **T0 is proved by breaking something.** In a scratchpad copy only, delete a method body in
  `Services/LayoutEngine.cs`; T0 must go red; restore. Without that proof it is a script, not a gate.
- T0 goes red if the test count changes without the manifest being updated.
- T4 green: the extracted embed hashes to `df7cfc4f`.

## 5. Why it is worth doing regardless of the repo split

This is Phase 2 of the DEDARMS separation plan, and that plan calls Phases 0–2 "pure profit even if
you abandon the split afterwards." That is the honest framing here too: the repo would gate its own
C# for the first time. Everything above is true whether or not the add-in ever moves.

## 6. ✅ SHIPPED 2026-07-30 — what landed, and the two places §2/§3 above were wrong

**Landed:** `08_validation/build_gate.sh` as **gate 13** of `run_all_gates.sh`; the extractor factored
into `08_validation/lib/dll_embed_V1_0_0.mjs` and now **imported by both** it and `sync_gate.mjs`; and
a new manifest slot `artifacts.addin_tests` holding the pinned counts. Suite is **13/13**, sync-gate
**21/21** (check NAMES diffed identical before and after the refactor), **112** tests, blessed shas
`9f16a1e7` ×2 and `1a3b7ead` all untouched. ~22 s for the gate, ~39 s for the whole suite; NuGet
restore is served entirely from the local cache, so it needs no network.

**The 9 checks:** T0.0 ×3 (preconditions) · T0.1 `DEDARMS` builds · T0.2 `DEDARMS.Replay2023` builds ·
T0.3 `DEDARMS.Tests` builds · T0.4 tests run **and the count equals the pin** · T4 the freshly built
DLL still embeds the canonical map (the BYTES) · **T4b every resource name the C# hardcodes still
exists in that DLL (the NAMES)** — added hours after the rest, see the correction below.

### Acceptance, item by item
- ✅ **`bash run_all_gates.sh` reports 13/13.** It runs by default in full mode rather than behind a
  flag — §2 offered "behind a flag if the 12-gate suite should stay fast", and at 22 s that trade was
  not worth making. `--no-build` skips it; `--quick` excludes it (staying Node-only at 5/5).
- ✅ **Proved by breaking things — six mutants, not one.** All in a throwaway copy at
  `/root/.cache/dedarms_mutant`, reached via the new `SLD_ADDIN_ROOT` override, so **the real sources
  were never edited**: ① gutting `AverageParentX`'s body in `Services/LayoutEngine.cs` → **3 reds**
  (T0.1; T0.3, because the tests source-link that same file; and T4, which then has no DLL to read) ·
  ② commenting out **one** `[Fact]` → **T0.4 red at `passed=111` while the runner itself exits 0** ·
  ③ deleting the family map's `<EmbeddedResource>` line → **T4 alone red**, with 0 errors and 112
  tests passing · ④⑤⑥ bad `DOTNET_BIN` / a `/storage` scratchpad / a missing add-in root → three hard
  **FAIL**s, never an `ok (skipped)`. Every mutant restored, control re-verified green each time.
- ✅ **T0 goes red if the count changes without the manifest being updated** — that is mutant ②, and
  it is the single most valuable line in this gate: it reproduces §1.2's false green exactly.
- ✅ **T4 green: the extracted embed hashes to `df7cfc4f`** (34,174 B), equal to the canonical
  `07_data/normalized/` map **and** to `family_map.sha256`.

### ⚠️ CORRECTION to this section, same day: T4 alone was NOT sufficient
The acceptance item above is satisfied, but the *reasoning* attached to it in §2 and in the first
draft of the docs was wrong. **T4 does not catch a `RootNamespace` change.** It locates the map by its
`$schema` bytes, and those bytes remain embedded when the resource is renamed — measured: setting
`<RootNamespace>DEDARMS.Core</RootNamespace>` broke all five hardcoded `"DEDARMS.Resources.…"` lookups
while the gate stayed **8/8 green**. Since that rename *is* Phase 5, the gate would have green-lit the
precise failure it exists to prevent.
**Fixed by adding T4b** (9 checks now): expected names are extracted **from the C# source** and each
must exist in the built DLL as a **UTF-8** byte sequence — UTF-8 because C# literals live UTF-16LE in
`#US` while resource names live UTF-8 in `#Strings`, so the search cannot be fooled by the literal it
validates. T4b fails on an empty extraction list too (FL-0010's class). Mutant-proved red-then-green.
**"Present" and "reachable under the expected name" are different assertions** — the mirror image of
FL-0001's "containment is not identity".

### §3 was wrong about Replay2023 — measured
§3 named `DEDARMS` as the build-location-dependent one and cited `DEDARMS.Replay2023`'s
`Deterministic=true` as the contrast. **Both are location-dependent.** Replay2023 gives `bb79a5cc`
twice in one scratchpad, `31f3a9a6` in a different directory, and the blessed build is `1a3b7ead` —
three distinct shas from identical sources. `<Deterministic>` removes timestamp/MVID churn, not
absolute source paths, which need `<PathMap>`. **Consequence for the separation plan: its T3 ("built
DLL sha == toolkit manifest") is unachievable for BOTH shipping assemblies, and its T7 ("two clean
builds, same sha") is only meaningful when both builds run in the same directory.** The manifest's
`replay2023_dll.reproducible` field was a bare `true`; it now carries the qualifier.

### §2 item 5 ("also worth folding in T4") understated what T4 is for
It read as relocating logic that "already exists inside `sync_gate.mjs`". It is not a relocation —
sync_gate reads the **blessed carry copy** ("are the bytes I am about to carry honest?"), while T4
reads what the build **just produced** ("does the build still embed the map at all?"). Only the second
question catches the Phase 5 landmine, and mutant ③ proves the difference: 0 compiler errors, 112
tests passing, map absent from the DLL, **T4 the only red**. Hence one shared extractor in `lib/`
rather than a second copy of a byte-offset heuristic.

### One bug found in this gate's own first draft, worth recording
T4 failed on its first run with *"malformed embed: no length prefix before the JSON"*. Cause: under
`node -e` there is no script path, so `process.argv[1]` is the **first user argument** and an
`argv.slice(2)` shifted every path by one — T4 was parsing the JSON family map as if it were a DLL.
It surfaced only because `extractEmbeddedMapSha` refuses to guess: it walked back to offset 0 and
reported that it could not find a length prefix, instead of hashing whatever it happened to find.
**A parser that fails loudly on nonsense input is what made a wiring bug visible in one run.** Both
inline node snippets now take paths through the environment.

### Deliberately NOT done
- **`Program.cs` was left alone.** The assertion lives in the gate, so the pinned number sits in a
  contract with one owner rather than being compiled into the test host.
- **No `<PathMap>`/`<Deterministic>` added to `DEDARMS.csproj`** — §3's option (2) still costs a
  re-bless and would forfeit `9f16a1e7`'s status as the build that ran in Revit. Fold it into the next
  legitimate rebuild, i.e. Phase 5, where a re-bless is already owed.
- **No check-NAME baseline file was committed.** Phases 4/5/7 want one to diff against; it would be a
  new tracked artifact needing its own bless discipline, so it is flagged in HO-0007 rather than
  invented here.

## 7. Links

- **FL-0009**, **FL-0010** — the two false-green classes closed 2026-07-30; same session, same theme
  (an assertion that declines to run and reports success). T0 exists so the C# side stops being the
  largest un-asserted surface in the repo.
- **FL-0001** — the embed-containment false green that T4 institutionalises the fix for.
- `03_contracts/current_state_manifest.json` `artifacts.addin_dll.note` — carries the measured
  reproducibility finding and the exact commands.
- The DEDARMS separation handoff, §10 Phase 2 and errata E10/E11.
