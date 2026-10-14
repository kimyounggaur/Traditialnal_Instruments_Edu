"""Build a source-only ZIP without dependencies, raw originals, secrets or QA screenshots."""
from pathlib import Path
import argparse, zipfile
parser=argparse.ArgumentParser()
parser.add_argument('output')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
out=Path(args.output).resolve()
excluded={'node_modules','.next','.git','playwright-report','test-results','__pycache__'}
files=[]
for p in sorted(root.rglob('*')):
    rel=p.relative_to(root)
    if not p.is_file() or any(part in excluded for part in rel.parts): continue
    if p.name.startswith('.env') or p.suffix in {'.tsbuildinfo','.pyc','.pptx','.zip'}: continue
    if p==out: continue
    files.append(p)
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:z.write(p,Path(root.name)/p.relative_to(root))
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    assert any(n.endswith('package-lock.json') for n in z.namelist())
    assert any(n.endswith('docs/TEST_REPORT.md') for n in z.namelist())
print(f'{out.name}: {len(files)} files, {out.stat().st_size:,} bytes, ZIP integrity PASS')
