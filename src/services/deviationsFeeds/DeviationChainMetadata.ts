import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {OnChainMetadataType} from '../../types/DeviationFeeds';
import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository';
import {DataCollection} from '../../types/custom';

@injectable()
export class DeviationChainMetadata {
  @inject('Logger') logger!: Logger;
  @inject(BlockchainRepository) protected blockchainRepository!: BlockchainRepository;
  @inject(FeedsContractRepository) protected feedsContractRepository!: FeedsContractRepository;

  async apply(feedsForChain: DataCollection<string[]>): Promise<OnChainMetadataType[]> {
    const chains = Object.keys(feedsForChain);

    const onChainMetadata = await Promise.all(
      chains.map((chainId) => {
        if (feedsForChain[chainId].length == 0) {
          return;
        }

        return this.getOnChainMetadata(chainId);
      }),
    );

    return onChainMetadata.filter((d) => !!d) as OnChainMetadataType[];
  }

  protected async getOnChainMetadata(chainId: string): Promise<OnChainMetadataType | undefined> {
    try {
      return <OnChainMetadataType>(
        await Promise.all([
          chainId,
          this.blockchainRepository.get(chainId).networkId(),
          this.feedsContractRepository.get(chainId).address(),
        ])
      );
    } catch (e) {
      this.logger.warn(`[${chainId}] ${e.message}`);
      return;
    }
  }
}
