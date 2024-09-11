import {inject, injectable} from 'inversify';

import {DeviationConsensus} from '../../models/DeviationConsensus.js';
import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {SignatureWithSigner} from '../../types/DeviationFeeds.js';

@injectable()
export class ConsensusSignatureFilter {
  @inject(ValidatorRepository) protected validatorRepository!: ValidatorRepository;

  apply = async (consensus: DeviationConsensus): Promise<DeviationConsensus> => {
    const chainValidators = await this.validatorsMap(consensus.chainId as ChainsIds);

    return {
      ...consensus,
      signatures: this.filterOutValidators(consensus, chainValidators),
    };
  };

  protected filterOutValidators(
    consensus: DeviationConsensus,
    chainValidators: Record<string, boolean>,
  ): SignatureWithSigner[] {
    return consensus.signatures.filter((sig) => {
      return chainValidators[sig.signer];
    });
  }

  protected async validatorsMap(chainId: ChainsIds): Promise<Record<string, boolean>> {
    const chainValidators = await this.validatorRepository.list(chainId);
    const chainValidatorsMap: Record<string, boolean> = {};

    chainValidators.forEach((v) => {
      chainValidatorsMap[v.id.toLowerCase()] = true;
    });

    return chainValidatorsMap;
  }
}
