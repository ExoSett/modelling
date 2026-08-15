# ExoSett model XML format

## Purpose and scope

The format is a common, application-independent language for describing ExoSett buildings. ExoSett Sketch is expected to be its first producer and consumer, but Sketch does not own the format.

Version 0.1.0 establishes only a small vocabulary: metadata, an accommodation frame, a related service frame, optional abstract accommodation-module types, and placements of those modules in accommodation-frame cells. It records dimensions in cells and permits optional physical dimensions with explicit units. It does not describe frame nodes, loads, materials, connections, services, circulation, manufacture, assembly, or operation.

Future additions should be driven by real modelling use cases. The format may eventually support substantially richer work, but this version deliberately avoids guessing at a future engineering data model.

## No universal engineering specification

ExoSett is a broad concept, not a single authoritative engineering system. Organisations may define their own frame systems, frame nodes, module interfaces, dimensions, materials, manufacturing methods, and engineering practices.

A model can optionally identify a design authority, family, specification, and revision. These values are descriptive references supplied by the model author; they do not imply endorsement or conformance to a central ExoSett specification. A basic model need not provide them.

Validation against the XSD checks document structure only. It does not establish that a design is structurally sound, manufacturable, safe, legally compliant, or otherwise valid.

## Document structure

The root element is `exosettModel` in the namespace `https://exosett.org/xml/model/0.1`. Its required `formatVersion` attribute records the semantic specification version and is `0.1.0` for this schema.

Core children appear in this order:

1. optional `metadata`, containing human-facing title, description, authorship, and design references;
2. required `frames`, containing one accommodation frame and one service frame;
3. optional `moduleTypes`, defining abstract accommodation-module types;
4. optional `modulePlacements`, locating module instances at zero-based cell coordinates;
5. optional `applications`, containing application-specific extension elements.

Frame sizes use `widthCells`, `heightCells`, and `depthCells`. This version defines those axes only as a consistent integer coordinate system; it does not assign geographic directions. Placements use zero-based `x`, `y`, and `z` cell coordinates. The XSD does not check whether a placement lies inside a frame or overlaps another module; consumers should perform those model-level checks.

An accommodation module is independently supported within the accommodation frame. The service frame is modelled separately and references its associated accommodation frame. No ISO container type or fixed module envelope is assumed. A module type may optionally provide width, height, and depth as decimal lengths whose shared `unit` is one of `mm`, `cm`, or `m`.

## Core data and application data

Core model data states what the author says the building is. Camera position, zoom, rendering choices, selection, and similar UI state describe how an application presents or works with that model and do not belong in the core.

The optional `applications` element accepts elements from namespaces other than the core model namespace. Each application should use a namespace it controls and schema-aware processors may validate an extension when its schema is available. Other applications can ignore extensions they do not understand without treating their content as core model data. Free-form, unnamespaced content is intentionally rejected.

## Evolution

The schema filename identifies the `0.1` major/minor family; the document carries the complete `0.1.0` semantic version. See [versioning.md](versioning.md) for the policy. Major-version changes are expected to use a new namespace. Whether a minor change also needs a new namespace will be decided when the first such change is designed, based on its compatibility requirements rather than a premature rule.

