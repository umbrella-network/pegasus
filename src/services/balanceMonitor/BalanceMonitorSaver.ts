import {inject, injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds';
import {MappingRepository} from '../../repositories/MappingRepository';
import {BalanceMonitorKeyResolver} from './BalanceMonitorKeyResolver';

@injectable()
export class BalanceMonitorSaver {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(chainId: ChainsIds, balance: string, error: boolean, walletAddress: string): Promise<void> {
    const data = {balance, error};
    await this.mappingRepository.set(this.key(chainId, walletAddress), JSON.stringify(data));
  }

  protected key(chainId: ChainsIds, walletAddress: string): string {
    return BalanceMonitorKeyResolver.apply(chainId, walletAddress);
  }
}
