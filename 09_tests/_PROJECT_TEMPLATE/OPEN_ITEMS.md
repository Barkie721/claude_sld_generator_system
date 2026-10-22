# \<Project\> — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not hand-edit —
> it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** — · **Halts** — · **Notes** — · **Placeholders** —

---

## 1. Tier-3 halts — EOR input required

_This file has not been generated yet. Run `bash run_pipeline.sh`._

Three tables land here: Tier-3 halts (blocking), Tier-2 `compositor_notes[]` decisions taken by
default (not blocking), and placeholder markers found by walking every leaf of the topology.

⚠️ A halt's `nec_reference` **is nullable** — a missing utility letter or a manufacturer value has no
section to cite. The renderer handles it; anything else reading this data must too.

⚠️ `DATA_LOOKUP_MISS` is a **string substituted into an arbitrary leaf field**
(`project_instructions_V1_0_0.md` §9.3), not a key and not an object. Only a recursive walk finds it.

A project with no halts says so explicitly: `` `compositor_halts[]` is empty **by design** ``.
