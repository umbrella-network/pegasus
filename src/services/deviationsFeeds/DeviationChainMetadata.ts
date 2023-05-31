import {inject, injectable} from 'inversify';
import {Promise} from "mongoose";

import {OnChainMetadataType} from "../../types/DeviationFeeds";
import {BlockchainRepository} from "../../repositories/BlockchainRepository";
import {FeedsContractRepository} from "../../repositories/FeedsContractRepository";
import {DataCollection} from "../../types/custom";

@injectable()
export class DeviationChainMetadata {
  @inject(BlockchainRepository) protected blockchainRepository!: BlockchainRepository;
  @inject(FeedsContractRepository) protected feedsContractRepository!: FeedsContractRepository;

  async apply(feedsForChain: DataCollection<string[]>): Promise<OnChainMetadataType[]> {
    const chains = Object.keys(feedsForChain);

    const onChainMetadata = await Promise.all(chains.map((chainId) => {
      if (feedsForChain[chainId].length == 0) {
        return;
      }

      return Promise.all([
        chainId,
        this.blockchainRepository.get(chainId).networkId(),
        this.feedsContractRepository.get(chainId).address()
      ]);
    }));

    return onChainMetadata.filter((d: OnChainMetadataType | undefined) => !!d);
  }
}
