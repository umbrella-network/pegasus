import {inject, injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds';
import {MappingRepository} from '../../repositories/MappingRepository';
import {SubmitMonitor} from '../../types/SubmitMonitor';
import {SubmitTxKeyResolver} from "./SubmitTxKeyResolver";

@injectable()
export class SubmitSaver {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(chainId: ChainsIds, dataTimestamp: number, txHash: string): Promise<void> {
    const submitMonitor: SubmitMonitor = {dataTimestamp, txHash};
    await this.mappingRepository.set(SubmitTxKeyResolver.apply(chainId), JSON.stringify(submitMonitor));
  }
}
