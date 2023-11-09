import {KeyValues} from '../../types/SignedBlock.js';
import Leaf from '../../types/Leaf.js';

export class KeyValuesToLeaves {
  static apply(keyValues: KeyValues): Leaf[] {
    return Object.entries(keyValues).map(
      ([label, valueBytes]): Leaf => ({
        label,
        valueBytes,
      }),
    );
  }
}
