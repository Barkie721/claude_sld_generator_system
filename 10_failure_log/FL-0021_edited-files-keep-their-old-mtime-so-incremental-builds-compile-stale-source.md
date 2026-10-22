# FL-0021 — an edited file on this phone keeps its OLD mtime, so `dotnet build` silently compiles stale source

| Field | Value |
|-------|-------|
| **ID** | FL-0021 |
| **Title** | Editing an existing file in this repo does not advance its mtime. MSBuild's inputs/outputs guard therefore cannot see C# changes at all: `dotnet build` prints `Build succeeded. 0 Error(s)` and re-emits the previous assembly, **with the source fix present on disk and absent from the artifact** |
| **Opened** | 2026-07-31 |
| **Closed** | 2026-07-31 |
| **Status** | `fixed` (procedure); ⚠️ **the underlying platform behaviour is PERMANENT — the guard is the fix** |
| **Severity** | **S1** |
| **Stage** | build |
| **Component** | every `dotnet build` in this repo · `13_addin/Revit Addins/**` |
| **Failure class** | vacuous-pass / stale-artifact |
| **Detected by** | the FL-0018 fix session, on its first build — the sha did not move when it had to |

---

## 1. Symptom

`Core/App.cs` was edited to apply the FL-0018 fix (a genuinely different load path, ~40 new lines,
a new `using`, a new method). Then, in place, exactly as the blessing build is done:

```
$ dotnet build -c Release -p:EnableWindowsTargeting=true
  DEDARMS -> …/bin/Release/DEDARMS.dll
Build succeeded.
    0 Warning(s)
    0 Error(s)
$ sha256sum bin/Release/DEDARMS.dll
d521ad30…      <-- THE OLD SHA. Byte-identical to the build from the previous day.
```

The edit was really on disk (`LoadFromAssemblyPath` at `App.cs:178`, 8 hits for the new symbols).
The compiler never ran. `App.cs`'s mtime:

```
-rw-rw---- 1 10318 1023 13382 2026-06-11 07:18:34 …/DEDARMS/Core/App.cs
                              ^^^^^^^^^^ seven weeks in the PAST, while `date` said 2026-07-31
```

Measured across writers, same directory tree:

| File | Written by | mtime afterwards |
|---|---|---|
| probe file | shell `>` redirect | ✅ current |
| `FL-0020_….md` | a **create** | ✅ current |
| `App.cs` | an **edit of an existing file** | ❌ `2026-06-11` |
| `sync_gate.mjs` | an **edit** | ❌ `2026-07-23` |
| `build_gate.sh` | an **edit** | ❌ `2026-07-30 20:37` |
| `current_state_manifest.json` | an **edit** | ❌ `2026-07-30 22:17` |

**Creating** a file sets the mtime; **editing** one leaves the previous mtime in place. MSBuild's
`CoreCompile` is guarded on `inputs newer than outputs`, so an edited `.cs` is invisible to it —
and the older the file, the more invisible.

## 2. Impact

**This is the most dangerous failure shape this repo has met.** Everything downstream reports
success on an artifact that does not contain the change:

- `dotnet build` → `0 Error(s)`, and it prints the `->` output line as though it produced something.
- The gate suite → **14/14 green**, because gate 13 builds in a *scratchpad* it wipes first, so the
  gate compiles the NEW source and passes while the in-place blessed DLL still holds the OLD code.
  **The gate and the artifact disagree and nothing compares them.**
- A re-bless performed at that moment would have pinned a sha, updated the installer, repointed
  three doc anchors and written "FL-0018 fixed" across the registers — for a DLL in which
  `DiscoverButtons` still called `Assembly.LoadFrom`. The fix would have been carried to Revit,
  the Fun buttons would still have vanished under a custom ALC, and the dialog would still have
  blamed the module type. **A burned trip, with every record on disk asserting the fix shipped.**

It is exactly FL-0020's class one turn deeper: FL-0020 was "the build did not run"; this is "the
build ran, believed it was up to date, and was wrong about it". FL-0020's guard — *check the output
mtime, never the exit code* — is what caught this one within a minute.

## 3. Root cause

The repo lives on `/storage/emulated/0`, an Android FUSE mount. The editing path used by this
agent's tooling rewrites content without advancing the modification time (a write-in-place or a
copy-back that restores times; the mount does not refresh it either). Nothing about MSBuild is
wrong: it asked the filesystem whether the source was newer, and the filesystem said no.

**Interpreted files were never affected** — `node` and `bash` read content and ignore timestamps —
which is why the whole FL-0019 gate rework earlier the same day was correct and verified by
execution. **The blast radius is exactly the compiled tree**, and the phone is the only place this
project compiles.

It also explains a detail that had looked like luck: the 2026-07-31 provenance run reproduced
`d521ad30` from a `--no-incremental` build **and** a full `rm -rf bin obj` clean build. Both
bypass timestamps entirely, so that result stands unaffected.

## 4. Resolution — APPLIED

**Any build whose purpose is to embody a source change must defeat the timestamp guard.** Both of
these work; use them together for a blessing build:

```bash
touch <every edited .cs>                      # restore a truthful mtime
dotnet build -c Release … --no-incremental    # and do not rely on it being truthful
```

Then **verify by the output mtime and the sha**, not by the banner:

```bash
ls -l --time-style=full-iso bin/Release/DEDARMS.dll   # must have moved
sha256sum bin/Release/DEDARMS.dll                     # must have moved, for a real code change
```

Applied for the FL-0018 blessing build: after `touch` + `--no-incremental` the DLL moved to
`be6ae51a`, and a subsequent `rm -rf bin obj` clean rebuild reproduced `be6ae51a` exactly —
so the blessed artifact is both fresh and reproducible.

## 5. Regression guard

**A sha that does not move after a source edit is now a FINDING, not a convenience.** That is the
whole guard, and it is free: a real C# change cannot produce a byte-identical assembly.

No gate can enforce this, and that limitation should be stated rather than papered over: gate 13
deliberately builds the shipping assemblies in a **scratchpad** (so it never clobbers a blessed
carry copy), which means it is structurally incapable of noticing that the in-place artifact is
stale. The only checks that could close it are the two this repo already has and must keep using
together:

- `provenance_*` — rebuild in place and confirm the blessed sha reproduces (FL-0020's protocol).
- The output-mtime assertion FL-0020 added to that protocol.

## 6. Prevention

**Three build lessons in one day, and they are one lesson:** `dotnet build` reporting success says
only that MSBuild finished, never that a compiler ran or that the artifact changed.

- FL-0020 — the build did not run; the sha matched and meant nothing.
- FL-0021 — the build ran but skipped the compile; the sha matched and meant the opposite of what
  it appeared to mean.

**The artifact's mtime is the cheapest true statement available about either.** Ask for it every
time, and never accept a banner as evidence that work was done.
