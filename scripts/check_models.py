#!/usr/bin/env python3
"""Run prototype acceptance tests and retain a portable JSON report and test log."""
import argparse
import io
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))
from validate_model import Validator


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, default=ROOT / 'test-results/model-2.0.0.json')
    args = parser.parse_args()
    results = []
    for path in sorted((ROOT / 'examples/2.0.0').glob('*/*/catalogue.xml')):
        report = Validator().validate(path)
        negative = path.parent.parent.name == 'negative'
        expected = path.with_name('expected-code.txt').read_text().strip() if negative else None
        passed = (not report['valid'] and expected in {d['code'] for d in report['diagnostics']}) if negative else report['valid']
        results.append({'fixture': str(path.relative_to(ROOT)), 'passed': passed,
                        'expected_error': expected, 'validation': report})
    for path in sorted((ROOT / 'examples').glob('*.xml')):
        validator = Validator()
        node = validator.structural(path)
        results.append({'fixture': str(path.relative_to(ROOT)), 'passed': node is not None,
                        'validation': validator.report()})
    log = io.StringIO()
    suite = unittest.defaultTestLoader.discover(str(ROOT / 'tests'))
    tests = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    passed = tests.wasSuccessful() and all(r['passed'] for r in results)
    result = {'passed': passed, 'tests_run': tests.testsRun, 'failures': len(tests.failures),
              'errors': len(tests.errors), 'fixtures': results,
              'limits': 'Supplied records only; no engineering certification or website/release validation.'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, indent=2) + '\n')
    args.report.with_suffix('.log').write_text(log.getvalue())
    print(f'{"PASS" if passed else "FAIL"}: {tests.testsRun} tests; {len(results)} fixture catalogues/legacy documents')
    print(f'Report: {args.report}')
    if not passed:
        print(log.getvalue())
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
