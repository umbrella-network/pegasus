import {utils} from 'ethers';
import {inject, injectable} from 'inversify';
import {BaseProvider} from '@ethersproject/providers';
import {ChainsIds} from '../../types/ChainsIds.js';
import {ProviderRepository} from '../../repositories/ProviderRepository.js';
import {FeedFetcherOptions} from '../../types/fetchers.js';

@injectable()
export class RandomNumberFetcher {
  @inject(ProviderRepository) protected providerRepository!: ProviderRepository;

  async apply(params: {numBlocks: number}, options: FeedFetcherOptions): Promise<string> {
    const {numBlocks = 10} = params;
    const {timestamp} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    const evmProvider = this.providerRepository.get(ChainsIds.POLYGON).getRawProviderSync<BaseProvider>();
    let latest = await evmProvider.getBlock('latest');

    while (latest.timestamp >= timestamp) {
      latest = await evmProvider.getBlock(latest.number - 1);
    }

    const blocks = await Promise.all(
      [...new Array(numBlocks - 1)].map((_, i) => evmProvider.getBlock(latest.number - numBlocks + i + 1)),
    );

    blocks.push(latest);

    return utils.keccak256(
      utils.defaultAbiCoder.encode(
        blocks.map(() => 'bytes32'),
        blocks.map((block) => block.hash),
      ),
    );
  }
}
