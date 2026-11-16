# Information-model standards mapping

Status: focused architectural mapping, checked 16 November 2026 against the
official catalogue pages linked below. This is based on public scopes and
publication status, not a full normative-text review or claim of conformance.
It accompanies the [architecture](information-model.md) and
[worked examples](information-model-examples.md).

ExoSett should use established identification, classification, terminology and
exchange standards where practical. The following are alignment candidates, not
a commitment to a particular identifier or serialization syntax.

## Priority mapping

| Standard and official source | Published scope/status | Proposed ExoSett alignment and investigation |
| --- | --- | --- |
| [ISO/IEC 8506:2024](https://www.iso.org/standard/83196.html) | Published; AIDC application in industrial construction, including lifecycle identification, data semantics, carriers and information services | Investigate physical-component identity and its relationship to markings and information access. Review applicable requirements and referenced identity schemes before selecting an encoding. It does not by itself specify ExoSett's complete document architecture. |
| [ISO/IEC 8506-21 project](https://www.iso.org/standard/94201.html) | Under development; project page labels it AWI. Proposed scope covers identification and tagging of prefabricated structural components including concrete, steel and timber items | Particularly relevant to beams and columns. Monitor the developing requirements; do not treat the draft as a published standard or freeze ExoSett syntax around it. |
| [ISO/IEC 15459-4:2014](https://www.iso.org/standard/54782.html) | Published; identification of individual products and product packages; confirmed in 2025 | Investigate identifier uniqueness and use of existing issuing schemes for physical items. Preserve scheme/issuer context and externally supplied identity rather than inventing an ExoSett serial-number system. |
| [ISO/IEC 15459-2:2015](https://www.iso.org/standard/54780.html) | Published; registration procedures and responsibilities of registration/issuing authorities | Determine how actual suppliers obtain and maintain identifiers; inspect applicable exclusions and related common rules before recommending a deployment scheme. |
| [ISO 81346-12:2018](https://www.iso.org/standard/63886.html) | Published, confirmed in 2024; construction/system reference designations. Its scope excludes serial/inventory identifiers and product-type numbers | Align design positions and system occurrences with reference-designation practice. Do not use an occurrence designation as the lifetime identity of its replaceable occupant. |
| [IEC 81346-1:2022](https://webstore.iec.ch/en/publication/64021) | Published; general system structuring and reference-designation rules | Investigate functional, product and location views and how they qualify ExoSett positions. A position need not be merely a geometric slot. Review the associated classification rules before selecting codes. |
| [ISO 16739-1:2024 / IFC](https://www.iso.org/standard/84123.html) | Published; open BIM data schema and exchange information for construction/facility management | Compare class/type, occurrence, spatial and relationship concepts before fixing ExoSett's representation. Decide which information should map to IFC or reference an IFC model. Do not assume an exchange-object identifier is automatically an industrial physical-item identifier. |

The ISO committee catalogue has also described 8506-21 as a working draft while
the individual project page retains its AWI label. The relevant architectural
fact is that it is unpublished; precise development labels should be rechecked
when implementation decisions are made. See the
[responsible committee catalogue](https://www.iso.org/cms/live/live/en/sites/isoorg/contents/data/committee/04/53/45332/x/catalogue/).

## Closely related work

- [IEC 81346-2:2019](https://www.iso.org/standard/75265.html) provides object
  classification and codes. The catalogue consulted lists it as published with
  a replacement under development. Classification categories are not the same
  as ExoSett engineering definitions; pin the selected edition when adopting codes.
- [ISO 23386:2020](https://www.iso.org/standard/75401.html) is published and concerns
  properties and interconnected data dictionaries. Investigate it when defining
  reusable engineering properties, rather than creating ambiguous local terms.
- [ISO 19650-1:2018](https://www.iso.org/standard/68078.html) is published, with a
  replacement under development. Its information-management framework is relevant
  to responsibilities, recording, versioning and exchange. It informs human
  processes; it does not require this increment to implement an enterprise platform.

## Before choosing a representation

1. Review the applicable normative text and supplier practices for 8506 and
   15459: identity allocation, persistence, data carriers and information resolution.
2. Work through one beam replacement using 81346 designations alongside an
   independently assigned physical-item identifier. Preserve both meanings.
3. Compare a class/occurrence/assignment example with IFC. Identify reusable
   constructs, mapping limits and information that must remain external.
4. Record the editions and requirements actually adopted. Distinguish alignment
   intentions from tested conformance, and keep developing standards provisional.

The current example labels deliberately make none of these choices. There is no
ExoSett identifier syntax, classification code list, standards-conformance claim
or mandated tag technology introduced by this documentation pass.
