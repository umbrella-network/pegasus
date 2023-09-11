import {ethers, Wallet} from "ethers";

export class DeviationSignerEvm {
  static async apply(signer: Wallet, hash: string): Promise<string> {
    const toSign = ethers.utils.arrayify(hash);
    return signer.signMessage(toSign);
  }
}
