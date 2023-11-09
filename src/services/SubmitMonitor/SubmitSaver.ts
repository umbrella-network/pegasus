import {inject, injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {SubmitMonitor} from '../../types/SubmitMonitor.js';
import {SubmitTxKeyResolver} from './SubmitTxKeyResolver.js';

@injectable()
export class SubmitSaver {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(chainId: ChainsIds, dataTimestamp: number, txHash: string): Promise<void> {
    const submitMonitor: SubmitMonitor = {dataTimestamp, txHash};
    await this.mappingRepository.set(this.key(chainId), JSON.stringify(submitMonitor));
  }

  protected key(chainId: ChainsIds): string {
    return SubmitTxKeyResolver.apply(chainId);
  }
}
