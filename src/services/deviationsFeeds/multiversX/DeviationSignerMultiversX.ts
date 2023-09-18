import {UserSigner} from "@multiversx/sdk-wallet";

import {ethers} from "ethers";

export class DeviationSignerMultiversX {
  static async apply(signer: UserSigner, dataHash: string): Promise<string> {
    const newData = Buffer.concat([
      Buffer.from("\x19MultiversX Signed Message:\n32"),
      Buffer.from(dataHash.replace('0x', ''), 'hex')
    ]);

    const newDataHash = ethers.utils.keccak256(newData);
    const signature = await signer.sign(Buffer.from(newDataHash.replace('0x', ''), 'hex'));

    return `${signer.getAddress().bech32()}@${signature.toString('hex')}`;
  }
}
