# Default 2500 kVA Service — a run of the canonical default single line

> **Canonical:** this folder is not the source of anything. The default composition — what it is,
> how to run it, what to expect, and what it cannot prove — is described in
> [`01_inputs/defaults/README.md`](../../01_inputs/defaults/README.md). `09_tests/README.md` owns the
> standard project structure.

The two files in `1_source/` are copies of `01_inputs/defaults/default2500_*`. **Edit them there,
not here.** Everything in this folder is regenerable and safe to delete; recreate it with the recipe
in `01_inputs/defaults/README.md` § Run it.

The newest run in [`3_output/RESULTS.json`](3_output/RESULTS.json) is the record of what the default
produces on the current engine. `5_docs/` and `6_revit/` are empty: the default has no handoff and
has not been taken into Revit.

⚠️ **Do NOT run `../../run_all_gates.sh` for this folder.** That suite is engine regression against
the hospital golden. `bash run_pipeline.sh` here is the check.

⚠️ **It cannot graduate to `06_deliverables/`**, by design: it ships three Tier-3 halts
(`OPEN_ITEMS.md`) that any real job's EOR still owes.
