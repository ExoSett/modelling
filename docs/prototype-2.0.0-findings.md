# 2.0.0 prototype: decisions and discoveries

The full bounded prototype now exercises all three principal document types and
publication sets. It is ready for inspection and experimentation, not a claim
that the architecture is finished. See [usage and contract](format-2.0.0.md).

## What implementation established

- Shared frames fit naturally as one installation referenced by several groups.
  Making each group own a separate physical assignment would duplicate the asset.
- Position identity can survive renaming and class adoption without generating new
  component revisions. A building realization is distinct from its class position;
  another building can stay on the earlier class revision.
- The building's installation-evidence revision and the accepted latest component
  snapshot are different references. Checking their deployment agreement permits
  later inspections without cascading building revisions.
- Corrections need different temporal meaning from physical operations. The same
  effective date with later recording and explicit correction provenance expresses
  a corrected account without fabricating a replacement operation.
- Unknown facts can be valid records. Prepared sets can be incomplete coordination.
  Neither should be confused with unresolved references or contradictory accepted
  records. Diagnostics separate these cases.

## Implementation decisions and compromises

1. **Standard-library Python plus xmllint.** The plan recommended a pinned Python
   XSD dependency. The workspace already provides libxml2's `xmllint` and lacks
   lxml, so the prototype uses the existing XSD capability rather than adding a
   package. This preserves real XSD validation with a small installation surface.
   Tested commands and runtime versions can be recorded with a review report.
2. **Explicit local catalogue.** URI/revision references resolve to files with
   byte-level SHA-256 digests. This detects mismatches, not authenticity or tampering
   with both catalogue and records. No remote resolver or storage service is built.
3. **Publication sets bind physical snapshots.** They reference an accepted baseline
   and resulting snapshots. Class dependencies resolve separately. Prepared-to-accepted
   transition creates a set revision; it does not mutate old acceptance metadata.
4. **Limited time profile.** Date-only and timezone-bearing date-time values are
   supported, as is explicit unknown effective time. Coordinated changes use one
   common effective boundary. Complex uncertain intervals and asynchronous operation
   histories remain evidence or separate snapshots, not a temporal database.
5. **Explicit whole-snapshot correction.** Corrections address predecessor revisions
   with reason and evidence. Field-level patching, retrospective automatic replay
   and a universal conflict-resolution policy are not implemented.
6. **Simple assignment rules.** One occupant per installation and one location per
   physical item in a resulting accepted state. Multiple groups may share an
   installation. Detailed constituent inventories, multi-location service systems
   and automatic reconciliation of unrelated class lineages remain unsupported.
7. **Modest engineering vocabulary.** Nominal dimensions, optional positions,
   descriptions, direct definition uses and an explicit span comparison exercise
   the architecture. Material certificates, tolerances, inspections and approvals
   can be scoped evidence; the prototype does not pretend to formalize their full
   engineering semantics. Inheritance and engineering solvers remain absent.
8. **Design-only migration.** Copies of all three legacy examples preserve their
   frame geometry, module envelopes and design occurrences. Original source bytes
   are retained as pinned evidence, preserving metadata and application extensions
   not interpreted by the prototype. No physical identities or history are inferred.

## Standards investigation and remaining representation work

The physical identity tuple preserves externally supplied scheme, issuer and
value without allocating ExoSett serials. ISO/IEC 15459-4 addresses identification
of individual products; the public scope supports separating those identities
from document revisions. Selecting a deployment profile still needs applicable
normative text and actual supplier practice. No ISO conformance is claimed.
[ISO/IEC 15459-4](https://www.iso.org/standard/54782.html).

GS1's published identifier list includes GIAI (8004) and component/part identifiers;
these are candidates to investigate with suppliers, not automatically assigned by
this prototype. The examples deliberately use `example.invalid` supplier schemes
rather than fabricate an apparently genuine allocated identifier.
[GS1 Application Identifiers](https://ref.gs1.org/ai/).

ISO 81346-12 distinguishes occurrence designations from serial/inventory identifiers.
The schema therefore stores designation and optional scheme/context separately
from position identity. It does not generate reference-designation codes.
[ISO 81346-12](https://www.iso.org/standard/63886.html).

buildingSMART's released IFC4 documentation explicitly relates types to occurrences
through `IfcRelDefinesByType`. The separation used here is consistent with that
distinction, but an ExoSett building realization is not automatically an IFC GUID
or a physical-item identifier. IFC4.3 documentation retrieval was unavailable
during this pass; no full IFC4.3 mapping was inferred from the older documentation.
Exchange mapping remains a later implementation task.
[buildingSMART IFC4 type relationship](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/FINAL/HTML/schema/ifckernel/lexical/ifcreldefinesbytype.htm).

The [standards mapping](information-model-standards.md) continues to distinguish
published ISO/IEC 8506:2024 from developing 8506-21. This pass has not obtained or
implemented the full normative specifications. The deliberately neutral identity
fields allow investigation to continue without delaying executable architecture.

## Tests and review

`python3 scripts/check_models.py` validates nine positive catalogues (seven
scenarios, shared frame, migrated designs), eight negative catalogues and the three
legacy XML documents, and runs the automated adversarial acceptance suite. It saves
the actual counts, outcomes and diagnostics in JSON and a sibling test log. Negative
fixtures succeed only when they fail for the intended reason. Additional tests
exercise unknowns, prepared acceptance, integrity, safe parsing, identity continuity,
retirement, import ordering, temporal correction and independent inspection updates.

There are no Sketch or website changes. Browser, embedded-bundle, assembled-site
and production checks are not part of this prototype verification. The work is not
a website release. No digital signatures, inheritance, automatic reconfiguration,
distributed transactions or lifecycle-management application were added.

Review should focus on the executable representation, the sufficiency of the
diagnostics, acceptance/branch policies and the deliberately restricted engineering
vocabulary. A consequential future requirement is adopting an unrelated class
lineage while retaining building-position identity: this prototype does not guess
that mapping. Another is representing interval uncertainty beyond a date or
unknown value. Neither has been hidden behind automatic inference.

Stop for review before expanding the candidate contract or declaring 2.0.0 stable.
