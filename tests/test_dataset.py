import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('hf_dataset',ROOT/'scripts/hf_dataset.py')
hf=importlib.util.module_from_spec(spec)
spec.loader.exec_module(hf)


class DatasetTest(unittest.TestCase):
    def test_complete_pinned_catalog(self):
        raw=hf.CATALOG.read_bytes()
        source=json.loads((ROOT/'data/hf-source.json').read_text())
        rows=[json.loads(line) for line in raw.splitlines()]
        self.assertEqual(len(rows),4146)
        self.assertEqual(len({r['id'] for r in rows}),4146)
        self.assertEqual(hashlib.sha256(raw).hexdigest(),source['catalogSha256'])
        self.assertEqual(sum(r['split']=='validation' for r in rows),213)
        self.assertNotIn(b'reasoning_content',raw)
        result=hf.search(rows,'camera optical lens mechanical',3,4)
        self.assertEqual(result[0]['id'],'scene-002322')
        self.assertTrue(all(r['level']>=4 and not r['voxel'] for r in result))

    def test_extracts_code_without_reasoning_or_surrounding_prose(self):
        row={'messages':[{'role':'assistant','content':'Here is the scene\n```html\n<html><body>Scene</body></html>\n```\nDone','reasoning_content':'PRIVATE_REASONING_SENTINEL'}]}
        self.assertEqual(hf.code_from_row(row),'<html><body>Scene</body></html>\n')
        self.assertNotIn('SENTINEL',hf.code_from_row(row))
        with self.assertRaises(ValueError):hf.code_from_row({'messages':[{'role':'assistant','content':'no scene'}]})

    def test_rejects_corrupt_cache_without_network(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'bad.parquet').write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError,'checksum mismatch'):hf.download_shard('bad.parquet',p,'not-the-hash')


if __name__=='__main__':unittest.main()
