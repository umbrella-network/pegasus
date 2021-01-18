/**
 * HEX representation of the value encoded with LeafValueCoder.
 * The leading `0x` is required for `ethers.utils.solidityKeccak256` to work, as
 * it looks for it.
 */
export type HexStringWith0x = string;
