import { LeafType } from "@umb-network/toolbox";

export function getLeafType(value: unknown): LeafType {
  if (Number.isFinite(value)) {
    return Number.isInteger(value) ? LeafType.TYPE_INTEGER : LeafType.TYPE_FLOAT;
  }

  return LeafType.TYPE_HEX;
}
