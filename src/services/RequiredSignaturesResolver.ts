import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from '../types/ChainsIds';
import {ChainContractRepository} from '../repositories/ChainContractRepository';
import {FeedsContractRepository} from '../repositories/FeedsContractRepository';
import {RequiredSignaturesRepository} from '../repositories/RequiredSignaturesRepository';
import {NumberOfSignatures} from '../types/NumberOfSignatures';
import {BlockchainType} from '../types/Settings';

@injectable()
export class RequiredSignaturesResolver {
  @inject('Logger') logger!: Logger;
  @inject(ChainContractRepository) protected chainContractRepository!: ChainContractRepository;
  @inject(FeedsContractRepository) protected feedsContractRepository!: FeedsContractRepository;
  @inject(RequiredSignaturesRepository) protected requiredSignaturesRepository!: RequiredSignaturesRepository;

  async apply(): Promise<void> {
    const data = (await this.requiredSignaturesRepository.getAll()) || {};

    const datas = await Promise.all(
      Object.values(ChainsIds).map((chainId) => this.resolveNumberOfSignatures(chainId as ChainsIds, data[chainId])),
    );

    Object.values(ChainsIds).forEach((chainId, i) => {
      data[chainId] = datas[i];
    });

    await this.requiredSignaturesRepository.cache(data);
  }

  protected async resolveNumberOfSignatures(
    chainId: ChainsIds,
    data: NumberOfSignatures | undefined,
  ): Promise<NumberOfSignatures> {
    const chain = this.chainContractRepository.get(chainId);
    const onChain = this.feedsContractRepository.get(chainId);

    if (!data) {
      data = {
        [BlockchainType.LAYER2]: 0,
        [BlockchainType.ON_CHAIN]: 0,
      };
    }

    try {
      if (chain) data[BlockchainType.LAYER2] = await chain.requiredSignatures();
    } catch (e) {
      this.logger.debug(`[RequiredSignaturesResolver] ${chainId}/${BlockchainType.LAYER2}: ${e.message}`);
    }

    try {
      if (onChain) data[BlockchainType.ON_CHAIN] = await onChain.requiredSignatures();
    } catch (e) {
      this.logger.debug(`[RequiredSignaturesResolver] ${chainId}/${BlockchainType.ON_CHAIN}: ${e.message}`);
    }

    return data;
  }
}
