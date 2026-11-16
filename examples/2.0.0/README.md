# Executable 2.0.0 prototype examples

These are fictional XML records, not approved engineering specifications or real
physical identifiers. Their `example.invalid` URIs and supplier serial values
are teaching labels. All work/manufacture/inspection evidence is explicitly fictional.
See [format and commands](../../docs/format-2.0.0.md).

Each directory contains a self-contained `catalogue.xml`, pinned XML document
revisions and an evidence file. No network resolution is required. Repeated files
between scenarios intentionally make each example independently executable.

| Positive catalogue | Demonstrates |
| --- | --- |
| `01-reuse` | Beam fragment and transitive interface import used by Hall and Workshop |
| `02-replacement` | Position preserved while C is replaced by D; building and both components advance |
| `03-transfer` | C moves through storage/transit from A to B, retaining identity |
| `04-repair` | Removal, repair, reinstallation and later inspection without another building revision |
| `05-correction` | Earlier mistaken identity assignment corrected with evidence, not a new physical swap |
| `06-import-conflict-resolved` | Explicit SupplierB selection satisfies the asserted span; unused SupplierA import creates no occurrence |
| `07-extension` | E extends three bays to five; renamed position and existing components retain identity; F stays on the earlier class |
| `08-shared-frame` | Two frame-pair groups reference one service-frame installation/physical item |
| `09-migrated-designs` | Design-only copies of all three 1.0.0 examples, with original XML retained as source evidence |

`negative/` holds eight complete catalogues with one intended fault and an
`expected-code.txt`. They cover each numbered scenario and the shared-frame case.
Validation should fail; the test runner checks the expected diagnostic rather
than accepting any arbitrary failure. Further adversarial fixtures are constructed
in temporary directories by `tests/test_model_2.py`.

The executable examples use simplified dates, labels and scopes to exercise the
same semantics as the narrative [worked examples](../../docs/information-model-examples.md).
Bay positions in the extension fixture stand for its declared pod installation
slots; a complete inventory of supporting structures is not invented. Definitions
and span values are illustrative assertions, not structural calculations.

```sh
python3 scripts/validate_model.py examples/2.0.0/positive/07-extension/catalogue.xml
python3 scripts/validate_model.py examples/2.0.0/negative/missing-removal-counterpart/catalogue.xml
python3 scripts/check_models.py
```

Run these from the repository root. The second command intentionally exits 1.
`tests/fixture_factory.py` is the readable, deterministic authoring source for
these development fixtures. `python3 tests/fixture_factory.py` regenerates them;
do not use it to rewrite issued project records. These are prototype fixtures,
not a production revision-publishing tool or general migration utility.
