# ExoSett model XML format

## Purpose and scope

The format is a common, application-independent language for describing ExoSett buildings. ExoSett Sketch is expected to be its first producer and consumer, but Sketch does not own the format.

Version 1.0.0 establishes only a small vocabulary: metadata, one or more frame pairs, abstract accommodation-module types, and placements of those modules in accommodation-frame cells. It records enough physical dimensions and relative placement for an abstract renderer. It does not describe frame nodes, loads, materials, connections, services, circulation, manufacture, assembly, or operation.

Future additions should be driven by real modelling use cases. The format may eventually support substantially richer work, but this version deliberately avoids guessing at a future engineering data model.

## No universal engineering specification

ExoSett is a broad concept, not a single authoritative engineering system. Organisations may define their own frame systems, frame nodes, module interfaces, dimensions, materials, manufacturing methods, and engineering practices.

A model can optionally identify a design authority, family, specification, and revision. These values are descriptive references supplied by the model author; they do not imply endorsement or conformance to a central ExoSett specification. A basic model need not provide them.

Validation against the XSD checks document structure only. It does not establish that a design is structurally sound, manufacturable, safe, legally compliant, or otherwise valid.

## Document structure

The root element is `exosettModel` in the stable namespace `https://www.exosett.com/xml/model`. Its required `formatVersion` attribute records the semantic specification version and is `1.0.0` for this schema.

Core children appear in this order:

1. optional `metadata`, containing human-facing title, description, authorship, and design references;
2. required `framePairs`, containing one or more frame pairs;
3. optional `moduleTypes`, defining abstract accommodation-module types;
4. optional `modulePlacements`, locating module instances in accommodation-frame cells;
5. optional `applications`, containing application-specific extension elements.

## Frame pairs and cells

A `framePair` is a first-class object with a stable identifier. It contains exactly one accommodation frame and one corresponding service frame. A model can contain multiple frame pairs, allowing arrangements such as two pairs facing service-frame to service-frame or four pairs surrounding a central space.

Each pair has a shared regular grid. `widthCells`, `depthCells`, and `heightCells` give the number of positions along the local x, y, and z axes respectively. A **cell** is one position in this grid. An accommodation-frame cell can receive an independently supported accommodation module. The service-frame cell with the same indices is its corresponding position in the service frame.

Correspondence means that the two frames share cell indices; it does not mean that corresponding cells have identical physical depth, construction, purpose, or contents. Each frame therefore records its own `cellDimensions`. A service-frame cell may later contain or support circulation, services, bracing, connections, or other features, but version 1.0.0 does not model those features.

### Placement and orientation

Every frame pair has a `placement` in a shared right-handed model coordinate system:

- `x`, `y`, and `z` locate the pair's local origin, using the explicit `unit`;
- positive local x follows frame width;
- positive local y follows frame depth, from the accommodation frame toward and then through the service frame;
- positive local z follows frame height;
- the origin is the corner at minimum local x and z on the outer accommodation-frame face (minimum local y);
- `rotation` is `0`, `90`, `180`, or `270` degrees counter-clockwise about positive z when viewed from above.

Translation is applied in model coordinates and rotation occurs about the frame-pair origin. These rules let implementations place adjacent and opposing pairs consistently without arbitrary transformation matrices.

### Module placement

An accommodation-module placement explicitly references its module type, frame pair, and accommodation frame. Its zero-based `x`, `y`, and `z` indices select a cell along grid width, depth, and height respectively. These explicit references avoid ambiguity in a multi-pair model.

The XSD verifies that each reference resolves to an XML ID, but XSD 1.0 cannot require that it resolves to the stated kind of object or that the referenced accommodation frame belongs to the referenced pair. It also does not check cell bounds or overlapping modules. Consumers should enforce those model-level constraints.

## Module and cell dimensions

An accommodation module's `dimensions` describe its physical envelope. An accommodation frame's `cellDimensions` describe its physical grid cell; the service frame records its own cell dimensions separately. Width, height, and depth are positive decimal lengths with an explicit unit of `mm`, `cm`, or `m`.

These are distinct model facts. A module envelope, an unobstructed envelope needed for installation or removal, and structural grid geometry need not be identical. Sketch may derive a useful default cell size from a module plus clearance, but that calculation is application behaviour rather than a rule of the common format. Version 1.0.0 records the resulting module and cell dimensions without modelling clearance, member profiles, nodes, or tolerances.

No ISO container type or fixed envelope is assumed. Dimensions resembling an ISO 668 1CCC module, if used in examples or models, are ordinary data rather than a fundamental ExoSett constraint.

## Core data and application data

Core model data states what the author says the building is. Camera position, zoom, rendering choices, selection, and similar UI state describe how an application presents or works with that model and do not belong in the core.

The optional `applications` element accepts elements from namespaces other than the core model namespace. Each application should use a namespace it controls and schema-aware processors may validate an extension when its schema is available. Other applications can ignore extensions they do not understand without treating their content as core model data. Free-form, unnamespaced content is intentionally rejected.

## Evolution

The schema filename `exosett-model-1.0.0.xsd` identifies the exact semantic version. Documents retain the stable modelling namespace and carry their complete version in `formatVersion`. Consumers use that version to distinguish incompatible formats.

See [versioning.md](versioning.md) for the version policy.
