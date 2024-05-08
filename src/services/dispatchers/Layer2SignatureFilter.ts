import {inject, injectable} from 'inversify';

import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {SignatureWithSigner} from '../../types/DeviationFeeds.js';

@injectable()
export class Layer2SignatureFilter {
  @inject(ValidatorRepository) protected validatorRepository!: ValidatorRepository;

  apply = async (signatureWithSigners: SignatureWithSigner[], chainId: ChainsIds): Promise<string[]> => {
    const chainValidators = await this.validatorsMap(chainId);

    return this.filterOutValidators(signatureWithSigners, chainValidators);
  };

  protected filterOutValidators(
    signatureWithSigners: SignatureWithSigner[],
    chainValidators: Record<string, boolean>,
  ): string[] {
    return signatureWithSigners.filter((sig) => {
      return chainValidators[sig.signer];
    }).map(s => s.signature);
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
