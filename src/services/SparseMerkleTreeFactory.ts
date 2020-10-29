import { injectable } from 'inversify';
import Leaf from '../models/Leaf';
import SparseMerkleTree from '../models/SparseMerkleTree';

@injectable()
class SparseMerkleTreeFactory {
  apply (leaves: Leaf[]): SparseMerkleTree {
    const treeData = leaves
      .map((leaf) => Buffer.concat([Buffer.from(leaf.label), Buffer.from([leaf.value])]));
      // .map((leaf) => ({ [leaf.label]: Buffer.from([leaf.value]) })); // [{ 'eth-usd': 100.0 }, { 'eth-eur': 150.0 }]
      // .reduce((acc, v) => ({ ...acc, ...v }), {}); // ["blah", "bluh"]

    const depth = Math.max(2, Math.ceil(Math.log2(leaves.length)) + 1);
    return new SparseMerkleTree(treeData, depth);
  }
}

export default SparseMerkleTreeFactory;
