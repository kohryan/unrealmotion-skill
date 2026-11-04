import {smoother, progress} from './motion.mjs';

// Each node keeps its assembled LOCAL pose. Parents may animate too; never bake world poses into children.
export function createReassembly(parts) {
  const ids = new Set();
  const records = parts.map(({id, node, offset, start, end}) => {
    if (!id || ids.has(id) || !node?.position?.clone || !Array.isArray(offset) || offset.length !== 3 || !offset.every(Number.isFinite) || !(start >= 0 && end > start && end <= 1)) throw new Error('Invalid reassembly part or timeline');
    ids.add(id); return {id, node, offset, start, end, rest:node.position.clone()};
  });
  return {
    update(u) {
      for (const p of records) {
        const distance = 1 - smoother(progress(u, p.start, p.end));
        p.node.position.copy(p.rest);
        p.node.position.x += p.offset[0] * distance;
        p.node.position.y += p.offset[1] * distance;
        p.node.position.z += p.offset[2] * distance;
      }
    },
    inspect() { return records.map(p => ({id:p.id, position:[...p.node.position], rest:[...p.rest], assemblyError:p.node.position.distanceTo(p.rest)})); }
  };
}
