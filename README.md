# ExoSett modelling

This repository owns ExoSett modelling formats, examples, documentation and tools.
Its proposed information architecture distinguishes three complementary records:

- **Building Class Document:** reusable building and component definitions, design positions and requirements; it may describe only a limited part of a building.
- **Building Instance Document:** one physical building's recorded configuration, adopted design revision and assignments of physical components to positions.
- **Component Instance Document:** one physical component's identity and recorded state throughout manufacture, installation, removal, repair and reuse.

Component classes belong within Building Class Documents. Physical instances
reference those definitions without confusing a design position with its occupant.

The retained **1.0.0** XML format uses *building specification* for the combined
project record of what the design team defines for the Site Office to execute.
An experimental **2.0.0 prototype** now implements the three-document architecture,
supporting publication sets, XML fixtures and structural/semantic validation.
It is a candidate contract for review, not a declaration that the format is final.
Sketch continues to use 1.0.0.

This role is distinct from the sibling `ExoSett/website` repository: the website presents ExoSett publicly, while this repository owns modelling formats and tools. Applications may later be published through the website without moving their source or specifications there.

## Contents

- [`docs/information-model.md`](docs/information-model.md) — proposed three-document architecture, review findings and next steps
- [`docs/information-model-examples.md`](docs/information-model-examples.md) — illustrative snapshots and scenarios, not schema-valid XML
- [`docs/information-model-standards.md`](docs/information-model-standards.md) — standards alignment and questions for further investigation
- [`docs/implementation-plan-2.0.0.md`](docs/implementation-plan-2.0.0.md) — bounded implementation proposal and review checkpoint before schema changes
- [`docs/format-2.0.0.md`](docs/format-2.0.0.md) — prototype XML contract and validation commands
- [`docs/prototype-2.0.0-findings.md`](docs/prototype-2.0.0-findings.md) — implementation decisions, discoveries and limits
- [`docs/format.md`](docs/format.md) — scope and design of the building specification format
- [`docs/versioning.md`](docs/versioning.md) — schema and building specification versioning policy
- [`schema/exosett-model-1.0.0.xsd`](schema/exosett-model-1.0.0.xsd) — retained 1.0.0 XML Schema
- [`schema/exosett-model-2.0.0.xsd`](schema/exosett-model-2.0.0.xsd) — three-document prototype schema
- [`schema/exosett-publication-2.0.0.xsd`](schema/exosett-publication-2.0.0.xsd) — supporting publication-set schema
- [`examples/`](examples/) — retained 1.0.0 building specifications
- [`examples/2.0.0/README.md`](examples/2.0.0/README.md) — executable positive/negative prototype examples
- [`sketch/README.md`](sketch/README.md) — lightweight static ExoSett Sketch application

Both formats are deliberately limited and will evolve through practical use.
Validation checks recorded structure and consistency; it does not certify
structural soundness, manufacturability, regulatory compliance or physical reality.

The prototype does not reinterpret existing XML as physical asset records or
silently upgrade it. Version 1.0.0 schemas, examples and Sketch remain unchanged.

## Validate the prototype

Requires Python 3.10+ and `xmllint` (libxml2), with no third-party Python packages.
From the repository root:

```sh
python3 scripts/check_models.py
python3 scripts/validate_model.py examples/2.0.0/positive/07-extension/catalogue.xml
```

The first command runs acceptance tests, positive/negative fixture checks and
legacy validation, retaining JSON and a test log under `test-results/`. Use
`--report PATH` to choose another portable output location. The second command
returns JSON diagnostics and exits nonzero on invalid or unresolved records.
Explicit unknowns and prepared/incomplete coordination are reported separately.

## Implemented 1.0.0 building specification lifecycle

The building specification is an important project artifact from the beginning of an ExoSett project. A project may start with a simple XML document produced by ExoSett Sketch, but Sketch is not the only way to create one. The design team maintains and develops the specification, identifies and coordinates missing information, and records the project definition as it develops. The Site Office executes what the specification defines and contributes operational changes and feedback to the maintained project record. The specification continues to be maintained as the project and completed building change.

Each distinctly managed building project should have its own Git repository, with its building specification under version control from the outset. Its Git history records ordinary design development as well as any deliberate adoption of a different schema version. Schema releases and building specification histories are separate: every version of a building specification identifies the semantic version of the schema to which it conforms, while Git records that specification's evolution. See [`docs/versioning.md`](docs/versioning.md).

## Future AI-assisted workflows

The ExoSett website is intended eventually to include prompts on its role pages for AI assistance suited to each participant's responsibilities. These will be role-specific rather than one generic prompt: for example, a Building Designer may develop and coordinate the overall definition, a Module Designer may assess and refine the inputs needed for module design, and the Site Office may interpret and execute the maintained specification.

AI will be an assistant, not the source of truth. Maintained documents remain the records used by the responsible people. An assistant should work with the schema version declared by a document, take account of the user's role, identify missing or incompatible information, and avoid inventing unsupported XML or silently changing schema version. It may help interpret an older specification or support a deliberate migration, but migration is neither mandatory nor automatically directed to the latest schema version.

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

Release requirements for the combined website are in [docs/releasing-sketch.md](docs/releasing-sketch.md).
