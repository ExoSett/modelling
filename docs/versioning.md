# Schema and building specification versioning

## Schema versions

The ExoSett schema follows [Semantic Versioning](https://semver.org/). Schema releases have a three-part version number: `major.minor.patch`. No particular version number, including `1.0.0`, represents a complete or final schema.

- **Major** denotes an incompatible change to the schema's public contract. Migration may require an explicit transformation or human judgement (`1.4.2` to `2.0.0`).
- **Minor** denotes backward-compatible added functionality or expressive capability (`1.2.0` to `1.3.0`).
- **Patch** denotes a backward-compatible correction to a bug, inconsistency, mistake, or ambiguity (`1.3.0` to `1.3.1`).

Versions describe the semantics of the format, not merely changes to the XSD file. A documentation change that alters the format's public contract can therefore require a schema version change even when the XML structure is unchanged. Editorial changes that do not change meaning need not change the schema version.

The exact version appears both in a schema filename such as `exosett-model-1.0.0.xsd` and in a building specification's `formatVersion` attribute. The modelling namespace remains stable; consumers use `formatVersion` to select the applicable schema and make an explicit compatibility decision when they do not support the declared version.

Schema development should be informed by practical experience. New subject areas may begin with a simple representation and become more formally structured after feedback from the people who use the specification. This continuing development does not create an automatic upgrade path for existing building specifications.

## Building specification history

Each distinctly managed ExoSett building project should have its own Git repository. Its building specification should be committed from the outset so that the repository history records its development, including ordinary design changes and deliberate changes of schema version. Git is part of the project's information-management model, not merely a software-development convenience.

The schema release history and the history of an individual building specification are orthogonal but related. Git commits identify versions of the project record; they are not schema versions. Each committed version of the building specification declares, through `formatVersion`, the semantic version of the schema to which that document conforms.

Successive versions of one building specification may use the same schema version or different schema versions. There is no requirement to migrate a specification to the latest schema. Schema selection is a project or organisational decision: for example, an organisation may keep many projects on one supported schema version for operational consistency. When a project does adopt another schema version, that deliberate change and any associated transformation should be recorded in its Git history.
