"""Rebuild hero meshes from originals, avoiding the paid remesh's surface damage."""
import hashlib
import json
import os
import pathlib
import struct
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
CLI = os.environ.get('GLTFPACK', str(pathlib.Path.home() / '.local/share/space-taxi-tools/gltfpack-1.3/gltfpack'))
CATALOG = json.loads((ROOT / 'meshy_output/catalog.json').read_text())
manifest_path = ROOT / 'assets/models/manifest.json'
manifest = json.loads(manifest_path.read_text())

def stats(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + length])
    triangles = sum(gltf['accessors'][p['indices']]['count'] // 3
                    for mesh in gltf['meshes'] for p in mesh['primitives'])
    return raw, triangles

for name, ratio, error, edge in [('taxi-classic', .025, .005, 1024),
                                  ('landing-platform-enamel', .032, .002, 512)]:
    record = next(item for item in CATALOG if item['id'] == name)
    source = ROOT / 'meshy_output' / pathlib.Path(record['project']).name / pathlib.Path(record['model']).name
    output = ROOT / 'assets/models' / (name + '.glb')
    original, original_triangles = stats(source)
    subprocess.run([CLI, '-i', str(source), '-o', str(output), '-si', str(ratio),
                    '-se', str(error), '-noq', '-tw', '-tl', str(edge), '-tq', '9', '-kn'], check=True)
    data, triangles = stats(output)
    entry = dict(id=name, file=output.name, source=str(source.relative_to(ROOT)),
                 source_sha256=hashlib.sha256(original).hexdigest(), sha256=hashlib.sha256(data).hexdigest(),
                 source_bytes=len(original), bytes=len(data), texture_max_edge=edge,
                 source_triangles=original_triangles, triangles=triangles, bones=0, animations=[],
                 optimizer='gltfpack 1.3', refinement=True, simplification_ratio=ratio, max_relative_error=error)
    manifest = [entry if item['id'] == name else item for item in manifest]
    print(f'{name}: {triangles:,} triangles, {len(data):,} bytes')
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
