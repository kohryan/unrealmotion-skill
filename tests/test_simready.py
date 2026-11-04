import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('simready',ROOT/'scripts/simready.py')
sim=importlib.util.module_from_spec(spec);spec.loader.exec_module(sim)


class SimReadyTest(unittest.TestCase):
    def test_metadata_catalog_is_complete_and_pinned(self):
        raw=(ROOT/'data/nvidia-catalog.jsonl').read_bytes()
        source=json.loads((ROOT/'data/nvidia-source.json').read_text())
        rows=[json.loads(line) for line in raw.splitlines()]
        self.assertEqual(len(rows),2677)
        self.assertEqual(len({r['id'] for r in rows}),2677)
        self.assertEqual(hashlib.sha256(raw).hexdigest(),source['catalogSha256'])
        self.assertTrue(source['metadataOnly'])
        self.assertFalse(source['fullDatasetDownloaded'])
        self.assertIn('consumable_bearing_ball_a01',{r['id'] for r in rows})

    def test_reference_selection_never_pulls_geometry_or_texture_thumbnails(self):
        files=[{'type':'file','path':p,'size':100} for p in ['x/simready_usd/payloads/geometries.usd','x/simready_usd/Textures/.thumbs/a.png','x/simready_usd/.thumbs/model_thumbnail.png','x/.metadata/LICENSE.txt']]
        result=sim.select_files(files)
        self.assertEqual([r['path'] for r in result],['x/simready_usd/.thumbs/model_thumbnail.png','x/.metadata/LICENSE.txt'])
        with self.assertRaises(ValueError):sim.select_files(files[:2])


if __name__=='__main__':unittest.main()
