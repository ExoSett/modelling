# ExoSett information-model architecture

Status: proposed foundation for review, 16 November 2026. This document describes
the next direction, not the implemented XML contract. The existing
[format](format.md), schema version 1.0.0 and examples remain unchanged.

The aim is to distinguish reusable engineering definitions from records of
physical buildings and components. This is an evolutionary step, not a complete
lifecycle-management system. Engineering practice, external research and use
will drive further revisions. See the [worked examples](information-model-examples.md)
and [standards mapping](information-model-standards.md).

## Three principal document concepts

| Document | Responsibility |
| --- | --- |
| Building Class Document | Reusable geometry, dimensions, structural arrangements, component classes, design positions, interfaces, service definitions, rules, tolerances and design approval references |
| Building Instance Document | One physical building: adopted design basis, position assignments, site configuration and approvals, actual routing, commissioning, modifications, assessed conformity and deviations |
| Component Instance Document | One physical component: identity, class/revision, manufacture, certification, inspections, condition, deployment, storage, repair, refurbishment and reuse |

Component classes belong in Building Class Documents. There is no fourth
principal category for component-class documents. Evidence, certificates and
publication records may support these three concepts without becoming additional
principal domain categories.

A Building Class Document Fragment is an informal description of a document
with limited scope, such as a beam specification or pod interface. It uses the
same class-document schema and semantics as a complete building definition. It
can be complete for its declared purpose without defining a whole building.
Importing fragments does not by itself make the resulting building complete or
approved.

Distinguish structural validity, resolved dependencies, suitability for a
declared purpose, and engineering approval. A valid fragment need not describe
all building systems. Conversely, omitting required information for its stated
purpose is not excused by calling it a fragment.

## Identities and relationships

| Identity | Meaning |
| --- | --- |
| Document identity | The continuing record across revisions; independent of its filename or host |
| Revision identity | One immutable version of that record; distinct from the schema version |
| Class-definition identity | A definition within a class document; interpretation also identifies the containing immutable revision |
| Position identity/reference designation | An occurrence or role in a design/system, qualified by its context; not a serial number or merely a coordinate |
| Physical-component identity | The enduring identity of a manufactured item, independent of its document revisions or current building |

An instance adopts a particular Building Class Document revision as its design
basis. Its assignment relates a building-qualified position to a physical
component and the component revision used as evidence for that assignment.
The component in turn identifies its class definition and exact design revision.
The same design position can be realized in many buildings: a bare position name
is not globally unique. Replacement changes the occupant without changing that
position's identity.

Design basis, assessed conformity and approved deviations are separate. Adopting
a design is not proof of conformance. Positions can be unfilled or their occupants
unknown; those are different assertions. A component may be in storage or repair
with no current building assignment. Assemblies may contain separately identified
components; detailed membership and identity rules are deferred.

External physical identifiers should retain their issuing scheme and context.
The illustrative labels used here are not an ExoSett identification scheme.
Storage addresses, tag technologies and classification codes do not replace
physical identity.

## Imports and composition

Imports select an exact immutable class-document revision and the definitions
required from it. The resolved transitive dependencies must also be immutable.
A mutable discovery service may help find a revision, but `latest` cannot be the
meaning of an issued design dependency. Historical interpretation must retain
access to the dependency contents and the applicable schema and semantic rules.
Storage location alone does not establish immutability or integrity.

Composition connects imported definitions to local positions, interfaces and
requirements. Qualified references or explicit aliases distinguish definitions
with similar names. Import ordering and chronology never determine precedence.
An importer must explicitly select between alternatives, establish a compatible
composition, or remain unresolved. Renaming cannot resolve an engineering
contradiction. Changing a definition creates a new definition/revision with
provenance; it does not rewrite the imported original or inherit its approval
automatically.

Inheritance is deferred. Imports and composition cover the initial examples
without introducing override or substitutability rules. Resolution details,
including cycle handling and definition export boundaries, require decisions
before schema implementation.

## Immutable snapshots and time

Each issued revision is immutable. A Building Instance or Component Instance
revision records assertions about a physical state, not a guarantee of reality.
History consists of successive snapshots with supporting evidence and change
explanations where useful; no internal mutable event log is required.

Distinguish these times when relevant:

- **Effective time:** when the described physical state or change applies.
- **Observation time:** when someone inspected or measured it.
- **Recording time:** when that information entered the record.

Publication/acceptance can occur later under the project's process. Precision
and uncertainty should be stated rather than invented. A new revision may correct
an earlier assertion without recording a new physical operation. Preserve the
superseded revision and identify what is corrected, the evidence and the reason.
Revision order therefore need not equal effective-time order.

Snapshots alone cannot recover an operation whose before/after configuration is
identical. A remove–repair–reinstall operation needs intermediate snapshots or
supporting work evidence, even if the component ends in the same position.

The existing [versioning policy](versioning.md) keeps schema versions separate
from project history. Git remains useful, but branch names and movable tags are
not immutable revision identities. Retention, access and acceptance of a history
are project responsibilities; a merge does not itself establish engineering
agreement. Physical change and format migration are also distinct.

## Checks, approvals and signatures

People inspect, check, approve and accept responsibility. The model supports
identity, provenance, traceability and correction rather than attempting to
replace those processes. Record the relevant author/observer, evidence, subject
and scope so that checks and signatures can be meaningful. Errors remain possible.

Design approvals concern identified definitions or design revisions. Site
approvals concern a building and specified configuration; inspections and
certificates concern physical components and the relevant state/evidence.
Approval conditions, departures and assessment status must not be reduced to an
unqualified assertion that everything is approved. Approval of a beam alone does
not approve its use in every building.

Definitions and approval subjects need unambiguous revision-specific addresses
so that portions of a class document could later be signed independently. XML
canonicalization, key handling, signature formats and whether signatures cover
imported content are deferred. No signature implementation is specified here.

An immutable historical approval can subsequently expire or be withdrawn.
Preserve the original assertion and associate later status evidence; do not edit
the historical design to erase it. Evidence may refer to a revision from outside
that revision, avoiding a requirement for a document to contain its own final
hash or a signature over itself.

## Coordinated revisions

Installation/removal affects the building and each physical component involved.
A batch may publish one resulting building snapshot and corresponding snapshots
for all removed and installed components. Project discipline determines when
those records are prepared and accepted.

A consistent published set must make its preceding and resulting revisions,
affected positions, effective times and supporting operation/evidence identifiable.
The building and component records must agree about deployment at the stated
time. Incomplete coordination should be visible, not silently presented as an
accepted complete set. Checks should identify incompatible concurrent assignments
and unresolved competing updates for human resolution.

The examples use a simple publication-set table, not a proposed transaction
protocol. A repository commit may bind a local set; cross-repository coordination
needs an agreed publication reference. Storage, signing and automated transactions
are deferred. Avoid requiring mutually referencing documents to embed each
other's content hashes; an external binding or independently assigned revision
identities can avoid that circularity.

A later component inspection need not force every referencing building to gain a
revision. The building can identify the component revision supporting its accepted
installation; later component evidence remains separately discoverable. Processes
must determine when new evidence changes the accepted building state or assessment.

## Existing model and Sketch

The current XML already distinguishes local module types from module placements,
explicit units from counts, module envelopes from cell dimensions, and core from
application data. Preserve these useful distinctions.

Current limitations requiring future changes are mandatory frame pairs, local
`xs:ID`/`xs:IDREF` references, descriptive rather than resolvable design references,
and absence of physical assignments and lifecycle records. Existing placements
must not be migrated into assertions of manufactured or installed assets without
evidence. The nested service-frame-per-pair assumption also needs review: Sketch
can depict a shared service frame, but currently exports two frame records.

Sketch is a bootstrap/concept tool. It may interpret its supported subset and
generate a fresh concept document without preserving the whole source. Its fixed
geometry assumptions and export scope should be explicit; successful loading is
not full validation, preservation or authoritative editing. This architecture
does not require implementing a full document editor in Sketch.

## Findings and review checkpoint

The [six scenarios](information-model-examples.md) support the three concepts.
They expose no need for a fourth component-class category or an internal mutable
event log. They do expose distinctions that schema work must preserve: qualified
positions, physical identity, correction versus physical change, and explicit
agreement between related snapshots.

### Decisions needed before schema implementation

1. Choose the representation of document/revision/definition references and
   external physical identifiers after the focused standards investigation.
2. Define fragment scope declarations, required information and validation levels.
3. Specify import resolution, qualification, conflicts, cycles and dependency retention.
4. Define assignment cardinality and assembly/shared-frame relationships for the
   first supported cases, including position continuity across class revisions.
5. Choose minimal time, correction, provenance and publication-set fields; define
   how pending versus accepted coordinated records are distinguished.
6. Decide how the new document contracts coexist with version 1.0.0 and how tools
   explicitly select a supported format. Incompatible semantic changes require
   the existing major-version policy, not silent reinterpretation.

### Safely deferred

Inheritance; digital signatures; comprehensive approval workflows; automated
cross-organisation transactions; detailed repair/split/merge identity policies;
complete service and structural engineering vocabularies; full standards
conformance; and a complete lifecycle-management application. Record limits when
a scenario exceeds the initial supported scope.

### Proposed sequence after review

1. Accept or revise this architecture and the example outcomes.
2. Investigate the specific standards questions and settle the decisions above.
3. Turn the worked examples into proposed interchange fixtures, including negative
   cases, and define semantic validation independently of XML syntax checks.
4. Introduce versioned schemas and cross-document validation for that bounded scope.
5. Migrate copies of existing examples as design/configuration records, preserve
   legacy fixtures, and add compatibility tests. Do not manufacture lifecycle facts.
6. Adapt tool import/export boundaries only as a separately scoped change, following
   the existing release requirements if Sketch or website integration is affected.

Stop at this documentation review checkpoint before implementing schemas.
