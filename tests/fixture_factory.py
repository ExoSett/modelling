"""Readable construction of fictional prototype fixtures; not a migration engine."""
from copy import deepcopy
import hashlib
from pathlib import Path
import xml.etree.ElementTree as ET

M = 'https://www.exosett.com/xml/model'
P = 'https://www.exosett.com/xml/publication'
ET.register_namespace('', M)
ET.register_namespace('p', P)
BASE = 'https://example.invalid/exosett/'


def uri(label):
    return BASE + label


def el(tag, parent=None, text=None, ns=M, **attrs):
    node = ET.Element(f'{{{ns}}}{tag}', {k: str(v) for k, v in attrs.items() if v is not None})
    if text is not None:
        node.text = text
    if parent is not None:
        parent.append(node)
    return node


def ref(tag, parent, doc, revision, target=None, ns=M, **attrs):
    return el(tag, parent, ns=ns, document=uri(doc), revision=revision, target=target, **attrs)


def document(kind, label, rev=1, prev=None, effective='2026-10-01', **attrs):
    ns = P if kind == 'publicationSet' else M
    node = el(kind, ns=ns, id=uri(label), revision=rev, formatVersion='2.0.0', **attrs)
    meta = el('metadata', node, ns=ns, recorded='2026-11-01T12:00:00Z', author=uri('people/checker'),
              effective=effective if kind != 'buildingClass' else None, observed=effective if effective != 'unknown' else None)
    el('change', meta, text=f'Fictional worked example: {label} revision {rev}')
    if prev is not None:
        ref('previous', meta, label, prev)
    el('evidence', meta, artifact=uri('evidence/work-record'), subject='$document', role='illustrative-work-and-inspection')
    return node


def definition(node, ident='beam', maximum=None):
    d = el('definition', node, id=ident, kind=ident)
    el('description', d, text='Illustrative assertions only; not engineering certification.')
    el('dimensions', d, width='0.2', height='0.4', depth='4', unit='m')
    if maximum is not None:
        el('maxSpan', d, value=maximum, unit='m')
    return d


def design(label='Hall', count=1, rev=1, prev=None):
    node = document('buildingClass', label, rev, prev, scope='arrangement')
    el('purpose', node, text='Illustrative pod/beam installation arrangement; structural inventory omitted')
    ref('import', node, 'BeamLibrary', 5, 'beam', alias='standard')
    for i in range(count):
        ident = f'p-{i+1}'
        p = el('position', node, id=ident, kind='installation', designation=f'Bay {i+1}',
               continuity='unchanged' if prev and i < 3 else None)
        if prev and i < 3:
            el('predecessor', p, target=ident)
        el('use', p, **{'import': 'standard'})
    return node


def base():
    interface = document('buildingClass', 'InterfaceLibrary', 2, scope='definitions-only')
    el('purpose', interface, text='End interface only')
    definition(interface, 'end-interface')
    beam = document('buildingClass', 'BeamLibrary', 5, scope='definitions-only')
    el('purpose', beam, text='Beam definition only')
    ref('import', beam, 'InterfaceLibrary', 2, 'end-interface', alias='end')
    el('use', definition(beam, maximum=6), **{'import': 'end'})
    return [interface, beam, design('Hall'), design('Workshop')]


def component(label, rev=1, prev=None, building=None, position='slot', kind='storage', effective='2026-10-01'):
    node = document('componentInstance', label, rev, prev, effective)
    if prev is None:
        el('evidence', node.find(f'{{{M}}}metadata'), artifact=uri('evidence/work-record'),
           subject='$document', role='illustrative-manufacture')
    el('identity', node, scheme=uri('fictional-supplier-serial-scheme'), issuer=uri('fictional-supplier'), value=label)
    ref('class', node, 'BeamLibrary', 5, 'beam')
    state = el('state', node, kind='installed' if building else kind, context=None if building or kind == 'unknown' else 'Store S / recorded custody')
    if building:
        el('location', state, building=uri('physical-building-' + building), position=position)
    el('condition', node, text='Illustrative inspection recorded; no engineering assessment')
    el('assessment', node, status='not-assessed')
    return node


def building(label, rev=1, prev=None, class_label='Hall', class_rev=1, occupants=None, effective='2026-10-01'):
    node = document('buildingInstance', label, rev, prev, effective, building=uri('physical-building-' + label))
    ref('design', node, class_label, class_rev)
    el('assessment', node, status='not-assessed')
    for i, (slot, occupant) in enumerate((occupants or {'slot': None}).items()):
        p = el('position', node, id=slot, state='occupied' if occupant else 'unoccupied',
               continuity='unchanged' if prev and i < 3 else None)
        if prev and i < 3:
            el('predecessor', p, target=slot)
        ref('design', p, class_label, class_rev, f'p-{i+1}')
        if occupant:
            ref('component', p, *occupant)
    return node


def publication(label, results, baseline=None, effective='2026-10-01', operation=None, status='accepted', rev=1, prev=None):
    node = document('publicationSet', label, rev, prev, effective, status=status,
                    operation=operation or ('change' if baseline else 'initial'))
    if baseline:
        ref('baseline', node, *baseline, ns=P)
    for doc, version in results:
        ref('result', node, doc, version, ns=P)
    return node


def lifecycle(stage):
    docs = base()
    docs += [building('A', occupants={'slot': ('C', 1)}), component('C', building='A'), component('D'),
             publication('Initial', [('A', 1), ('C', 1), ('D', 1)])]
    docs += [building('A', 2, 1, occupants={'slot': ('D', 2)}, effective='2026-10-02'),
             component('C', 2, 1, effective='2026-10-02'),
             component('D', 2, 1, building='A', effective='2026-10-02'),
             publication('Replacement', [('A', 2), ('C', 2), ('D', 2)], ('Initial', 1), '2026-10-02')]
    if stage == 2:
        return docs
    docs += [component('C', 3, 2, kind='transit', effective='2026-10-05'),
             building('B', class_label='Workshop', effective='2026-10-05'),
             publication('Dispatch', [('C', 3), ('B', 1)], ('Replacement', 1), '2026-10-05'),
             component('C', 4, 3, building='B', effective='2026-10-06'),
             building('B', 2, 1, class_label='Workshop', occupants={'slot': ('C', 4)}, effective='2026-10-06'),
             publication('Installation', [('C', 4), ('B', 2)], ('Dispatch', 1), '2026-10-06')]
    if stage == 3:
        return docs
    docs += [component('C', 5, 4, kind='repair', effective='2026-10-08'),
             building('B', 3, 2, class_label='Workshop', effective='2026-10-08'),
             publication('Removal', [('C', 5), ('B', 3)], ('Installation', 1), '2026-10-08'),
             component('C', 6, 5, kind='repair', effective='2026-10-09'),
             publication('Repair', [('C', 6)], ('Removal', 1), '2026-10-09'),
             component('C', 7, 6, building='B', effective='2026-10-10'),
             building('B', 4, 3, class_label='Workshop', occupants={'slot': ('C', 7)}, effective='2026-10-10'),
             publication('Reinstallation', [('C', 7), ('B', 4)], ('Repair', 1), '2026-10-10'),
             component('C', 8, 7, building='B', effective='2026-10-11'),
             publication('Inspection', [('C', 8)], ('Reinstallation', 1), '2026-10-11')]
    return docs


def correction():
    docs = base() + [building('X', occupants={'slot': ('D', 1)}), component('D', building='X'), component('C'),
                     publication('Original', [('X', 1), ('D', 1), ('C', 1)])]
    amended = [building('X', 2, 1, occupants={'slot': ('C', 2)}), component('C', 2, 1, building='X'), component('D', 2, 1)]
    for doc in amended:
        meta = doc.find(f'{{{M}}}metadata')
        label = doc.get('id').removeprefix(BASE)
        ref('correction', meta, label, 1, reason='Transcribed identity swapped; original inspection sheet establishes earlier state')
    return docs + amended + [publication('Correction', [('X', 2), ('C', 2), ('D', 2)], ('Original', 1), operation='correction')]


def conflict():
    docs = []
    for label, maximum in [('SupplierA', 4), ('SupplierB', 6)]:
        d = document('buildingClass', label, scope='definitions-only')
        el('purpose', d, text='Explicit alternative beam')
        definition(d, maximum=maximum)
        docs.append(d)
    c = document('buildingClass', 'Selection', scope='arrangement')
    el('purpose', c, text='Explicitly select B; importing A creates no positions')
    for label in ('SupplierA', 'SupplierB'):
        ref('import', c, label, 1, 'beam', alias=label)
    p = el('position', c, id='R', kind='installation', designation='R')
    el('use', p, **{'import': 'SupplierB'})
    el('requiredSpan', p, value=5000, unit='mm')
    return docs + [c]


def extension():
    docs = base()[:2]
    pods = document('buildingClass', 'PodLibrary', scope='definitions-only')
    el('purpose', pods, text='Illustrative accommodation-pod envelope')
    pod = definition(pods, 'pod')
    pod.find(f'{{{M}}}dimensions').attrib.update(width='2.4', height='2.9', depth='6.0')
    docs.append(pods)
    docs += [design('Expandable', 3), design('Expandable', 5, 2, 1)]
    for cls in docs[-2:]:
        cls.find(f'{{{M}}}import').attrib.update(document=uri('PodLibrary'), revision='1', target='pod')
    renamed = docs[-1].findall(f'{{{M}}}position')[2]
    renamed.set('designation', 'East Bay')
    renamed.set('continuity', 'renamed')
    e = {f'e-{i}': (f'E{i}', 1) for i in range(1, 4)}
    f = {f'f-{i}': (f'F{i}', 1) for i in range(1, 4)}
    docs += [building('E', class_label='Expandable', occupants=e), building('F', class_label='Expandable', occupants=f)]
    for label, slots in [('E', e), ('F', f)]:
        docs += [component(comp, building=label, position=slot) for slot, (comp, _) in slots.items()]
    docs += [component('E4'), component('E5')]
    initial = [('E', 1), ('F', 1)] + [(f'{b}{i}', 1) for b, count in [('E', 5), ('F', 3)] for i in range(1, count+1)]
    docs.append(publication('BeforeExtension', initial))
    e.update({'e-4': ('E4', 2), 'e-5': ('E5', 2)})
    docs += [building('E', 2, 1, class_label='Expandable', class_rev=2, occupants=e, effective='2026-10-15'),
             component('E4', 2, 1, building='E', position='e-4', effective='2026-10-15'),
             component('E5', 2, 1, building='E', position='e-5', effective='2026-10-15'),
             publication('Extension', [('E', 2), ('E4', 2), ('E5', 2)], ('BeforeExtension', 1), '2026-10-15')]
    for doc in docs:
        if doc.tag == f'{{{M}}}componentInstance':
            doc.find(f'{{{M}}}class').attrib.update(document=uri('PodLibrary'), revision='1', target='pod')
    return docs


def shared():
    docs = base()[:2]
    frames = document('buildingClass', 'FrameLibrary', scope='definitions-only')
    el('purpose', frames, text='Illustrative shared service-frame assembly')
    frame = definition(frames, 'service-frame')
    frame.find(f'{{{M}}}dimensions').attrib.update(width='6', height='3', depth='1.6')
    docs.append(frames)
    d = design('Shared')
    d.find(f'{{{M}}}import').attrib.update(document=uri('FrameLibrary'), revision='1', target='service-frame')
    for ident in ('pair-a', 'pair-b'):
        p = el('position', d, id=ident, kind='group', designation=ident)
        el('member', p, target='p-1')
    b = building('S', class_label='Shared', occupants={'shared-frame': ('Frame', 1)})
    for ident in ('pair-a', 'pair-b'):
        p = el('position', b, id=ident, state='group')
        ref('design', p, 'Shared', 1, ident)
    item = component('Frame', building='S', position='shared-frame')
    item.find(f'{{{M}}}class').attrib.update(document=uri('FrameLibrary'), revision='1', target='service-frame')
    return docs + [d, b, item, publication('SharedInitial', [('S', 1), ('Frame', 1)])]


def migrated():
    docs = []
    for path in sorted((Path(__file__).resolve().parents[1] / 'examples').glob('*.xml')):
        old = ET.parse(path).getroot()
        d = document('buildingClass', 'migrated-' + path.stem, scope='arrangement')
        el('evidence', d.find(f'{{{M}}}metadata'), artifact=uri('source/' + path.name),
           subject='$document', role='source-1.0.0-document')
        el('purpose', d, text=f'Design-only migration of {path.name}; original IDs retained, no physical assets inferred')
        types = old.find(f'{{{M}}}moduleTypes')
        if types is not None:
            for t in types:
                target = el('definition', d, id=t.get('id'), kind='accommodation-module')
                el('description', target, text=t.get('name') + ': ' + (t.findtext(f'{{{M}}}description') or ''))
                target.append(deepcopy(t.find(f'{{{M}}}dimensions')))
        placements = old.find(f'{{{M}}}modulePlacements')
        if placements is not None:
            for oldp in placements:
                p = el('position', d, id=oldp.get('id'), kind='installation', designation=oldp.get('id'))
                el('use', p, local=oldp.get('typeRef'))
        for pair in old.find(f'{{{M}}}framePairs'):
            d.append(deepcopy(pair))
        if placements is not None:
            for p in placements:
                el('cell', d, position=p.get('id'), pair=p.get('framePairRef'), frame=p.get('accommodationFrameRef'),
                   **{axis: p.get(axis) for axis in ('x','y','z')})
        docs.append(d)
    return docs


def write(directory, docs, expected=None):
    directory.mkdir(parents=True, exist_ok=True)
    catalogue = ET.Element('catalogue', version='1')
    evidence = directory / 'work-record.txt'
    evidence.write_text('Fictional teaching fixture. No real inspection, manufacture, signature or approval is asserted.\n')
    ET.SubElement(catalogue, 'artifact', id=uri('evidence/work-record'), path=evidence.name,
                  sha256=hashlib.sha256(evidence.read_bytes()).hexdigest())
    for doc in docs:
        label = doc.get('id').removeprefix(BASE)
        if label.startswith('migrated-'):
            source_name = label.removeprefix('migrated-') + '.xml'
            source = Path(__file__).resolve().parents[1] / 'examples' / source_name
            data = source.read_bytes()
            target = directory / ('source-' + source_name)
            target.write_bytes(data)
            ET.SubElement(catalogue, 'artifact', id=uri('source/' + source_name), path=target.name,
                          sha256=hashlib.sha256(data).hexdigest())
        filename = f'{label}-{doc.get("revision")}.xml'
        ET.indent(doc, space='  ')
        data = ET.tostring(doc, encoding='utf-8', xml_declaration=True) + b'\n'
        (directory / filename).write_bytes(data)
        ET.SubElement(catalogue, 'document', id=doc.get('id'), revision=doc.get('revision'), path=filename,
                      sha256=hashlib.sha256(data).hexdigest())
    ET.indent(catalogue, space='  ')
    ET.ElementTree(catalogue).write(directory / 'catalogue.xml', encoding='utf-8', xml_declaration=True)
    if expected:
        (directory / 'expected-code.txt').write_text(expected + '\n')


def generate(root):
    scenarios = {'01-reuse': base(), '02-replacement': lifecycle(2), '03-transfer': lifecycle(3),
                 '04-repair': lifecycle(4), '05-correction': correction(), '06-import-conflict-resolved': conflict(),
                 '07-extension': extension(), '08-shared-frame': shared(), '09-migrated-designs': migrated()}
    for label, docs in scenarios.items():
        write(root / 'positive' / label, docs)
    # Each negative is a complete inspectable input, not a patch applied inside the validator.
    negatives = []
    d = base(); d[-1].find(f'{{{M}}}import').set('revision', 'missing'); negatives.append(('unresolved-import', d, 'UNRESOLVED'))
    d = lifecycle(2); d[-1].remove(d[-1].findall(f'{{{P}}}result')[1]); negatives.append(('missing-removal-counterpart', d, 'COORDINATION'))
    d = lifecycle(3); next(x for x in d if x.get('id') == uri('C') and x.get('revision') == '4').find(f'{{{M}}}state').set('kind', 'transit'); negatives.append(('transit-as-installed', d, 'STATE'))
    d = lifecycle(4); next(x for x in d if x.get('id') == uri('C') and x.get('revision') == '6').find(f'{{{M}}}metadata/{{{M}}}evidence').set('artifact', uri('missing')); negatives.append(('missing-repair-evidence', d, 'EVIDENCE'))
    d = correction(); next(x for x in d if x.get('id') == uri('X') and x.get('revision') == '2').find(f'{{{M}}}metadata/{{{M}}}correction').set('revision','absent'); negatives.append(('missing-correction-target', d, 'UNRESOLVED'))
    d = conflict(); d[-1].find(f'{{{M}}}position/{{{M}}}use').set('import', 'SupplierA'); negatives.append(('incompatible-span', d, 'SPAN'))
    d = extension(); next(x for x in d if x.get('id') == uri('Expandable') and x.get('revision') == '2').findall(f'{{{M}}}position')[2].attrib.pop('continuity'); negatives.append(('missing-position-continuity', d, 'CONTINUITY'))
    d = shared(); next(x for x in d if x.get('id') == uri('Shared')).findall(f'{{{M}}}position')[1].find(f'{{{M}}}member').set('target','missing'); negatives.append(('missing-shared-installation', d, 'MEMBERSHIP'))
    for label, docs, expected in negatives:
        write(root / 'negative' / label, docs, expected)


if __name__ == '__main__':
    generate(Path(__file__).resolve().parents[1] / 'examples/2.0.0')
