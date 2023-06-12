import {KeyValues} from "../../types/SignedBlock";
import Leaf from "../../types/Leaf";

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
