import {injectable} from 'inversify';
import {ethers} from 'ethers';

import {PriceData} from '../../types/DeviationFeeds';
import {abi} from './contracts/UmbrellaFeeds.abi.json';

@injectable()
export class DeviationHasherEvm {
  static apply(networkId: number, target: string, keys: string[], priceDatas: PriceData[]): string {
    const testimony = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', ...this.priceDatasAbi()],
      [networkId, target, keys.map(ethers.utils.id), priceDatas],
    );

    return ethers.utils.keccak256(testimony);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static priceDatasAbi(): any {
    const submitAbi = abi.find((data: {name?: string}) => data?.name === 'update');

    if (!submitAbi) throw new Error('missing `update()` in ABI');

    const {inputs} = submitAbi;

    // [keys, priceDatas]
    return [inputs[0], inputs[1]];
  }
}
