import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from '../types/ChainsIds';
import {StakingBankContractRepository} from '../repositories/StakingBankContractRepository';
import {ValidatorRepository} from '../repositories/ValidatorRepository';

@injectable()
export class ValidatorsResolver {
  @inject('Logger') logger!: Logger;
  @inject(StakingBankContractRepository) protected stakingBankContractRepository!: StakingBankContractRepository;
  @inject(ValidatorRepository) protected validatorRepository!: ValidatorRepository;

  async apply(): Promise<void> {
    await Promise.all(Object.values(ChainsIds).map((chainId) => this.resolveValidators(chainId as ChainsIds)));
  }

  protected async resolveValidators(chainId: ChainsIds): Promise<void> {
    const bank = this.stakingBankContractRepository.get(chainId);
    if (!bank) return;

    try {
      const validators = await bank.resolveValidators();
      this.logger.info(`[ValidatorsResolver] cached ${validators.length} validators for ${chainId}`);
      await this.validatorRepository.cache(chainId, validators);
    } catch (e) {
      this.logger.error(`[ValidatorsResolver] ${chainId}: ${e.message}`);
      const [address, networkId] = await Promise.all([bank.address(), bank.chainId()]);
      this.logger.info(`[ValidatorsResolver] bank ${address} chainId: ${bank.chainId()}, networkId: ${networkId}`);
    }
  }
}
