# ExoSett modelling

This repository defines and implements ways to describe and work with ExoSett building models. It is the home of the common ExoSett XML Schema, examples, modelling documentation, and applications that produce or consume the format. An XML document conforming to the schema is an ExoSett building specification: the machine-readable project record of what the design team defines for the Site Office to execute.

This role is distinct from the sibling `ExoSett/website` repository: the website presents ExoSett publicly, while this repository owns modelling formats and tools. Applications may later be published through the website without moving their source or specifications there.

## Contents

- [`docs/format.md`](docs/format.md) — scope and design of the building specification format
- [`docs/versioning.md`](docs/versioning.md) — schema and building specification versioning policy
- [`schema/exosett-model-1.0.0.xsd`](schema/exosett-model-1.0.0.xsd) — current XML Schema
- [`examples/`](examples/) — small, validating building specifications
- [`sketch/README.md`](sketch/README.md) — lightweight static ExoSett Sketch application

The current schema is deliberately limited. It can describe multiple placed frame pairs, abstract module types, and module placements. It is expected to evolve through practical use and feedback rather than attempt to define every area in advance. Validation against it does not certify structural soundness, manufacturability, regulatory compliance, or fitness for any purpose.

## Building specification lifecycle

The building specification is an important project artifact from the beginning of an ExoSett project. A project may start with a simple XML document produced by ExoSett Sketch, but Sketch is not the only way to create one. The design team maintains and develops the specification, identifies and coordinates missing information, and records the project definition as it develops. The Site Office executes what the specification defines and contributes operational changes and feedback to the maintained project record. The specification continues to be maintained as the project and completed building change.

Each distinctly managed building project should have its own Git repository, with its building specification under version control from the outset. Its Git history records ordinary design development as well as any deliberate adoption of a different schema version. Schema releases and building specification histories are separate: every version of a building specification identifies the semantic version of the schema to which it conforms, while Git records that specification's evolution. See [`docs/versioning.md`](docs/versioning.md).

## Future AI-assisted workflows

The ExoSett website is intended eventually to include prompts on its role pages for AI assistance suited to each participant's responsibilities. These will be role-specific rather than one generic prompt: for example, a Building Designer may develop and coordinate the overall definition, a Module Designer may assess and refine the inputs needed for module design, and the Site Office may interpret and execute the maintained specification.

AI will be an assistant, not the source of truth. The building specification remains the project record. An assistant should work with the schema version declared by the document, take account of the user's role, identify missing or incompatible information, and avoid inventing unsupported XML or silently changing schema version. It may help interpret an older specification or support a deliberate migration, but migration is neither mandatory nor automatically directed to the latest schema version.

To validate the examples on a system with `xmllint` (included with macOS and commonly available on Unix-like systems):

```sh
for file in examples/*.xml; do
  xmllint --noout --schema schema/exosett-model-1.0.0.xsd "$file"
done
```

## Licensing

Software in this repository, including applications such as Sketch, is licensed under the [Mozilla Public License 2.0](LICENSES/MPL-2.0.txt).

Specifications and documentation—including XML Schema files, format examples, and explanatory documentation—are licensed under the [Creative Commons Attribution-ShareAlike 4.0 International licence](LICENSES/CC-BY-SA-4.0.txt).

These licences do **not** require XML models merely expressed using this format to be published or licensed under CC BY-SA. Model authors remain free to keep their building designs private or proprietary. The licences also impose no ExoSett-specific conditions beyond their normal terms.

## ExoSett Sketch

Sketch is a framework-free TypeScript and Three.js application that runs entirely in the browser. Development and verification commands are documented in [`sketch/README.md`](sketch/README.md).
