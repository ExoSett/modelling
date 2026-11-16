# Information-model worked examples

Status: illustrative semantics for review, 16 November 2026. These examples are
not XML, schema-valid fixtures, engineering specifications or proposed identifier
syntax. They accompany the [architecture](information-model.md).

All names, revisions, evidence and times below are fictional. `A@2` means
revision 2 of document A; `Library@5 / Beam` identifies a definition within an
immutable document revision. These are explanatory labels, not an ExoSett or
standards-conforming identification scheme. Physical items C and D have external
identities whose actual encoding remains undecided; their document labels are
`Component-C` and `Component-D`. All dates/times below use UTC. Each table row
describes a snapshot or a publication binding, not a mutable event-log entry.

## 1. One beam definition, two building classes

| Immutable class document | Contents or dependencies |
| --- | --- |
| InterfaceLibrary@2 | Definition `EndInterface`, complete for its declared interface scope |
| BeamLibrary@5 | Definition `Beam`, with nominal dimensions, material requirements, tolerances and reference to InterfaceLibrary@2 / EndInterface; no building arrangement |
| HallClass@3 | Imports BeamLibrary@5 / Beam; position P requires that definition |
| WorkshopClass@1 | Imports BeamLibrary@5 / Beam; position Q requires that definition |

BeamLibrary@5 is a Building Class Document Fragment, not a different document
type. Its declared scope is the beam definition, with the interface dependency
resolved. The engineering values themselves are intentionally omitted from this
conceptual example; this table is not an approved or complete beam specification.

HallClass@3 and WorkshopClass@1 resolve the same beam and transitive interface
revision. Publishing BeamLibrary@6 changes neither class. Adoption requires a new
class revision and review of its use. A hypothetical approval of BeamLibrary@5 /
Beam applies only within its stated scope and conditions, not automatically to
either complete building.

**Check:** both consumers resolve the exact same definition; a missing dependency
is reported rather than replaced with a newer one. A fragment can be valid for
its scope without `framePairs`. Library reuse does not require inheritance.

## 2. Replacement while preserving the position

Building A adopts HallClass@3. Position P in A is a realization of HallClass@3's
P; another building's P is a different occurrence. C and D both identify
BeamLibrary@5 / Beam as their design basis, with suitability evidence assessed
for this installation. This does not assert blanket conformity.

| Before replacement, effective 2026-10-01 | Recorded state |
| --- | --- |
| Building-A@1 | A/P occupied by C; supporting component revision Component-C@1 |
| Component-C@1 | Physical item C installed at A/P; manufacture and class provenance retained |
| Component-D@1 | Physical item D in storage S; manufacture and class provenance retained |

The replacement finishes on 2026-10-02 at 15:00. An inspection at 15:30 supports
records entered at 17:00 and accepted together on 2026-10-03. This explicitly
separates the effective state from later observation and recording.

| Publication set Replacement-1 | Resulting snapshot effective 2026-10-02 15:00 |
| --- | --- |
| Building-A@1 → Building-A@2 | A/P occupied by D, supported by Component-D@2 |
| Component-C@1 → Component-C@2 | C removed from A/P and in storage S |
| Component-D@1 → Component-D@2 | D installed at A/P |

The set identifies the work record, inspection evidence, author and checker by
reference. Those records are assumed for illustration, not supplied certificates.
The position and adopted class revision remain unchanged. The operation's
intermediate empty position can be described in work evidence; the publication
set summarizes the resulting state.

**Check:** the new building and both component snapshots agree. Publishing only
Building-A@2 is incomplete coordination, not a completed accepted set. Ten
one-for-one replacements normally affect twenty component records, not ten.

## 3. Storage and installation in another building

Continue example 2: C remains the same physical item during storage. Building B
adopts WorkshopClass@1 and has an unoccupied position Q.

| Before transfer | Recorded state |
| --- | --- |
| Building-A@2 | D occupies A/P; no assignment of C |
| Component-C@2 | C in storage S after removal from A |
| Building-B@1 | B/Q explicitly unoccupied |

On 2026-10-05, C is dispatched. Component-C@3 records transit, destination B and
dispatch/custody evidence. It does not assert installation. No new A revision is
needed because A's configuration is unchanged.

| Publication set Installation-2 | Resulting state effective 2026-10-06 12:00 |
| --- | --- |
| Building-B@1 → Building-B@2 | B/Q occupied by C, supported by Component-C@4 |
| Component-C@3 → Component-C@4 | C installed at B/Q, with installation and suitability evidence |

C's earlier document revisions retain its deployment in A and subsequent storage
and transit. Neither a new owner, location nor document revision creates a new
physical identity. The new records do not rewrite Building-A@1: it remains a
historical assertion that C occupied A/P at that earlier time.

**Check:** deployment intervals do not assert C installed in both buildings at
once. Current-state comparisons use effective times and accepted revisions,
not every historical document mentioning C. Receipt alone is not installation.

## 4. Remove, repair and reinstall the same component

Continue example 3. C is removed from B/Q for repair; the project determines
that this repair preserves C's physical identity.

| Publication/evidence | Resulting snapshots |
| --- | --- |
| Removal-3, effective 2026-10-08 10:00 | Building-B@3: B/Q unoccupied; Component-C@5: removed from B/Q, in repair custody |
| Repair evidence, recorded 2026-10-09 | Component-C@6: repair completed, condition and inspection evidence recorded; still not installed |
| Reinstallation-4, effective 2026-10-10 14:00 | Building-B@4: C at B/Q supported by Component-C@7; Component-C@7: reinstalled at B/Q with acceptance evidence |

Building-B@2 and Building-B@4 have the same occupant at Q, but different physical
histories and supporting evidence. The intermediate snapshots and repair record
make that distinction visible. Repair completion alone need not create a building
revision while the component remains absent.

A later routine inspection could create Component-C@8 without changing the
assignment recorded in Building-B@4. The latter continues to identify the revision
supporting installation. If that inspection changes the accepted building
assessment, the responsible process records the corresponding building revision.

**Check:** C's identity is preserved, condition evidence advances, and the absence
is not lost. Whether cutting, combining or extensive refurbishment instead creates
a new identity is a separate future policy question, not decided by this example.

## 5. Correct an observation without inventing physical change

This example is independent of examples 2–4. Building X/P has held component C
throughout the period, but a transcription mistake recorded D.

| Original accepted record | Assertion |
| --- | --- |
| Building-X@1, Component-D@1 and Component-C@1 | Effective 2026-09-01: D at X/P, C in storage; observation dated 2026-09-01, recorded 2026-09-02 |

On 2026-09-04, a checker compares the original signed inspection sheet with the
transcription and confirms that the two identities were swapped in the records.
The sheet supports correction of the original observation; it is not merely a
new observation being assumed true for the past.

| Correction set Correction-1, recorded 2026-09-04 | Corrected assertion effective 2026-09-01 |
| --- | --- |
| Building-X@2 | C occupies X/P, supported by Component-C@2 |
| Component-C@2 | C at X/P |
| Component-D@2 | D in storage |

Each correction identifies the affected prior revision/assertion, the reason,
checker and evidence. The earlier revisions remain available as superseded
assertions. No removal, installation or physical swap is asserted on September 4.

**Check:** a historical query distinguishes what was recorded on September 2
from the corrected account recorded on September 4. If the evidence cannot
establish the earlier occupancy, record uncertainty rather than a fabricated
effective date. Correct every affected record, not just the building document.

## 6. Explicit import conflict

| Input | Definition |
| --- | --- |
| Supplier-A@2 / Beam | Maximum design span 4 m for the stated conditions |
| Supplier-B@7 / Beam | Maximum design span 6 m for the stated conditions |
| Candidate class | Position R requires a 5 m span but refers to unqualified `Beam` |

Both definitions may exist, but importing B last does not select it. The
unqualified reference is unresolved. Explicitly qualifying R's reference as
Supplier-B@7 / Beam resolves the selection ambiguity; separate checks must still
establish that its full requirements and interfaces suit the design.

If the importer also imposes Supplier-A@2's 4 m constraint on R, qualification
does not resolve the incompatible 5 m requirement. Reject the composition until
the design is explicitly revised. An author cannot silently merge properties
from A and B or claim A's approval for a newly derived hybrid.

**Check:** reversing import order gives the same unresolved or resolved outcome.
Name resolution and engineering compatibility are distinct checks. An exact
duplicate dependency can resolve to the same original definition without
inventing a new class or choosing a newer revision.

## Outcomes for review

These scenarios require immutable, qualified references and clear snapshot
assertions, but do not require an event-sourcing platform, signature implementation
or inheritance. Publication sets above are explanatory bindings of revisions;
their representation is deliberately open.

The important remaining choices are recorded in the architecture's review
checkpoint: reference syntax and resolution, scope/validation, time and correction
fields, coordinated acceptance, assignment cardinality and compatibility with the
existing format. The examples should become acceptance fixtures only after those
choices are reviewed.
