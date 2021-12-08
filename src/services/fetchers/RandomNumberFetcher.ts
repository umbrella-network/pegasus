import {utils} from 'ethers';
import {inject, injectable} from 'inversify';

import Blockchain from '../../lib/Blockchain';

@injectable()
class RandomNumberFetcher {
  @inject(Blockchain) blockchain!: Blockchain;

  async apply({numBlocks = 10} = {}, timestamp: number): Promise<string> {
    let latest = await this.blockchain.provider.getBlock('latest');

    while (latest.timestamp >= timestamp) {
      latest = await this.blockchain.provider.getBlock(latest.number - 1);
    }

    const blocks = await Promise.all([...new Array(numBlocks - 1)]
      .map((_, i) => this.blockchain.provider.getBlock(latest.number - numBlocks + i + 1)));

    blocks.push(latest);

    return utils.keccak256(utils.defaultAbiCoder.encode(blocks.map(() => 'bytes32'), blocks.map((block) => block.hash)));
  }
}

export default RandomNumberFetcher;
