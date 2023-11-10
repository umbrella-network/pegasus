import {inject, injectable} from 'inversify';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {SubmitMonitor} from '../../types/SubmitMonitor.js';
import {SubmitTxKeyResolver} from './SubmitTxKeyResolver.js';
import {ChainsIds} from '../../types/ChainsIds.js';

@injectable()
export class LastSubmitResolver {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(chainId: ChainsIds): Promise<SubmitMonitor | undefined> {
    const submitMonitorRaw = await this.mappingRepository.get(this.key(chainId));

    if (!submitMonitorRaw) {
      return undefined;
    }

    return JSON.parse(submitMonitorRaw);
  }

  protected key(chainId: ChainsIds): string {
    return SubmitTxKeyResolver.apply(chainId);
  }
}
