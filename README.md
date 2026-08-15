# ExoSett modelling

This repository defines and implements ways to describe and work with ExoSett models. It is the home of the common ExoSett XML interchange format, its XML Schema, examples, modelling documentation, and applications that produce or consume the format.

This role is distinct from the sibling `ExoSett/website` repository: the website presents ExoSett publicly, while this repository owns modelling formats and tools. Applications may later be published through the website without moving their source or specifications there.

## Contents

- [`docs/format.md`](docs/format.md) — scope and design of the XML format
- [`docs/versioning.md`](docs/versioning.md) — format version policy
- [`schema/exosett-model-0.1.0.xsd`](schema/exosett-model-0.1.0.xsd) — initial XML Schema
- [`examples/`](examples/) — small, validating model documents
- [`sketch/README.md`](sketch/README.md) — lightweight static ExoSett Sketch application

The initial `0.1.0` schema is deliberately limited. It can describe multiple placed frame pairs, abstract module types, and module placements. It is not an engineering specification and does not certify structural soundness, manufacturability, regulatory compliance, or fitness for any purpose.

To validate the examples on a system with `xmllint` (included with macOS and commonly available on Unix-like systems):

```sh
for file in examples/*.xml; do
  xmllint --noout --schema schema/exosett-model-0.1.0.xsd "$file"
done
```

## Licensing

Software in this repository, including applications such as Sketch, is licensed under the [Mozilla Public License 2.0](LICENSES/MPL-2.0.txt).

Specifications and documentation—including XML Schema files, format examples, and explanatory documentation—are licensed under the [Creative Commons Attribution-ShareAlike 4.0 International licence](LICENSES/CC-BY-SA-4.0.txt).

These licences do **not** require XML models merely expressed using this format to be published or licensed under CC BY-SA. Model authors remain free to keep their building designs private or proprietary. The licences also impose no ExoSett-specific conditions beyond their normal terms.

## ExoSett Sketch

Sketch is a framework-free TypeScript and Three.js application that runs entirely in the browser. Development and verification commands are documented in [`sketch/README.md`](sketch/README.md).
