"""Scenario and adversarial acceptance tests; stdlib unittest, real XSD validation."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from validate_model import Validator, child, children, own, location
from fixture_factory import (M, P, base, building, component, conflict, correction, design,
                             document, el, extension, lifecycle, publication, ref, shared, uri, write)


class PrototypeTests(unittest.TestCase):
    def validate(self, docs):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            write(path, docs)
            return Validator().validate(path / 'catalogue.xml')

    def assert_code(self, docs, code):
        report = self.validate(docs)
        self.assertFalse(report['valid'], report)
        self.assertIn(code, [d['code'] for d in report['diagnostics']], report)

    def test_all_checked_in_positive_fixtures(self):
        for path in sorted((ROOT / 'examples/2.0.0/positive').glob('*/catalogue.xml')):
            with self.subTest(scenario=path.parent.name):
                report = Validator().validate(path)
                self.assertTrue(report['valid'], report)
                self.assertFalse(report['diagnostics'], report)

    def test_all_checked_in_negative_fixtures_fail_for_intended_reason(self):
        for path in sorted((ROOT / 'examples/2.0.0/negative').glob('*/catalogue.xml')):
            with self.subTest(scenario=path.parent.name):
                report = Validator().validate(path)
                code = path.with_name('expected-code.txt').read_text().strip()
                self.assertFalse(report['valid'], report)
                self.assertIn(code, [d['code'] for d in report['diagnostics']], report)

    def test_legacy_schema_examples_unchanged_and_valid(self):
        for path in sorted((ROOT / 'examples').glob('*.xml')):
            validator = Validator()
            self.assertIsNotNone(validator.structural(path), validator.report())

    def test_unknown_occupancy_and_effective_time_are_not_invalid(self):
        b = building('Unknown', effective='unknown')
        child(b, 'position').set('state', 'unknown')
        report = self.validate(base() + [b])
        self.assertTrue(report['valid'], report)
        self.assertIn('UNKNOWN', [d['code'] for d in report['diagnostics']])

    def test_unknown_component_circumstances_are_not_invalid(self):
        report = self.validate(base() + [component('Unobserved', kind='unknown')])
        self.assertTrue(report['valid'], report)
        self.assertIn('UNKNOWN', [d['code'] for d in report['diagnostics']])

    def test_prepared_partial_set_is_not_reported_as_accepted(self):
        docs = lifecycle(2)
        docs[-1].set('status', 'prepared')
        docs[-1].remove(children(docs[-1], 'result')[1])
        report = self.validate(docs)
        self.assertTrue(report['valid'], report)
        self.assertIn('PREPARED', [d['code'] for d in report['diagnostics']])
        self.assertIn('COORDINATION', [d['code'] for d in report['diagnostics']])

    def test_accepted_revision_of_prepared_set(self):
        docs = lifecycle(2)
        accepted = docs.pop()
        prepared = deepcopy(accepted)
        prepared.set('status', 'prepared')
        accepted.set('revision', '2')
        meta = child(accepted, 'metadata')
        previous = ref('previous', ET.Element('unused'), 'Replacement', 1)
        meta.insert(1, previous)
        self.assertTrue(self.validate(docs + [prepared, accepted])['valid'])

    def test_later_inspection_does_not_force_new_building_revision(self):
        docs = lifecycle(4)
        validator = Validator()
        with tempfile.TemporaryDirectory() as directory:
            write(Path(directory), docs)
            report = validator.validate(Path(directory) / 'catalogue.xml')
            self.assertTrue(report['valid'], report)
            final = validator.cache[(uri('Inspection'), '1')]
            self.assertEqual(own(final[uri('B')]), (uri('B'), '4'))
            self.assertEqual(own(final[uri('C')]), (uri('C'), '8'))

    def test_extension_preserves_other_building_and_component_revisions(self):
        with tempfile.TemporaryDirectory() as directory:
            write(Path(directory), extension())
            validator = Validator()
            report = validator.validate(Path(directory) / 'catalogue.xml')
            self.assertTrue(report['valid'], report)
            final = validator.cache[(uri('Extension'), '1')]
            self.assertEqual(len(children(final[uri('E')], 'position')), 5)
            self.assertEqual(len(children(final[uri('F')], 'position')), 3)
            self.assertEqual(child(final[uri('F')], 'design').get('revision'), '1')
            self.assertEqual(final[uri('E3')].get('revision'), '1')

    def test_import_order_cannot_change_meaning(self):
        docs = conflict()
        c = docs[-1]
        imports = children(c, 'import')
        for i in imports:
            c.remove(i)
        for i in imports:
            c.insert(2, i)
        self.assertTrue(self.validate(docs)['valid'])
        child(child(c, 'position'), 'use').set('import', 'SupplierA')
        self.assert_code(docs, 'SPAN')

    def test_import_without_use_does_not_create_positions(self):
        docs = base()
        docs[-1].remove(child(docs[-1], 'position'))
        # An import-only document must declare some meaningful definition or arrangement.
        self.assert_code(docs, 'SCOPE')
        from fixture_factory import definition
        definition(docs[-1], 'own')
        self.assertTrue(self.validate(docs)['valid'])
        self.assertEqual(len(children(docs[-1], 'position')), 0)

    def test_unqualified_or_ambiguous_use_rejected(self):
        docs = conflict()
        use = child(child(docs[-1], 'position'), 'use')
        use.attrib.clear()
        self.assert_code(docs, 'USE')
        use.set('local', 'beam')
        use.set('import', 'SupplierA')
        self.assert_code(docs, 'USE')

    def test_alias_collision_rejected(self):
        docs = conflict()
        children(docs[-1], 'import')[1].set('alias', 'SupplierA')
        self.assert_code(docs, 'IMPORT_ALIAS')

    def test_import_cycle_rejected(self):
        docs = base()
        docs[0].insert(2, ref('import', ET.Element('unused'), 'BeamLibrary', 5, 'beam', alias='back'))
        self.assert_code(docs, 'IMPORT_CYCLE')

    def test_import_target_kind_checked(self):
        docs = base()
        child(docs[-1], 'import').set('document', uri('Hall'))
        child(docs[-1], 'import').set('revision', '1')
        child(docs[-1], 'import').set('target', 'p-1')
        self.assert_code(docs, 'REFERENCE_TARGET')

    def test_wrong_document_kind_rejected(self):
        docs = base() + [component('C')]
        child(docs[3], 'import').set('document', uri('C'))
        child(docs[3], 'import').set('revision', '1')
        self.assert_code(docs, 'REFERENCE_KIND')

    def test_mutable_revision_selector_rejected(self):
        docs = base()
        docs[0].set('revision', 'latest')
        self.assert_code(docs, 'REVISION')

    def test_positive_dimensions_and_version_are_structural(self):
        docs = base()
        child(child(docs[0], 'definition'), 'dimensions').set('width', '0')
        self.assert_code(docs, 'XSD')
        docs = base()
        docs[0].set('formatVersion', '3.0.0')
        self.assert_code(docs, 'FORMAT')

    def test_timezone_required_but_date_precision_allowed(self):
        docs = base()
        child(docs[0], 'metadata').set('recorded', '2026-01-01T00:00:00')
        self.assert_code(docs, 'TIME')

    def test_identity_does_not_change_with_revision(self):
        docs = lifecycle(2)
        c2 = next(d for d in docs if own(d) == (uri('C'), '2'))
        child(c2, 'identity').set('value', 'different-physical-item')
        self.assert_code(docs, 'PHYSICAL_IDENTITY')

    def test_duplicate_physical_identity_claim_rejected(self):
        c, d = component('C'), component('D')
        child(d, 'identity').set('value', 'C')
        self.assert_code(base() + [c, d], 'PHYSICAL_IDENTITY')

    def test_conflicting_deployment_rejected(self):
        docs = base() + [building('A', occupants={'slot': ('C', 1)}), component('C', building='A'),
                         publication('Initial', [('A', 1), ('C', 1)])]
        b = building('B', occupants={'slot': ('C', 2)})
        docs += [b, component('C', 2, 1, building='B'),
                 publication('DoubleClaim', [('B', 1), ('C', 2)], ('Initial', 1))]
        self.assert_code(docs, 'COORDINATION')

    def test_wrong_assignment_kind_diagnosed_without_crashing(self):
        docs = lifecycle(2)
        b = next(d for d in docs if own(d) == (uri('A'), '2'))
        r = child(child(b, 'position'), 'component')
        r.set('document', uri('Hall'))
        r.set('revision', '1')
        self.assert_code(docs, 'REFERENCE_KIND')

    def test_local_definition_cycles_rejected(self):
        docs = base()
        el('use', child(docs[0], 'definition'), local='end-interface')
        self.assert_code(docs, 'DEFINITION_CYCLE')

    def test_position_names_do_not_supply_identity(self):
        docs = extension()
        c = next(d for d in docs if own(d) == (uri('Expandable'), '2'))
        children(c, 'position')[2].set('id', 'East-Bay')
        self.assert_code(docs, 'CONTINUITY')

    def test_retroactive_physical_change_requires_correction(self):
        docs = lifecycle(2)
        for d in docs:
            if own(d) in {(uri('A'), '2'), (uri('C'), '2'), (uri('D'), '2'), (uri('Replacement'), '1')}:
                child(d, 'metadata').set('effective', '2026-09-01')
        self.assert_code(docs, 'TIME_ORDER')

    def test_publication_cannot_skip_baseline_predecessor(self):
        docs = lifecycle(4)
        child(docs[-1], 'baseline').set('document', uri('Repair'))
        self.assert_code(docs, 'PUBLICATION')

    def test_competing_accepted_updates_do_not_pick_a_winner(self):
        docs = base() + [component('C'), publication('Initial', [('C', 1)])]
        docs += [component('C', 2, 1), component('C', 3, 1),
                 publication('BranchA', [('C', 2)], ('Initial', 1)),
                 publication('BranchB', [('C', 3)], ('Initial', 1))]
        self.assert_code(docs, 'PUBLICATION_CONFLICT')

    def test_publication_baseline_cycle_is_reported(self):
        docs = base() + [component('C'), publication('LoopA', [('C', 1)], ('LoopB', 1)),
                         publication('LoopB', [('C', 1)], ('LoopA', 1))]
        self.assert_code(docs, 'PUBLICATION')

    def test_duplicate_position_identity_is_structural_error(self):
        docs = extension()
        c = next(d for d in docs if own(d) == (uri('Expandable'), '1'))
        children(c, 'position')[1].set('id', 'p-1')
        self.assert_code(docs, 'XSD')

    def test_migration_preserves_source_geometry_and_provenance(self):
        directory = ROOT / 'examples/2.0.0/positive/09-migrated-designs'
        def shape(n):
            return (n.tag, n.attrib, [shape(c) for c in n])
        for source in (ROOT / 'examples').glob('*.xml'):
            old = ET.parse(source).getroot()
            new = ET.parse(directory / f'migrated-{source.stem}-1.xml').getroot()
            self.assertEqual([shape(n) for n in child(old, 'framePairs')],
                             [shape(n) for n in children(new, 'framePair')])
            types = child(old, 'moduleTypes')
            if types is not None:
                self.assertEqual([shape(child(t, 'dimensions')) for t in types],
                                 [shape(child(t, 'dimensions')) for t in children(new, 'definition')])
            self.assertEqual(source.read_bytes(), (directory / f'source-{source.name}').read_bytes())

    def test_wrong_building_realization_rejected(self):
        docs = extension()
        e2 = next(d for d in docs if own(d) == (uri('E'), '2'))
        child(child(e2, 'position'), 'design').set('revision', '1')
        self.assert_code(docs, 'REALIZATION')

    def test_changed_design_content_requires_explicit_decision(self):
        docs = extension()
        d2 = next(d for d in docs if own(d) == (uri('Expandable'), '2'))
        el('placement', child(d2, 'position'), x=10, y=0, z=0, unit='m')
        self.assert_code(docs, 'CONTINUITY')
        child(d2, 'position').set('continuity', 'modified')
        self.assertTrue(self.validate(docs)['valid'])

    def test_split_then_retired_key_reuse_rejected(self):
        docs = base()
        first = docs[2]
        second = design('Hall', 1, 2)
        ref('previous', ET.Element('unused'), 'Hall', 1)
        child(second, 'metadata').insert(1, ref('previous', ET.Element('unused'), 'Hall', 1))
        p = child(second, 'position')
        p.set('id', 'new-slot')
        p.insert(0, el('predecessor', target='p-1'))
        el('retired', second, target='p-1')
        self.assertTrue(self.validate(docs + [second])['valid'])
        third = design('Hall', 1, 3)
        child(third, 'metadata').insert(1, ref('previous', ET.Element('unused'), 'Hall', 2))
        el('retired', third, target='new-slot')
        self.assert_code(docs + [second, third], 'CONTINUITY')

    def test_shared_frame_has_one_physical_assignment(self):
        report = self.validate(shared())
        self.assertTrue(report['valid'], report)
        docs = shared()
        d = next(d for d in docs if own(d) == (uri('Shared'), '1'))
        el('member', child(d, 'position'), target='pair-a')
        self.assert_code(docs, 'MEMBERSHIP')

    def test_correction_does_not_require_later_effective_time(self):
        report = self.validate(correction())
        self.assertTrue(report['valid'], report)
        docs = correction()
        c = next(d for d in docs if own(d) == (uri('C'), '2'))
        child(child(c, 'metadata'), 'correction').attrib.pop('reason')
        self.assert_code(docs, 'XSD')

    def test_coordinated_effective_boundary_must_agree(self):
        docs = lifecycle(2)
        c2 = next(d for d in docs if own(d) == (uri('C'), '2'))
        child(c2, 'metadata').set('effective', '2026-10-03')
        self.assert_code(docs, 'COORDINATION')

    def test_missing_evidence_subject_rejected(self):
        docs = base()
        child(child(docs[0], 'metadata'), 'evidence').set('subject', 'nonexistent-definition')
        self.assert_code(docs, 'EVIDENCE')

    def test_integrity_mismatch_and_duplicate_revision(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            write(path, base())
            doc = path / 'Hall-1.xml'
            doc.write_bytes(doc.read_bytes() + b'\n')
            report = Validator().validate(path / 'catalogue.xml')
            self.assertIn('INTEGRITY', [d['code'] for d in report['diagnostics']])
            write(path, base())
            tree = ET.parse(path / 'catalogue.xml')
            tree.getroot().append(deepcopy(tree.getroot().find('document')))
            tree.write(path / 'catalogue.xml')
            report = Validator().validate(path / 'catalogue.xml')
            self.assertIn('DUPLICATE', [d['code'] for d in report['diagnostics']])

    def test_external_entity_and_catalogue_path_escape_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            evil = path / 'evil.xml'
            evil.write_text('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><x>&x;</x>')
            validator = Validator()
            self.assertIsNone(validator.structural(evil))
            self.assertEqual(validator.diagnostics[0]['code'], 'XML')
            write(path, base())
            tree = ET.parse(path / 'catalogue.xml')
            tree.getroot().find('document').set('path', '../escape.xml')
            tree.write(path / 'catalogue.xml')
            report = Validator().validate(path / 'catalogue.xml')
            self.assertIn('CATALOGUE', [d['code'] for d in report['diagnostics']])

    def test_cli_returns_machine_readable_failure(self):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/validate_model.py'),
                                 str(ROOT / 'examples/2.0.0/negative/incompatible-span/catalogue.xml')],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)['valid'])


if __name__ == '__main__':
    unittest.main()
