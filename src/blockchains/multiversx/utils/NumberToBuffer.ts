export class NumberToBuffer {
  static apply(n: number | bigint, bits?: number): Buffer {
    const hex = n.toString(16);
    const strLen = bits ? bits / 4 : hex.length + (hex.length % 2);
    return Buffer.from(hex.padStart(strLen, '0'), 'hex');
  }
}
