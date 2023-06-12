import {inject, injectable} from 'inversify';
import {ethers} from "ethers";

import Blockchain from "../../lib/Blockchain";
import {PriceData} from "../../types/DeviationFeeds";
import {abi} from "../../contracts/UmbrellaFeeds.abi.json";

@injectable()
export class DeviationSigner {
  @inject(Blockchain) blockchain!: Blockchain;

  async apply(networkId: number, target: string, keys: string[], priceDatas: PriceData[]): Promise<string> {
    const testimony = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', ...this.priceDatasAbi()],
      [networkId, target, keys.map(ethers.utils.id), priceDatas]
    );

    const hash = ethers.utils.keccak256(testimony);
    const toSign = ethers.utils.arrayify(hash);
    return this.blockchain.wallet.signMessage(toSign);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected priceDatasAbi(): any {
    const submitAbi = abi.find((data: {name?: string}) => data?.name === 'update');

    if (!submitAbi) throw new Error('missing `update()` in ABI');

    const {inputs} = submitAbi;

    // [keys, priceDatas]
    return [inputs[0], inputs[1]];
  }
}
