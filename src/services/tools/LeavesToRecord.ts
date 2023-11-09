import Leaf from '../../types/Leaf.js';

export class LeavesToRecord {
  static apply(leaves: Leaf[]): Record<string, Leaf> {
    const result: Record<string, Leaf> = {};

    leaves.forEach((leaf) => {
      result[leaf.label] = leaf;
    });

    return result;
  }
}
