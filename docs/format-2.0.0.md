# ExoSett 2.0.0 prototype: format and tools

This is a working, deliberately bounded candidate for review. It is not a released
engineering standard. Read the [architecture](information-model.md),
[executable fixtures](../examples/2.0.0/README.md) and
[implementation findings](prototype-2.0.0-findings.md) alongside this contract.

## Run validation

Requires Python 3.10+ and `xmllint` from libxml2. No Python package installation is
needed. The implementation uses the standard library for XML/references and invokes
`xmllint --nonet --schema` for XSD validation. From the repository root:

```sh
python3 scripts/check_models.py
python3 scripts/check_models.py --report test-results/review.json
python3 scripts/validate_model.py examples/2.0.0/positive/02-replacement/catalogue.xml
python3 scripts/validate_model.py --structural-only examples/minimal.xml
python3 -m unittest discover -s tests -v
```

`check_models.py` retains JSON diagnostics and a sibling `.log` file, including
failures. `validate_model.py` writes JSON and exits 0 for consistency within its
stated scope or 1 for errors. Structural-only mode makes no semantic claims.
Warnings distinguish explicit unknown information, prepared publication sets and
checks that cannot assess an engineering requirement. A successful prepared set
is not an accepted physical state. Every result states that engineering is not
assessed. No browser, website or production deployment checks are performed.

## Roots and schemas

The modelling namespace remains `https://www.exosett.com/xml/model`.
`buildingClass`, `buildingInstance` and `componentInstance` declare
`formatVersion="2.0.0"`. Their entry schema is
[`exosett-model-2.0.0.xsd`](../schema/exosett-model-2.0.0.xsd), with common and
document-specific XSD 1.0 files in `schema/2.0.0/`.

`publicationSet` uses `https://www.exosett.com/xml/publication` and
[`exosett-publication-2.0.0.xsd`](../schema/exosett-publication-2.0.0.xsd). Its immediate
children are in the publication namespace; children inside its typed `metadata`
element use the modelling namespace. It is a supporting coordination record,
not a fourth principal domain document.

Dispatch requires namespace, root and explicit format version. Legacy
`exosettModel` with version 1.0.0 continues using its original schema. Do not load
both schema generations into one schema set or select a schema based only on
the namespace. A schema include is not a domain import.

## Identity, revisions and local catalogues

Every principal document and publication set has `id` (absolute document URI),
`revision` (opaque nonempty token) and `formatVersion`. Tokens `latest` and
`current` are rejected. `metadata/previous` identifies the preceding revision of
the same document; one initial revision is permitted per document in a catalogue.
Historical files are never overwritten by validation.

References use `document`, `revision` and, for definitions/positions, `target`.
Local definition and position keys use XML ID-compatible names. They are technical
keys, not physical serials or inferred reference designations. Document identity
does not prescribe storage location. Date order or numerical revision order does
not select an accepted state.

An unnamespaced catalogue has `version="1"` and entries such as:

```xml
<catalogue version="1">
  <document id="https://example.invalid/design" revision="5"
            path="design-5.xml" sha256="DIGEST_OF_FILE_BYTES"/>
  <artifact id="https://example.invalid/evidence" path="inspection.txt"
            sha256="DIGEST_OF_FILE_BYTES"/>
</catalogue>
```

The digest placeholder above must be replaced by the actual SHA-256 hex digest.
Paths must resolve inside the catalogue directory, including through symlinks.
Documents must match their catalogue identity/revision. Duplicate keys, absent
files and digest mismatches fail. All imports and normative evidence resolve
through this explicit catalogue; there is no implicit network retrieval.
DTD/entity declarations are rejected before parsing. Changes to whitespace alter
stored bytes and therefore the digest. This is integrity checking, not signatures
or protection from someone rewriting both a document and its catalogue.

## Common snapshot metadata

`metadata` contains a required `change` explanation, optional `previous`, zero or
more `evidence` links and zero or more `correction` references, in that order.
It requires `recorded` and `author`; physical snapshots and publication sets also
require `effective`, which may be `unknown`. `observed` is optional.

The date profile accepts `YYYY-MM-DD`; date-times must include a timezone and use
Python ISO date/time lexical forms. Date precision is retained as a day interval,
not silently treated as an exact instant. A recorded correction may have an earlier
effective date. Deployment changes that clearly predate the preceding state require
explicit correction handling. Uncertain effective time remains valid with a warning.

Evidence uses `artifact`, `subject` and `role`. Subject `$document` means the exact
containing revision; otherwise it names an ID within that revision. An approval can
therefore address a particular definition without approving the whole building.
External manufacture, inspection, repair, approval and source records can be linked
without defining their entire schemas. The tool verifies availability and subject
resolution, not the evidence's truth, authority, signature or continuing validity.

A correction identifies an ancestor document revision and a nonempty `reason`,
and requires evidence. The current implementation corrects a whole snapshot, not
an executable XML patch. Earlier assertions remain accessible. `assessment`
separately records `not-assessed`, `recorded-conforming` or `recorded-deviations`;
the latter two require evidence, and recorded deviations require descriptions.
These values are author assertions, never a validator-issued approval.

## Building Class Documents

Declare `scope="definitions-only"` or `scope="arrangement"` and a `purpose`.
A fragment uses the same root and schema. Empty/import-only records without a
definition or arrangement fail the initial profile. A definitions-only record
cannot contain positions or frame geometry.

Definitions have stable `id`, a descriptive `kind`, optional description, dimensions,
maximum span and explicit `use` dependencies. The vocabulary deliberately covers
nominal geometry and illustrative constraints, not detailed materials, load cases,
tolerances or service engineering. Put contextual limitations in descriptions and
referenced evidence rather than inventing unsupported engineering XML.

An `import` selects an exact document/revision/definition under a unique `alias`.
`use` specifies exactly one of `local="definition-id"` or `import="alias"`.
No imported definition is instantiated merely by importing it. All imports resolve,
including unused ones. Import cycles and cyclic definition use are rejected. Aliases
do not merge definitions or confer approval. A position's `requiredSpan` is checked
against every directly used definition's `maxSpan`, with mm/cm/m conversion.
This comparison is consistency between supplied numeric assertions, not a structural
capacity calculation. No applicable maximum yields an unassessed warning.

Positions distinguish `group` from `installation`. Their `designation`, optional
`designationScheme`/`designationContext`, optional placement and stable `id` are
separate. A group refers to members; multiple groups may refer to the same
installation. Only installation positions can receive physical components.

Continuing positions explicitly identify their predecessor and use `continuity`
of `unchanged`, `renamed` or `modified`. Changed position content cannot claim to
be unchanged or merely renamed. Removed positions are listed as `retired`; retired
keys cannot be reused in later lineage. New positions may name retired predecessor
positions for split/merge lineage. This records a decision, not an automatic
reconfiguration algorithm. Lineage must be available for these checks.

For legacy design migration, the prototype retains frame-pair placement, grid and
frame cell dimensions. A `cell` links a design installation position to a particular
pair/frame and grid indices; membership, bounds and overlap are checked. This
geometry is not a manufactured component inventory.

## Building and Component Instance Documents

A building document identifies `building` independently of its document URI,
adopts an exact class revision through `design`, and records an assessment.
Each building position has its own stable key and a `design` reference to a class
position in that adopted revision. Realize every declared class position once,
using `unknown` rather than silently omitting an unrecorded occupant. This means
completeness only within the declared design scope, not the entire physical building.

Position states are `occupied`, `unoccupied`, `unknown` and `group`. Only occupied
positions carry a component document/revision reference. Its installation evidence
must agree with that building and position and match one of the directly specified
component classes. Alternate-class substitution and general engineering equivalence
are not implemented. Building realizations cannot silently switch to another
class-position identity; use new positions and explicit predecessor/retirement
relationships where needed. Different buildings may adopt different class revisions.

A component document records an `identity` with `scheme`, `issuer` and `value`, an
exact `class` reference, `state`, `condition` and assessment. Identity stays fixed
across its document revisions; duplicate identity claims by different documents
fail. Fixture identifiers are fictional supplier identifiers, not an ExoSett scheme
or examples claiming standards compliance.

States are installed, storage, transit, repair and unknown. Installed state requires
a building identity and stable position key. Storage/transit/repair require a
context description; they cannot also claim an installed location. Evidence can
describe manufacture and each later inspection without imposing an event log.
An informational revision need not cause a building revision. Its deployment and
class qualification must still agree with the accepted installation evidence.

## Publication sets and validation boundaries

Publication sets record `status` (prepared/accepted), `operation`
(initial/change/correction), metadata, optional accepted `baseline` and result
references. A change/correction needs a baseline; an initial set has none. Each
result advances the baseline's revision of its document, or introduces an initial
record. The baseline's unchanged records remain part of the resulting state.
There is at most one resulting revision per document in a set.

Prepared and accepted records are immutable revisions: accepting a prepared set
creates a later set revision with the same coordinated results and accepted status.
This prototype records acceptance, but does not authorize the person or certify work.
Conflicting accepted successor sets updating the same document differently from
the same baseline fail; no winner is chosen by file order. Separate independent
branches are not automatically combined into a global state.

Accepted sets reconcile all current building assignments and component locations.
New assignments require corresponding component updates. Removed items cannot
remain installed in the old component snapshot. A component cannot occupy two
locations concurrently within that resulting state. Physical changes must share
the publication's effective boundary (including explicit unknown); intermediate
steps can have their own sets/evidence. Later inspections can advance component
records while the building retains its historical installation evidence revision.

Prepared sets report counterpart disagreement as warnings rather than pretending
coordination is complete. Broken references and malformed records remain errors
even when prepared. Validation checks all supplied historical sets against their
explicit baselines; it never infers a globally current head. Standalone physical
snapshots without publication sets receive local semantic checks only, not a claim
of coordinated acceptance.

No information system can establish actual occupancy, correctness of a repair or
absence of a conflicting record outside the supplied catalogue. Human checking,
inspection and responsibility remain essential.
