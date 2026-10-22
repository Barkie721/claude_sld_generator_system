# FL-0020 — the in-place rebuild protocol's own instrument was a no-op, and its no-op looked like a pass

| Field | Value |
|-------|-------|
| **ID** | FL-0020 |
| **Title** | `DEDARMS_INPLACE_REBUILD_PROTOCOL_2026-07-30.md` step 2 runs a bare `dotnet build`, which MSBuild answers **incrementally** on an up-to-date tree — the compiler never runs, the DLL is never rewritten, and step 3's sha comparison then reports the file it did not rebuild as a reproduction |
| **Opened** | 2026-07-31 |
| **Closed** | 2026-07-31 |
| **Status** | `fixed` |
| **Severity** | S3 |
| **Stage** | process |
| **Component** | `Download/DEDARMS_INPLACE_REBUILD_PROTOCOL_2026-07-30.md` §2 step 2 |
| **Failure class** | vacuous-pass |
| **Detected by** | the protocol's own execution session, 2026-07-31, on the first command |

---

## 1. Symptom

Step 2 as written is:

```bash
( cd "$A/DEDARMS" && /root/dotnet/dotnet build -c Release -p:EnableWindowsTargeting=true )
```

Run against the tree it was written for, this completed in **3.6 s** with `0 Warning(s) 0 Error(s)`
and printed the `DEDARMS -> …/bin/Release/DEDARMS.dll` line that reads like a build. Step 3 then
returned `d521ad30…` — the blessed sha, apparently reproduced.

**Nothing was compiled.** The output file's mtime was untouched:

```
2026-07-30 20:30:01.475726992   bin/Release/DEDARMS.dll   (before step 2)
2026-07-30 20:30:01.475726992   bin/Release/DEDARMS.dll   (after  step 2)
```

MSBuild's `CoreCompile` target is inputs/outputs-guarded; with every `.cs` older than the existing
assembly it is skipped, and `dotnet build` reports success for the targets it *evaluated*. The sha
matched because it was **the same bytes on disk from the blessing build in July**, not because the
source produced them again. A protocol written to ask "did this tree produce these bytes?" would
have answered "yes" without ever consulting the tree.

The tell is available and free — the output mtime — and the protocol never asked for it.

## 2. Impact

**This corrupts verification work, not the product.** Had the run been reported as written, the repo
would now carry a manifest entry and a handoff claiming the strongest provenance evidence it has ever
had, backed by a command that cannot produce that evidence. The next session would have inherited it
as settled and stopped asking.

The class is exactly FL-0019(e)'s and FL-0011's: **a green that describes work never attempted.**
Worse here in one respect — FL-0019(e)'s wrong-depth lab at least *ran a build*; this one ran none,
and the two are indistinguishable in the transcript because MSBuild prints the same success banner
either way.

It also has a narrow window. The protocol is a one-shot instrument aimed at the tree *before*
FL-0018's possible `App.cs` edit. A vacuous pass consumed on that day would have been unrepeatable:
once the sha moves, the pre-fix tree can never be asked again.

## 3. Root cause

The protocol reasoned carefully about **where** the build must happen — §1 spends four bullets on
location dependence, `EnableWindowsTargeting`, `DOTNET_*` env, and `flock --close` — and never about
**whether** it would happen. "Rebuild" was treated as a property of the command rather than something
to assert. The same session had just written FL-0019 about checks whose names over-claim their
bodies, and then wrote a step whose *name* ("rebuild BOTH 2025 projects in place") over-claimed
`dotnet build`.

Contributing: on this repo a rebuild is ~4–6 s, so the no-op's 3.6 s was not obviously fast.

## 4. Resolution — APPLIED

The protocol was corrected in place (§2 step 2 + a new step 2a), and the run was completed with the
corrected instrument. Three escalating builds were used, all at the real absolute path:

| Instrument | mtime moved | `DEDARMS.dll` | `DEDARMS.Lab.dll` |
|---|---|---|---|
| bare `dotnet build` (as written) | **no** — vacuous | `d521ad30` | not attempted |
| `--no-incremental` | yes, `00:06:49` | `d521ad30` | `43805105` |
| `rm -rf bin obj` + build (restore re-run offline) | yes | `d521ad30` | `43805105` |

A fourth reproduction of `d521ad30` came free: `DEDARMS.Lab` has a `ProjectReference` to `DEDARMS`,
so building the satellite non-incrementally rebuilt Core again (`00:07:07`) — same bytes.

**The answer the protocol wanted is therefore YES, and it now rests on builds that demonstrably
ran.** See the `provenance_2026_07_31` blocks in `03_contracts/current_state_manifest.json`.

## 5. Regression guard

**Assert the mtime, not the sha alone.** Any future provenance run must record the output file's
mtime before and after and fail if it did not move — a sha comparison across a skipped build is
vacuous by construction, and this is the one check that distinguishes the two cases. The corrected
protocol carries it as a numbered step, not as advice.

Secondarily: prefer `--no-incremental` (or a `bin`+`obj` delete) over a bare `dotnet build` whenever
the *act* of compiling is the measurement rather than a means to an artifact.

## 6. Prevention

**A build command is not evidence that a build occurred.** Every instrument in this repo that
consumes a tool's exit code should name the observable that proves the tool did the work — the mtime
here, the marked golden in FL-0019(e), `EXPECTED_CHECKS` in FL-0011, `EXPECTED_GATES` in FL-0017.
The recurring shape across all four: **the summary line reports on what ran, and says nothing about
what didn't.** When the thing that "didn't run" is the entire experiment, the summary is a lie told
in good faith.
