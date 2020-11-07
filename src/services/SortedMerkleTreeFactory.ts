import {injectable} from 'inversify';
import int64 from 'int64-buffer';

import Leaf from '../models/Leaf';
import SortedMerkleTree from '../models/SortedMerkleTree';

@injectable()
class SortedMerkleTreeFactory {
  apply(leaves: Leaf[]): SortedMerkleTree {
    const treeData = leaves
      .map((leaf) => {
        const key = leaf.label;
        const value = this.intToBuffer(leaf.value);
        return {[key]: value};
      })
      .reduce((acc, v) => ({...acc, ...v}), {});

    return new SortedMerkleTree(treeData);
  }

  intToBuffer(i: number): Buffer {
    const hex = new int64.Int64BE(i).toBuffer().toString('hex')
    const hexInt = hex.replace(/^0+/g, '')
    return Buffer.from(`${hexInt.length % 2 === 0 ? '' : '0'}${hexInt}`, 'hex')
  }
}

export default SortedMerkleTreeFactory;
