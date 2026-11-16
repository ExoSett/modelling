# Bounded 2.0.0 implementation plan

Status: retained implementation plan, 16 November 2026. Implementation was
subsequently authorized and the bounded prototype is now available. This document
preserves the planning recommendations; the [prototype contract](format-2.0.0.md)
and [findings](prototype-2.0.0-findings.md) record actual choices and deviations.
The review checkpoints below describe the original plan, not a new authorization.
This plan translates the [architecture](information-model.md) and
[seven examples](information-model-examples.md) into a limited first release.

## Minimum viable scope

Implement three principal document roots, immutable revision references, local
and imported component definitions, design positions and building realizations,
physical assignments, minimal snapshots/evidence/corrections, and validation of
coordinated publication sets. Demonstrate them with the seven examples. Preserve
the existing geometry vocabulary sufficiently to migrate copies of the three
legacy examples as design documents without inventing physical assets.

The release must distinguish an explicit assertion from missing information and
check reference/record consistency. It will not certify engineering correctness.
Start with nominal dimensions, unit-bearing properties and explicit requirements
needed by the fixtures; do not invent a structural solver, general constraint
language or complete service network model. Importing makes a definition available;
only an explicit use reference connects it to a design occurrence.

## XML contract and schema organisation

Recommended roots, all requiring `formatVersion="2.0.0"`:

| Root | Purpose |
| --- | --- |
| `buildingClass` | Definitions, imports, declared scope, positions and arrangement |
| `buildingInstance` | Building identity, adopted class revision, realized positions and recorded assignments |
| `componentInstance` | External physical identity, class reference, recorded state and evidence |

Retain `https://www.exosett.com/xml/model` for these roots, consistent with the
existing stable-namespace policy. Dispatch by namespace, root and explicit format
version, never by namespace alone. Retain `exosettModel` as the 1.0.0 root. No
automatic latest-schema selection or silent translation is permitted.

Use an XSD 1.0 entry point `schema/exosett-model-2.0.0.xsd` with version-specific
included files under `schema/2.0.0/` for common, class, building-instance and
component-instance types. Separate entry schemas/version directories avoid
mixing 1.0.0 and 2.0.0 type declarations in one schema set. Schema `xs:include`
assembles the format; it is not the domain's design-import mechanism.

Propose a separate, small `publicationSet` XML root and XSD in the application
namespace `https://www.exosett.com/xml/publication`, with its own explicit version.
It binds revisions and acceptance metadata, not a fourth principal domain
category. This supporting artefact needs explicit approval at the checkpoint.
Future signatures may be external to it; none are implemented now.

## Identity and reference representation

Use explicit fields rather than embedding parsing rules in names:

| Subject | Proposed representation |
| --- | --- |
| Document | Absolute URI identity, independent of retrieval location |
| Revision | Opaque immutable revision token, qualified by document URI; predecessor revision reference |
| Definition or class position | Stable local key qualified by document and exact revision |
| Building position | Stable local key qualified by building identity; its snapshot maps it to an exact class position/revision |
| Reference designation | Separate value with scheme/context; mutable across revisions without changing position identity |
| Physical component | External identifier value, scheme and issuer/context; document identity remains separate |
| Component assignment evidence | Reference to component document/revision plus the building-position assignment |

These are digital document/reference conventions, not a new physical serial-number
scheme. Keep local keys compatible with XML ID lexical rules, but cross-document
references are structured fields, not `xs:IDREF`. Labels and coordinates never
serve as implicit identity. One component document identifies one physical item
in the initial profile; duplicate identity claims across documents require review.

Resolve through an explicit local catalogue mapping document/revision pairs to
files and integrity digests. Recommend SHA-256 over stored bytes for this initial
integrity check, not XML canonicalization or signatures. A revision-key collision
with different bytes fails; even a formatting edit creates a different stored
artefact. Documents need not contain their own digest. Independent revision tokens
allow reciprocal references; publication sets bind exact files without circular
content-hash dependencies. Automatic network retrieval is outside initial scope.

## Fragments, imports and positions

Class documents declare a scope such as definitions-only or building arrangement,
with a human-readable purpose. Do not introduce a different fragment root or a
flag purporting to prove completeness. Require at least one meaningful definition
or arrangement; validate applicable profile requirements separately from approval.

Imports identify exact revisions and expose explicitly selected definitions under
unique local aliases. Resolve the transitive dependency closure from the catalogue;
report missing dependencies, wrong target kinds, ambiguous references and cycles.
Reject import cycles initially. Two pinned versions may coexist under different
aliases; never pick one by order or date. Imported but unused definitions create
no positions or physical assignments. Explicit selection resolves naming ambiguity,
not incompatible engineering constraints. Start with named, unit-bearing properties
and fixture-specific semantic checks; mark unsupported engineering checks as not
assessed rather than passing them.

Class revisions preserve stable position keys for declared continuations and record
designation/geometry changes separately. Building revisions explicitly map stable
building-position keys to positions in the adopted class revision. Adoption is local
to the building; publishing a class does not migrate its users.

Represent continuity decisions, retired keys and predecessor references minimally.
Renaming keeps identity; moving/modifying needs an explicit continuation decision;
splits/merges use new keys linked to retired predecessors. Reject recycled retired
keys and unresolved predecessor references against available lineage. Do not infer
equivalence or implement automatic reconfiguration. Report incomplete history when
lineage required for a check is unavailable.

## Assignments and shared components

Distinguish spatial grouping positions (such as bays), physical installation
positions and relationships between groups and installations. For the initial
profile, each installation position has at most one occupant, and a physical
component has at most one concurrent installation location within the supplied
accepted record set. A group may contain many installation positions.

A shared service frame has one installation position and one component identity;
multiple frame-pair groups refer to that same installation position. Do not create
two copies of the physical frame or two conflicting deployments. Represent
group membership separately from assignment. The same applies to explicitly shared
structural assemblies. Detailed nested component inventories and multi-location
service networks are deferred; unsupported cases must be reported as such.

Support occupied, unoccupied and unknown assignment states explicitly. A component
snapshot supports installed, storage, transit, repair and unknown states with
appropriate context references. These states describe records, not a comprehensive
operational workflow. Changes of physical deployment coordinate the affected
building and all incoming/outgoing component records. Routine later inspection
does not invalidate the earlier component revision cited as installation evidence.

## Minimal snapshot and publication metadata

Require identity, revision, recording time and author/responsible-party reference.
For physical snapshots, require either a stated effective time or explicitly
unknown effective time; allow date precision as well as timezone-bearing date/time.
Observation time is optional where relevant. Do not invent precision or assume
recording time equals physical change time. Reject malformed times, but allow a
later correction to have an earlier effective time.

Include a change explanation, scoped evidence references and explicit correction
targets with reason. Adoption/design basis, conformity assessment and deviations
remain separate fields; a minimal assessment may be not assessed with referenced
evidence. Evidence and approval references identify exact subjects and revisions;
no approval inheritance, signature verification or comprehensive approval lifecycle
is implemented. Normative evidence needed to interpret an issued record must be
available as pinned artefacts, not silently resolved from mutable URLs.

A publication set identifies predecessor and resulting revisions, operation or
correction context, effective time and evidence, plus status and responsible party.
Recommend immutable prepared and accepted publication-set revisions: acceptance
creates a new set revision rather than editing a previous artefact. The application
selects a declared accepted baseline; file order or highest revision number does
not establish acceptance. Coordinated records may be prepared separately but must
not be reported as a consistent accepted set while required counterparts are absent.
Later withdrawal/correction is another assertion, not deletion of historical data.

Validation is bounded to the submitted set, its baseline and available dependencies.
It cannot establish that no conflicting record exists in another organisation.
Human checks, evidence and signatures remain responsible for actual acceptance.

## Validation and acceptance tests

Use XSD for structure, primitive types, required fields and local constraints.
Build a separate command-line semantic validator for reference resolution, lineage
and snapshot consistency; recommend Python with an explicitly pinned XSD-capable
dependency rather than relying on browser parsing. Return portable diagnostics
including file, revision and offending reference. Distinguish structural failure,
unresolved dependency, semantic inconsistency and engineering checks not performed.
Disable external entity expansion and resolve only declared catalogue artefacts.

| Worked example | Positive acceptance | Negative acceptance |
| --- | --- | --- |
| 1: reuse | Two classes resolve the same beam and transitive interface revision; unused import creates no occurrence | Reject mutable/missing revision, wrong reference kind, duplicate alias and import cycle |
| 2: replacement | One building and both incoming/outgoing component revisions form a consistent set; position unchanged | Reject missing counterpart, conflicting occupant or two documents claiming the same physical identity without resolution |
| 3: transfer | Storage/transit precede installation elsewhere; identity persists | Reject incompatible simultaneous accepted deployments or transit asserted as installed |
| 4: repair | Absence, repair evidence and reinstallation are represented; later inspection can stand alone | Reject references to nonexistent repair evidence or building/component deployment disagreement; do not require a building revision for inspection alone |
| 5: correction | Earlier effective assertion corrected later with targets and evidence; original retained | Reject missing correction target/reason or attempts to change bytes under the same revision key |
| 6: conflict | Qualified selection gives the same result regardless of import order | Reject ambiguous use; fixture check rejects 5 m against an applicable 4 m maximum; aliasing does not suppress it |
| 7: extension | E explicitly adopts five-bay revision; F remains three-bay; renamed position and unchanged components retain identities | Reject designation-based identity substitution, retired-key reuse, missing continuity decision, wrong building realization or reference outside adopted class revision |

Also test a single shared service-frame installation referenced by two groups,
unit-aware dimension handling, explicit unknown states, fragment scope checks,
invalid roots/versions and legacy/new format dispatch. Tests must not claim to
verify physical reality or full engineering suitability.

## Compatibility, migration and Sketch

Keep `schema/exosett-model-1.0.0.xsd` and `examples/*.xml` unchanged. Put new
fixtures in `examples/2.0.0/` with positive/negative sets distinguished. Validate
legacy examples against their own schema in the same verification command.

Migrate copies of minimal, modules and opposing-pair examples into Building Class
Documents: dimensions become definitions/configuration and module placements become
design occurrences. Record source provenance and any identity mappings introduced.
Do not create physical buildings, serial identities, manufacture or installation
history from these inputs. A separately authored hypothetical instance fixture
must be clearly labelled as such. Do not silently merge coincident service-frame
records: a human must decide whether they denote one shared assembly.

Sketch can remain a 1.0.0 bootstrap producer/consumer for the first 2.0.0 release.
Use explicit conversion outside Sketch for concept migration if needed. Do not
advertise 2.0.0 support or silently feed new roots to its current parser. Any later
subset support is a separate change with clear interpretation/export boundaries
and the full [Sketch release gate](releasing-sketch.md). This plan requires no
Sketch code, website packaging or production changes.

## Standards decisions and human review

The [standards mapping](information-model-standards.md) provides sources and
publication status. Before fixing fields, inspect normative requirements and one
realistic supplier identifier under ISO/IEC 8506 and 15459. Recommend preserving
scheme/issuer/value rather than prescribing an ExoSett physical ID. Developing
8506-21 is informative direction, not a conformance basis.

Compare the position/realization model with ISO 81346 and IFC type/occurrence and
relationship concepts before freezing representation. Recommend keeping external
reference designations separate from stable internal keys; do not assume an IFC
object identifier supplies the manufacturer's lifetime item identity. Full IFC
exchange and a conformance programme are deferred.

Human judgement is required to approve this bounded representation and supporting
publication artefact, choose the initial identifier/reference-designation profile,
accept the limited shared-installation rule and decide migration ambiguities.
For actual projects, people determine whether a position continues and whether
evidence justifies conformity or acceptance. Validators check the recorded decision.

## Implementation sequence after authorization

1. Resolve the focused standards/profile decisions and approve roots, namespace,
   reference structure, time rules and publication-set boundary in this plan.
2. Author proposed XML fixtures for all seven scenarios plus shared-frame and
   negative cases; review the representation before making it normative.
3. Implement the versioned XSD files and structural validation, retaining legacy checks.
4. Implement catalogue resolution and semantic checks against explicit baselines;
   test imports, continuity, corrections and coordinated sets.
5. Migrate copies of legacy examples, document unsupported cases and finalize the
   2.0.0 contract/versioning documentation. Review fixtures and diagnostics together.
6. Release only after all bounded acceptance cases pass. Treat Sketch adaptation
   and engineering-vocabulary expansion as subsequent separately reviewed work.

Defer inheritance, signatures, comprehensive approvals, distributed transactions,
automatic reconfiguration, detailed physical split/merge identity policies, full
service routing, complete asset management and engineering analysis. Later optional
capabilities can use compatible minor releases; incompatible meaning changes still
require major releases. The main risks are mistaking technical validation for
engineering acceptance, overclaiming conflict detection beyond available records,
and choosing identity syntax before standards checks. Stop here for review.
