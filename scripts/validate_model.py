#!/usr/bin/env python3
"""Validate ExoSett XML and explicit local catalogues; never infer physical truth."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from decimal import Decimal
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'https://www.exosett.com/xml/model'
PUBLICATION = 'https://www.exosett.com/xml/publication'
UNITS = {'m': Decimal(1), 'cm': Decimal('.01'), 'mm': Decimal('.001')}


def name(node):
    return node.tag.rsplit('}', 1)[-1]


def children(node, tag):
    return [n for n in node if name(n) == tag]


def child(node, tag):
    return next(iter(children(node, tag)), None)


def key(node):
    return (node.get('document'), node.get('revision'))


def own(node):
    return (node.get('id'), node.get('revision'))


def positions(node):
    return {p.get('id'): p for p in children(node, 'position')}


def previous(node):
    return child(child(node, 'metadata'), 'previous')


def physical(node):
    ident = child(node, 'identity')
    return tuple(ident.get(k) for k in ('scheme', 'issuer', 'value'))


def location(node):
    state = child(node, 'state')
    loc = child(state, 'location')
    return (loc.get('building'), loc.get('position')) if loc is not None else None


def length(node):
    return Decimal(node.get('value')) * UNITS[node.get('unit')]


def absolute(value):
    return bool(value and re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:\S+$', value))


def time_bounds(value):
    """Date precision is an interval; do not silently pretend it is an instant."""
    if value == 'unknown' or value is None:
        return None
    if 'T' in value:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return stamp, stamp
    # The prototype's date-only profile uses YYYY-MM-DD, with no timezone suffix.
    if len(value) != 10:
        return None
    start = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def parse(path):
    data = path.read_bytes()
    # Reject declarations before either parser sees them, including UTF-16/32 forms.
    if b'<!DOCTYPE' in data.replace(b'\x00', b'').upper() or b'<!ENTITY' in data.replace(b'\x00', b'').upper():
        raise ValueError('DTD and entity declarations are not permitted')
    return data, ET.fromstring(data)


class Validator:
    def __init__(self):
        self.diagnostics = []
        self.docs = {}
        self.paths = {}
        self.artifacts = {}
        self.cache = {}

    def emit(self, code, message, node=None, severity='error'):
        k = own(node) if node is not None else None
        self.diagnostics.append({'severity': severity, 'code': code,
                                 'document': k, 'file': self.paths.get(k), 'message': message})

    def structural(self, path):
        try:
            _, node = parse(path)
        except (OSError, ValueError, ET.ParseError) as exc:
            self.emit('XML', f'{path.name}: {exc}')
            return None
        ns = node.tag[1:].split('}')[0] if node.tag.startswith('{') else ''
        version = node.get('formatVersion')
        if ns == MODEL and name(node) == 'exosettModel' and version == '1.0.0':
            schema = 'exosett-model-1.0.0.xsd'
        elif ns == MODEL and name(node) in ('buildingClass', 'buildingInstance', 'componentInstance') and version == '2.0.0':
            schema = 'exosett-model-2.0.0.xsd'
        elif ns == PUBLICATION and name(node) == 'publicationSet' and version == '2.0.0':
            schema = 'exosett-publication-2.0.0.xsd'
        else:
            self.emit('FORMAT', f'{path.name}: unsupported namespace/root/version')
            return None
        if not shutil.which('xmllint'):
            self.emit('TOOL', 'xmllint is required for XSD validation')
            return None
        result = subprocess.run(['xmllint', '--nonet', '--noout', '--schema',
                                 str(ROOT / 'schema' / schema), str(path)], capture_output=True, text=True)
        if result.returncode:
            self.emit('XSD', f'{path.name}: {result.stderr.strip()}')
            return None
        return node

    def load(self, catalogue):
        try:
            _, root = parse(catalogue)
            if root.tag != 'catalogue' or root.attrib != {'version': '1'}:
                raise ValueError('expected unnamespaced catalogue version="1"')
            for entry in root:
                if entry.tag not in ('document', 'artifact'):
                    raise ValueError(f'unknown catalogue entry {entry.tag}')
                required = {'id', 'path', 'sha256'} | ({'revision'} if entry.tag == 'document' else set())
                if set(entry.attrib) != required or len(entry):
                    raise ValueError(f'invalid {entry.tag} entry fields')
                path = (catalogue.parent / entry.get('path')).resolve()
                if not path.is_relative_to(catalogue.parent.resolve()):
                    raise ValueError('catalogue paths must stay within its directory')
                if not absolute(entry.get('id')):
                    raise ValueError('catalogue identity must be an absolute URI')
                data = path.read_bytes()
                if hashlib.sha256(data).hexdigest() != entry.get('sha256'):
                    self.emit('INTEGRITY', f'{entry.get("path")}: SHA-256 mismatch')
                    continue
                if entry.tag == 'artifact':
                    if entry.get('id') in self.artifacts:
                        self.emit('DUPLICATE', f'duplicate artifact {entry.get("id")}')
                    self.artifacts[entry.get('id')] = path
                    continue
                k = (entry.get('id'), entry.get('revision'))
                if k in self.docs:
                    self.emit('DUPLICATE', f'duplicate document revision {k}')
                    continue
                node = self.structural(path)
                if node is not None:
                    if own(node) != k:
                        self.emit('IDENTITY', f'{entry.get("path")}: catalogue/document identity mismatch')
                    else:
                        self.docs[k] = node
                        self.paths[k] = entry.get('path')
        except (OSError, ValueError, ET.ParseError) as exc:
            self.emit('CATALOGUE', str(exc))

    def ref(self, ref, owner, kind=None, target=None):
        if ref is None:
            self.emit('REFERENCE', 'required reference missing', owner)
            return None
        node = self.docs.get(key(ref))
        if node is None:
            self.emit('UNRESOLVED', f'reference {key(ref)} target={ref.get("target")} unavailable', owner)
            return None
        if kind and name(node) != kind:
            self.emit('REFERENCE_KIND', f'{key(ref)} must be {kind}', owner)
            return None
        if target:
            matches = [n for n in children(node, target) if n.get('id') == ref.get('target')]
            if len(matches) != 1:
                self.emit('REFERENCE_TARGET', f'{key(ref)} has no {target} {ref.get("target")}', owner)
                return None
            return matches[0]
        if ref.get('target') is not None:
            self.emit('REFERENCE_TARGET', f'{key(ref)} expects a whole-document reference', owner)
        return node

    def graph(self, edges, code):
        visited, active = set(), set()
        def visit(k):
            if k in active:
                self.emit(code, f'cycle at {k}', self.docs.get(k))
                return
            if k in visited:
                return
            active.add(k)
            for dest in edges.get(k, []):
                if dest in edges:
                    visit(dest)
            active.remove(k)
            visited.add(k)
        for k in edges:
            visit(k)

    def metadata(self, node):
        meta = child(node, 'metadata')
        for attr in ('id',):
            if not absolute(node.get(attr)):
                self.emit('URI', f'{attr} must be an absolute URI', node)
        if not absolute(meta.get('author')):
            self.emit('URI', 'author must be an absolute URI', node)
        for t in ('recorded', 'effective', 'observed'):
            value = meta.get(t, '')
            if 'T' in value and not re.search(r'(Z|[+-]\d\d:\d\d)$', value):
                self.emit('TIME', f'{t} date/time needs a timezone', node)
            if 'T' in value:
                try:
                    datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    self.emit('TIME', f'{t}: unsupported date/time lexical form', node)
            if value and value != 'unknown' and 'T' not in value and not re.fullmatch(r'\d{4}-\d\d-\d\d', value):
                self.emit('TIME', f'{t}: date-only profile requires YYYY-MM-DD', node)
        if name(node) != 'buildingClass' and meta.get('effective') is None:
            self.emit('TIME', 'physical/publication snapshot needs effective time or unknown', node)
        if meta.get('effective') == 'unknown':
            self.emit('UNKNOWN', 'effective time explicitly unknown; temporal ordering is not established', node, 'warning')
        if node.get('revision').lower() in ('latest', 'current'):
            self.emit('REVISION', 'mutable revision selectors are forbidden', node)
        prev = previous(node)
        if prev is not None:
            p = self.ref(prev, node, name(node))
            if prev.get('document') != node.get('id') or key(prev) == own(node):
                self.emit('LINEAGE', 'predecessor must be a different revision of the same document', node)
            if p is not None and name(node) == 'componentInstance' and physical(p) != physical(node):
                self.emit('PHYSICAL_IDENTITY', 'physical identity changed across revisions', node)
            if p is not None and name(node) == 'buildingInstance' and p.get('building') != node.get('building'):
                self.emit('PHYSICAL_IDENTITY', 'building identity changed across revisions', node)
        for evidence in children(meta, 'evidence'):
            if evidence.get('artifact') not in self.artifacts:
                self.emit('EVIDENCE', f'evidence {evidence.get("artifact")} unavailable', node)
            if evidence.get('subject') != '$document' and not any(n.get('id') == evidence.get('subject') for n in node.iter()):
                self.emit('EVIDENCE', 'evidence subject must be $document or an ID in this exact revision', node)
        for correction in children(meta, 'correction'):
            target = self.ref(correction, node, name(node))
            if target is not None and (target.get('id') != node.get('id') or own(target) == own(node)):
                self.emit('CORRECTION', 'correction must address an earlier revision of this document', node)
            if not children(meta, 'evidence') or prev is None:
                self.emit('CORRECTION', 'correction requires evidence and revision lineage', node)
            if key(correction) not in self.ancestors(node):
                self.emit('CORRECTION', 'correction target must be in predecessor lineage', node)

    def ancestors(self, node):
        result = set()
        while previous(node) is not None:
            k = key(previous(node))
            if k in result or k not in self.docs:
                break
            result.add(k)
            node = self.docs[k]
        return result

    def continuity(self, node):
        now = positions(node)
        retired = [e.get('target') for e in children(node, 'retired')]
        if len(retired) != len(set(retired)) or set(retired) & set(now):
            self.emit('CONTINUITY', 'duplicate retirement or active retired key', node)
        prev = previous(node)
        old = positions(self.docs[key(prev)]) if prev is not None and key(prev) in self.docs else {}
        historic_retired = {e.get('target') for k in self.ancestors(node) for e in children(self.docs[k], 'retired')}
        if set(now) & historic_retired:
            self.emit('CONTINUITY', 'retired position identity reused', node)
        if set(retired) - set(old) - historic_retired or set(old) - set(now) - set(retired):
            self.emit('CONTINUITY', 'removed positions need retirement; retirement must identify an existing position', node)
        for ident, pos in now.items():
            preds = [p.get('target') for p in children(pos, 'predecessor')]
            if len(preds) != len(set(preds)) or set(preds) - set(old):
                self.emit('CONTINUITY', f'{ident}: invalid predecessor positions', node)
            if ident in old:
                if preds != [ident] or not pos.get('continuity'):
                    self.emit('CONTINUITY', f'{ident}: continuing identity requires explicit decision and predecessor', node)
                before = dict(old[ident].attrib)
                after = dict(pos.attrib)
                for attrs in (before, after):
                    attrs.pop('continuity', None)
                # Occupancy changes alone do not change the identity of a position.
                before.pop('state', None)
                after.pop('state', None)
                if pos.get('continuity') == 'unchanged' and before != after:
                    self.emit('CONTINUITY', f'{ident}: changed designation requires renamed/modified decision', node)
                if name(node) == 'buildingClass' and pos.get('continuity') in ('unchanged', 'renamed'):
                    def structure(p):
                        return [(name(c), tuple(sorted(c.attrib.items()))) for c in p if name(c) != 'predecessor']
                    if structure(old[ident]) != structure(pos):
                        self.emit('CONTINUITY', f'{ident}: changed position content requires modified decision', node)
                    if pos.get('continuity') == 'renamed' and before.get('kind') != after.get('kind'):
                        self.emit('CONTINUITY', f'{ident}: kind change is not a rename', node)
            elif pos.get('continuity'):
                self.emit('CONTINUITY', f'{ident}: new identity cannot claim continuation', node)
            if ident not in old and set(preds) - set(retired):
                self.emit('CONTINUITY', f'{ident}: split/merge predecessors must be retired', node)

    def use(self, use, node):
        if bool(use.get('local')) == bool(use.get('import')):
            self.emit('USE', 'use requires exactly one local or import reference', node)
            return None
        if use.get('local'):
            definition = next((d for d in children(node, 'definition') if d.get('id') == use.get('local')), None)
            if definition is None:
                self.emit('USE', f'unknown local definition {use.get("local")}', node)
                return None
            return (*own(node), definition.get('id'))
        imp = next((i for i in children(node, 'import') if i.get('alias') == use.get('import')), None)
        if imp is None:
            self.emit('USE', f'unknown import alias {use.get("import")}', node)
            return None
        if self.ref(imp, node, 'buildingClass', 'definition') is not None:
            return (*key(imp), imp.get('target'))
        return None

    def class_document(self, node):
        defs, pos = children(node, 'definition'), positions(node)
        if not defs and not pos and not children(node, 'framePair'):
            self.emit('SCOPE', 'class must contain a definition or arrangement', node)
        if node.get('scope') == 'definitions-only' and (pos or children(node, 'framePair') or children(node, 'cell')):
            self.emit('SCOPE', 'definitions-only scope cannot contain an arrangement', node)
        aliases = [i.get('alias') for i in children(node, 'import')]
        if len(aliases) != len(set(aliases)):
            self.emit('IMPORT_ALIAS', 'duplicate import alias', node)
        for imp in children(node, 'import'):
            self.ref(imp, node, 'buildingClass', 'definition')
        for elem in defs + list(pos.values()):
            uses = [self.use(u, node) for u in children(elem, 'use')]
            span = child(elem, 'requiredSpan')
            if span is not None:
                constrained = False
                for use in uses:
                    if use:
                        definition = next(d for d in children(self.docs[use[:2]], 'definition') if d.get('id') == use[2])
                        maximum = child(definition, 'maxSpan')
                        if maximum is not None:
                            constrained = True
                            if length(span) > length(maximum):
                                self.emit('SPAN', f'{elem.get("id")}: required span exceeds {use}', node)
                if not constrained:
                    self.emit('UNASSESSED', f'{elem.get("id")}: no maxSpan assertion available', node, 'warning')
        edges = {}
        for ident, p in pos.items():
            if p.get('designationScheme') and not absolute(p.get('designationScheme')):
                self.emit('URI', f'{ident}: designation scheme must be an absolute URI', node)
            members = [m.get('target') for m in children(p, 'member')]
            if len(members) != len(set(members)) or set(members) - set(pos):
                self.emit('MEMBERSHIP', f'{ident}: duplicate or missing group member', node)
            if p.get('kind') != 'group' and members:
                self.emit('MEMBERSHIP', f'{ident}: only groups may contain positions', node)
            edges[ident] = members
        # Local containment graph, separate from identity/import graphs.
        def walk(i, active):
            if i in active:
                self.emit('MEMBERSHIP', f'group cycle at {i}', node)
                return
            for dest in edges.get(i, []):
                walk(dest, active | {i})
        for ident in edges:
            walk(ident, set())
        self.continuity(node)
        pairs = {p.get('id'): p for p in children(node, 'framePair')}
        cells = set()
        for cell in children(node, 'cell'):
            pair = pairs.get(cell.get('pair'))
            if pair is None or cell.get('position') not in pos:
                self.emit('CELL', 'cell references missing pair or design position', node)
                continue
            if child(pair, 'accommodationFrame').get('id') != cell.get('frame'):
                self.emit('CELL', 'cell must reference its pair accommodation frame', node)
            grid = child(pair, 'grid')
            if any(int(cell.get(axis)) >= int(grid.get(size)) for axis, size in [('x','widthCells'),('y','depthCells'),('z','heightCells')]):
                self.emit('CELL', 'cell index outside grid', node)
            address = tuple(cell.get(a) for a in ('pair','x','y','z'))
            if address in cells:
                self.emit('CELL', 'overlapping cell occurrences', node)
            cells.add(address)

    def component(self, node):
        ident = child(node, 'identity')
        if not all(absolute(ident.get(a)) for a in ('scheme', 'issuer')):
            self.emit('URI', 'physical identity scheme and issuer require absolute URIs', node)
        self.ref(child(node, 'class'), node, 'buildingClass', 'definition')
        state = child(node, 'state')
        loc = location(node)
        if (state.get('kind') == 'installed') != (loc is not None):
            self.emit('STATE', 'only installed state requires a building position', node)
        if loc and not absolute(loc[0]):
            self.emit('URI', 'building location identity requires an absolute URI', node)
        if state.get('kind') in ('storage', 'transit', 'repair') and not state.get('context'):
            self.emit('STATE', 'storage/transit/repair requires context', node)
        if state.get('kind') == 'unknown':
            self.emit('UNKNOWN', 'component circumstances explicitly unknown', node, 'warning')

    def building(self, node):
        if not absolute(node.get('building')):
            self.emit('URI', 'building identity requires an absolute URI', node)
        design_ref = child(node, 'design')
        design = self.ref(design_ref, node, 'buildingClass')
        if design is None:
            return
        if design.get('scope') != 'arrangement':
            self.emit('SCOPE', 'building requires an arrangement design basis', node)
        mapped = []
        for p in children(node, 'position'):
            ref = child(p, 'design')
            target = self.ref(ref, node, 'buildingClass', 'position')
            mapped.append(ref.get('target'))
            if key(ref) != key(design_ref):
                self.emit('REALIZATION', 'position must realize the adopted class revision', node)
            component_ref = child(p, 'component')
            if (p.get('state') == 'occupied') != (component_ref is not None):
                self.emit('ASSIGNMENT', 'only occupied positions require a component reference', node)
            if target is not None and (target.get('kind') == 'group') != (p.get('state') == 'group'):
                self.emit('ASSIGNMENT', 'group positions are not physical installations', node)
            if component_ref is not None:
                comp = self.ref(component_ref, node, 'componentInstance')
                if comp is not None:
                    if location(comp) != (node.get('building'), p.get('id')):
                        self.emit('ASSIGNMENT', 'installation evidence disagrees with building position', node)
                    if target is not None:
                        uses = [self.use(u, design) for u in children(target, 'use')]
                        cr = child(comp, 'class')
                        if uses and (*key(cr), cr.get('target')) not in uses:
                            self.emit('CLASS_MATCH', 'occupant class differs from specified class (substitution not implemented)', node)
            if p.get('state') == 'unknown':
                self.emit('UNKNOWN', f'{p.get("id")}: occupant explicitly unknown', node, 'warning')
        if len(mapped) != len(set(mapped)) or set(mapped) != set(positions(design)):
            self.emit('REALIZATION', 'realize each declared design position exactly once (use unknown where needed)', node)
        self.continuity(node)
        prev = previous(node)
        if prev is not None and key(prev) in self.docs:
            old = self.docs[key(prev)]
            for ident, p in positions(node).items():
                if ident not in positions(old):
                    continue
                oldref = child(positions(old)[ident], 'design')
                newref = child(p, 'design')
                if oldref.get('document') != newref.get('document') or oldref.get('target') != newref.get('target'):
                    self.emit('REALIZATION', f'{ident}: rebinding to another class-position identity unsupported; use a new realization', node)
                if key(oldref) != key(newref) and key(oldref) not in self.ancestors(design):
                    self.emit('REALIZATION', f'{ident}: adopted class revision lacks predecessor lineage', node)

    def publication(self, node, active=None):
        k = own(node)
        if k in self.cache:
            return self.cache[k]
        active = set() if active is None else active
        if k in active:
            self.emit('PUBLICATION', 'publication baseline cycle', node)
            return {}
        baseline_ref = child(node, 'baseline')
        baseline = self.ref(baseline_ref, node, 'publicationSet') if baseline_ref is not None else None
        state = {}
        if baseline is not None:
            if baseline.get('status') != 'accepted':
                self.emit('PUBLICATION', 'baseline must be accepted', node)
            state = self.publication(baseline, active | {k}).copy()
        old = state.copy()
        changed = set()
        for ref in children(node, 'result'):
            doc = self.ref(ref, node)
            if doc is None:
                continue
            if name(doc) not in ('buildingInstance', 'componentInstance'):
                self.emit('PUBLICATION', 'results must be physical snapshots', node)
                continue
            ident = doc.get('id')
            if ident in changed:
                self.emit('PUBLICATION', 'multiple result revisions of the same document', node)
            changed.add(ident)
            prev = previous(doc)
            if ident in old and (prev is None or key(prev) != own(old[ident])):
                self.emit('PUBLICATION', f'{ident}: result does not advance baseline revision', node)
            if ident not in old and prev is not None:
                self.emit('PUBLICATION', f'{ident}: baseline omits predecessor state', node)
            state[ident] = doc
        if node.get('operation') == 'initial' and baseline_ref is not None:
            self.emit('PUBLICATION', 'initial set must not have baseline', node)
        if node.get('operation') != 'initial' and baseline_ref is None:
            self.emit('PUBLICATION', 'change/correction needs baseline', node)
        if node.get('operation') == 'correction' and not all(children(child(state[i], 'metadata'), 'correction') for i in changed):
            self.emit('CORRECTION', 'correction results need explicit correction targets', node)
        severity = 'error' if node.get('status') == 'accepted' else 'warning'
        comps = {i: d for i, d in state.items() if name(d) == 'componentInstance'}
        assignments = {}
        for building in (d for d in state.values() if name(d) == 'buildingInstance'):
            for p in children(building, 'position'):
                ref = child(p, 'component')
                if ref is None:
                    continue
                cid = ref.get('document')
                loc = (building.get('building'), p.get('id'))
                if cid in assignments:
                    self.emit('COORDINATION', f'{cid}: multiple simultaneous assignments', node, severity)
                assignments[cid] = loc
                if cid not in comps or location(comps[cid]) != loc:
                    self.emit('COORDINATION', f'{cid}: missing or inconsistent current component counterpart', node, severity)
                elif key(ref) != own(comps[cid]) and key(ref) not in self.ancestors(comps[cid]):
                    self.emit('COORDINATION', f'{cid}: installation evidence is not in accepted component lineage', node, severity)
                if cid in comps:
                    witness = self.docs.get(key(ref))
                    if witness is not None and child(witness, 'class').attrib != child(comps[cid], 'class').attrib:
                        self.emit('COORDINATION', f'{cid}: changed class qualification needs a revised building assessment/assignment', node, severity)
                old_building = old.get(building.get('id'))
                oldp = positions(old_building).get(p.get('id')) if old_building is not None else None
                oldref = child(oldp, 'component') if oldp is not None else None
                if old and (oldref is None or oldref.get('document') != cid) and cid not in changed:
                    self.emit('COORDINATION', f'{cid}: new assignment needs a component revision', node, severity)
        for cid, comp in comps.items():
            if location(comp) is not None and assignments.get(cid) != location(comp):
                self.emit('COORDINATION', f'{cid}: installed component lacks matching building assignment', node, severity)
        # A coordinated physical change/correction must state one common effective boundary.
        for ident in changed:
            doc = state[ident]
            before = old.get(ident)
            deployment_change = before is None
            if before is not None and name(doc) == 'componentInstance':
                deployment_change = location(doc) != location(before)
            if before is not None and name(doc) == 'buildingInstance':
                def occupants(b):
                    return {p.get('id'): (child(p, 'component').get('document') if child(p, 'component') is not None else p.get('state')) for p in children(b, 'position')}
                deployment_change = occupants(doc) != occupants(before)
            if deployment_change and time_bounds(child(doc, 'metadata').get('effective')) != time_bounds(child(node, 'metadata').get('effective')):
                self.emit('COORDINATION', f'{ident}: deployment change needs publication effective time (including explicit unknown)', node, severity)
            if deployment_change and before is not None and node.get('operation') != 'correction':
                earlier = time_bounds(child(before, 'metadata').get('effective'))
                later = time_bounds(child(doc, 'metadata').get('effective'))
                if earlier and later and later[1] < earlier[0]:
                    self.emit('TIME_ORDER', f'{ident}: physical change predates baseline state; use an explicit correction where appropriate', node, severity)
        if node.get('status') == 'prepared':
            self.emit('PREPARED', 'prepared set is not an accepted coordinated state', node, 'warning')
        self.cache[k] = state
        return state

    def validate(self, catalogue):
        self.load(Path(catalogue))
        if self.diagnostics:
            return self.report()
        prev_edges = {k: ([key(previous(d))] if previous(d) is not None else []) for k, d in self.docs.items()}
        import_edges = {k: [key(i) for i in children(d, 'import')] for k, d in self.docs.items()}
        self.graph(prev_edges, 'LINEAGE')
        self.graph(import_edges, 'IMPORT_CYCLE')
        roots, kinds = {}, {}
        for node in self.docs.values():
            ident = node.get('id')
            if ident in kinds and kinds[ident] != name(node):
                self.emit('LINEAGE', 'document kind changed across revisions', node)
            kinds[ident] = name(node)
            if previous(node) is None:
                if ident in roots:
                    self.emit('LINEAGE', 'multiple initial revisions of one document; predecessor required', node)
                roots[ident] = own(node)
        definition_edges = {}
        for node in self.docs.values():
            if name(node) == 'buildingClass':
                for definition in children(node, 'definition'):
                    definition_edges[(*own(node), definition.get('id'))] = [
                        target for u in children(definition, 'use') if (target := self.use(u, node))]
        self.graph(definition_edges, 'DEFINITION_CYCLE')
        identities, buildings = {}, {}
        for node in self.docs.values():
            self.metadata(node)
            kind = name(node)
            if kind == 'buildingClass':
                self.class_document(node)
            elif kind == 'componentInstance':
                self.component(node)
                ident = physical(node)
                if ident in identities and identities[ident] != node.get('id'):
                    self.emit('PHYSICAL_IDENTITY', 'two documents claim the same physical identity', node)
                identities[ident] = node.get('id')
            elif kind == 'buildingInstance':
                self.building(node)
                if node.get('building') in buildings and buildings[node.get('building')] != node.get('id'):
                    self.emit('PHYSICAL_IDENTITY', 'two documents claim the same building identity', node)
                buildings[node.get('building')] = node.get('id')
            assessment = child(node, 'assessment')
            if assessment is not None:
                if assessment.get('status') != 'not-assessed' and not children(child(node, 'metadata'), 'evidence'):
                    self.emit('ASSESSMENT', 'recorded assessment needs evidence', node)
                if assessment.get('status') == 'recorded-deviations' and not children(assessment, 'deviation'):
                    self.emit('ASSESSMENT', 'deviation assessment needs a deviation description', node)
        # Broken references can invalidate the assumptions used in publication reconciliation.
        if any(d['severity'] == 'error' for d in self.diagnostics):
            return self.report()
        for node in self.docs.values():
            if name(node) == 'publicationSet':
                self.publication(node)
        accepted = [d for d in self.docs.values() if name(d) == 'publicationSet' and d.get('status') == 'accepted']
        for index, left in enumerate(accepted):
            lb = child(left, 'baseline')
            if lb is None:
                continue
            for right in accepted[index + 1:]:
                rb = child(right, 'baseline')
                if rb is None or key(lb) != key(rb) or left.get('id') == right.get('id'):
                    continue
                lresults = {r.get('document'): r.get('revision') for r in children(left, 'result')}
                rresults = {r.get('document'): r.get('revision') for r in children(right, 'result')}
                if any(lresults[i] != rresults[i] for i in lresults.keys() & rresults.keys()):
                    self.emit('PUBLICATION_CONFLICT', f'competing accepted updates from {key(lb)}: {own(left)} and {own(right)}; resolve explicitly', right)
        return self.report()

    def report(self):
        return {'valid': not any(d['severity'] == 'error' for d in self.diagnostics),
                'engineering': 'not assessed; records are assertions, not certification',
                'documents': len(self.docs), 'diagnostics': self.diagnostics}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', type=Path, help='catalogue.xml or standalone model XML')
    parser.add_argument('--structural-only', action='store_true', help='XSD only; no cross-document claims')
    args = parser.parse_args()
    validator = Validator()
    if args.structural_only:
        validator.structural(args.path)
        report = validator.report()
        report['scope'] = 'structural only'
    else:
        report = validator.validate(args.path)
        report['scope'] = 'supplied catalogue and explicit publication baselines only'
    print(json.dumps(report, indent=2))
    return 0 if report['valid'] else 1


if __name__ == '__main__':
    sys.exit(main())
