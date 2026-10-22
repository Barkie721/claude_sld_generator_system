# FL-0015 — the embedded-resource NAME check tested substring containment, not identity

| Field | Value |
|-------|-------|
| **ID** | FL-0015 |
| **Title** | `findMissingResourceNames` matched a bare substring, so a `<LogicalName>` renamed to a SUPERSTRING of the pinned name passed all three consumers |
| **Opened** | 2026-07-30 |
| **Closed** | 2026-07-30 |
| **Status** | `fixed` |
| **Severity** | S2 |
| **Stage** | gate |
| **Component** | `08_validation/lib/dll_embed_V1_0_0.mjs:89-91` (consumed by `build_gate.sh` T4b/T4c and `sync_gate.mjs` D8a) |
| **Failure class** | silent-skip |
| **Detected by** | Phase 5 verification, lane E (adversarial mutant hunt) — **ESCAPED** every gate for the whole of Phase 5 |

---

## 1. Symptom

The check that proves a built assembly answers to the resource names the C# hardcodes was:

```js
export function findMissingResourceNames(dllBuf, names) {
  return names.filter(n => !dllBuf.includes(Buffer.from(n, 'utf8')));
}
```

Measured against the real shipping `DEDARMS.Lab.dll`, with a probe name **no resource owns**:

```
probe: DEDARMS.Resources.Cat1.pn   (a strict substring of the real DEDARMS.Resources.Cat1.png)
OLD  substring       -> missing = false   (GREEN  <-- FALSE GREEN)
NEW  NUL-terminated  -> missing = true    (RED    <-- correct)
```

Lane E reached the same hole from the other side, by renaming a `<LogicalName>` in the csproj to a
superstring and rebuilding:

```
sed -i 's|LogicalName="DEDARMS.Resources.revit_SLD_family_map_V1_0_0.json"|…json.v2"|' DEDARMS.csproj
bash 08_validation/build_gate.sh          -> BUILD-GATE GREEN 14/14
node 08_validation/sync_gate.mjs --quick  -> 22/22
```

## 2. Impact

The renamed resource is no longer reachable under the name the source asks for. For the family map
that is `FamilyResolver.cs:384`'s `?? throw` — **a hard exception inside Revit**, on a build that
scored a full 14/14 + 24/24 on the phone. Four of the six resource consumers swallow a null and
render a button with no icon instead; two throw. This is the same blast radius FL-0001 has, in the
same subsystem, reached by a different route.

Not currently triggered: lane C read the real `ManifestResource` metadata tables out of both
shipping DLLs and confirmed the five real names are exactly the five pinned ones. **This was a
latent hole in the gate, not a live defect in the artifact.**

## 3. Root cause

`Buffer.includes` is substring containment. The function's own comment acknowledged the risk and
then argued it away:

> *"This is a containment test, and this repo rightly distrusts those (FL-0001: 'containment is not
> identity'). It is the correct semantic **here** because a resource name is an exact string…"*

That argument is sound in ONE direction — a pinned name cannot be a substring of an unrelated
resource by accident — and silently wrong in the other: **any superstring of the pinned name
contains it.** Renames overwhelmingly produce superstrings (`.v2`, `.old`, an added prefix segment),
which is exactly the mutation class this check exists to catch.

FL-0001 is the record of this identical mistake being made and fixed once already, one function
away in the same file. The rationalisation is what let it recur.

## 4. Resolution

`#Strings`-heap entries are NUL-terminated, so appending one byte converts containment into
identity at no cost:

```js
return names.filter(n => !dllBuf.includes(Buffer.from(n + '\u0000', 'utf8')));
```

Files changed: `08_validation/lib/dll_embed_V1_0_0.mjs` only. All five real names already satisfy
the stricter form, so the fix is non-breaking — verified against both shipping assemblies before
applying it.

⚠️ Written as the escape `'\u0000'`, never a literal NUL byte. This repo's own sources carry
deliberate NUL bytes as composite-key delimiters (FL-0013), and adding another one to a gate library
is how that trap gets re-sprung.

## 5. Regression guard

**Mutant-proved 2026-07-30**, in a throwaway full-repo lab at `/root/verify_lab`, by pinning a name
that is a strict substring of a real resource (`…Cat1.png` → `…Cat1.pn`):

```
FAIL  [P1] blessed carry-copy DLL answers to the hardcoded resource names —
      1 of 3 name(s) that DEDARMS.Lab.dll must own are absent from the blessed copy:
      DEDARMS.Resources.Cat1.pn
SYNC-GATE: 21 passed, 1 failed.
```

The same mutant was GREEN under the old implementation (proof in §1). Lab restored to 22/22
afterwards. One fix covers all five call sites — `sync_gate.mjs:390,400` and
`build_gate.sh:605,612,642` — because they share this one library function, which is the reason
FU-0011 made it a library rather than a copy-paste.

## 6. Prevention

The lesson is not "containment is bad" — it is that **a comment explaining why a known-dangerous
pattern is safe here is itself a defect signal.** This function carried a paragraph justifying the
exception to a rule the repo had already been burned by. Both times the rule was right.

Where an exact relation is available for one extra byte, take it, and do not write the paragraph.
