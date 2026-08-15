# Format versioning

ExoSett model documents carry an explicit three-part version number: `major.minor.patch`. The initial version is `0.1.0`; `0.x` indicates that the format is still being designed.

- **Major** denotes a breaking change. A document using the new major version cannot automatically be assumed to retain the same meaning in the previous major version. Migration may require an explicit transformation or human judgement (`1.4.2` to `2.0.0`).
- **Minor** denotes a significant evolution in interpretation or expressive capability within a major-version family. Software must not blindly assume all minor versions are semantically identical (`1.2.0` to `1.3.0`).
- **Patch** denotes a correction to a bug, inconsistency, mistake, or ambiguity without intentionally changing the meaning of correctly interpreted existing data (`1.3.0` to `1.3.1`).

Versions describe the semantics of the specification, not merely changes to the XSD file. A wording change that materially alters an element's intended interpretation can therefore require a minor version even when the XML structure is unchanged. Conversely, editorial changes that do not change meaning need not change the format version.

Consumers should reject unsupported major versions. They should make an explicit compatibility decision for an unfamiliar minor version rather than silently treating it as equivalent. Patch versions within a supported major/minor family are intended to preserve meaning, though consumers may still report that the exact patch is unfamiliar.

