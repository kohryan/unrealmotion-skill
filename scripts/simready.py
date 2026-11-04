#!/usr/bin/env python3
"""Metadata-only NVIDIA SimReady catalog and budgeted thumbnail retrieval. Never downloads USD/textures."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

from hf_dataset import tls_context

ROOT = Path(__file__).resolve().parent.parent
DATASET = 'nvidia/simready-assets'
REVISION = '9d4556bfe80868c1d27a7a7ba1c2774e63e8cedd'
API = f'https://huggingface.co/api/datasets/{DATASET}/tree/{REVISION}'
CATALOG = ROOT / 'data/nvidia-catalog.jsonl'


def request(url, limit=8 * 1024 * 1024):
    req = urllib.request.Request(url, headers={'User-Agent':'unrealmotion-skill/1.0'})
    with urllib.request.urlopen(req, context=tls_context(), timeout=90) as response:
        length = response.headers.get('Content-Length')
        if length and int(length) > limit:
            raise ValueError(f'Reference exceeds download budget: {length} > {limit}')
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError('Reference exceeds download budget')
        return body, response.headers


def tree(prefix='', recursive=False):
    url = API + ('/' + urllib.parse.quote(prefix, safe='/') if prefix else '') + f'?recursive={str(recursive).lower()}&limit=1000'
    result = []
    while url:
        body, headers = request(url)
        result.extend(json.loads(body))
        match = re.search(r'<([^>]+)>;\s*rel="next"', headers.get('Link',''))
        url = match.group(1) if match else None
        if url and not url.startswith(API + '?') and not url.startswith(API + '/'):
            raise ValueError('Unexpected pagination target')
    return result


def refresh(output):
    rows = []
    for row in tree():
        if row['type'] == 'directory' and not row['path'].startswith('.'):
            name = row['path']
            title = re.sub(r'([a-z])([A-Z])', r'\1 \2', name).replace('_',' ')
            rows.append({'id':name,'title':title,'category':name.split('_')[0],'treeOid':row['oid']})
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(''.join(json.dumps(r,separators=(',',':'))+'\n' for r in rows),encoding='utf-8')
    manifest = {'dataset':DATASET,'revision':REVISION,'license':'CC-BY-4.0','rows':len(rows),'metadataOnly':True,
                'catalogSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'source':f'https://huggingface.co/datasets/{DATASET}',
                'upstreamFormat':'USD packages with referenced textures/payloads','fullDatasetDownloaded':False,'builtAt':'2026-11-04'}
    output.with_name('nvidia-source.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest


def select_files(files):
    # Object previews only; texture/source_assets thumbnails are not a reference view of the model.
    previews = [f for f in files if f['type']=='file' and '/simready_usd/.thumbs/' in f['path'] and f['path'].endswith('.png')]
    previews.sort(key=lambda f: (not f['path'].endswith('_thumbnail.png'), f.get('size',10**12)))
    license_file = next((f for f in files if f['path'].endswith('/.metadata/LICENSE.txt')),None)
    if not previews or not license_file:
        raise ValueError('Asset lacks an object preview or license file')
    return [previews[0],license_file]


def reference(asset, output, budget):
    if output.exists():
        raise ValueError('Reference directory exists; choose a new output path')
    files = tree(asset,recursive=True)
    selected = select_files(files)
    expected = sum(f.get('size',0) for f in selected)
    if expected > budget:
        raise ValueError(f'Selected thumbnail/license requires {expected} bytes, over the {budget}-byte budget')
    downloads = []
    for item in selected:
        url = f'https://huggingface.co/datasets/{DATASET}/resolve/{REVISION}/' + urllib.parse.quote(item['path'],safe='/')
        data,_ = request(url,budget-sum(len(b) for _,b in downloads))
        downloads.append((item,data))
    output.mkdir(parents=True)
    saved=[]
    for item,body in downloads:
        name='reference.png' if item['path'].endswith('.png') else 'LICENSE.txt'
        (output/name).write_bytes(body)
        saved.append({'file':name,'sourcePath':item['path'],'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})
    result={'asset':asset,'dataset':DATASET,'revision':REVISION,'source':f'https://huggingface.co/datasets/{DATASET}/tree/{REVISION}/{asset}',
            'attribution':f'NVIDIA SimReady asset {asset}, CC BY 4.0; reference thumbnail only. Any reconstruction is an approximation, not NVIDIA geometry.',
            'license':'CC-BY-4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
            'downloadedBytes':sum(len(b) for _,b in downloads),'downloadedGeometry':False,'downloadedTextures':False,'files':saved}
    (output/'provenance.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    r=sub.add_parser('refresh',help='Fetch paginated root directory metadata only')
    r.add_argument('--output',type=Path,default=CATALOG)
    s=sub.add_parser('search',help='Offline search; English asset names/material terms')
    s.add_argument('query');s.add_argument('--limit',type=int,default=8)
    f=sub.add_parser('reference',help='Download only one thumbnail and its license, within a byte budget')
    f.add_argument('id');f.add_argument('--output',type=Path,required=True);f.add_argument('--max-mb',type=float,default=2)
    args=parser.parse_args()
    if args.command=='refresh':result=refresh(args.output.resolve())
    else:
        rows=[json.loads(line) for line in CATALOG.read_text().splitlines()]
        if args.command=='search':
            if not 1<=args.limit<=50:parser.error('limit must be 1–50')
            terms=set(re.findall(r'[a-z0-9]+',args.query.lower()))
            ranked=[{**r,'score':sum(t in r['title'].lower() for t in terms)} for r in rows]
            result=sorted((r for r in ranked if r['score']),key=lambda r:(-r['score'],r['id']))[:args.limit]
        else:
            if not any(r['id']==args.id for r in rows):parser.error('Unknown asset id; use search')
            if not 0<args.max_mb<=32:parser.error('Thumbnail budget must be >0 and <=32 MB')
            result=reference(args.id,args.output.resolve(),int(args.max_mb*1024*1024))
    print(json.dumps(result,indent=2))


if __name__=='__main__':
    try:main()
    except (OSError,ValueError) as error:
        print(f'SimReady reference: {error}',file=sys.stderr);sys.exit(1)
