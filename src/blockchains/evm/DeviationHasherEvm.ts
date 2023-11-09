import {injectable} from 'inversify';
import {ethers} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {PriceData} from '../../types/DeviationFeeds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const feedsAbi = JSON.parse(readFileSync(__dirname + '/contracts/UmbrellaFeeds.abi.json', 'utf-8'));
    const submitAbi = feedsAbi.abi.find((data: {name?: string}) => data?.name === 'update');

    if (!submitAbi) throw new Error('missing `update()` in ABI');

    const {inputs} = submitAbi;

    // [keys, priceDatas]
    return [inputs[0], inputs[1]];
  }
}
