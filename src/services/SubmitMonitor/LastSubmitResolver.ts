import {inject, injectable} from 'inversify';

import {MappingRepository} from '../../repositories/MappingRepository';
import {SubmitMonitor} from '../../types/SubmitMonitor';
import {SubmitTxKeyResolver} from "./SubmitTxKeyResolver";
import {ChainsIds} from "../../types/ChainsIds";

@injectable()
export class LastSubmitResolver {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(chainId: ChainsIds): Promise<SubmitMonitor | undefined> {
    const submitMonitorRaw = await this.mappingRepository.get(SubmitTxKeyResolver.apply(chainId));

    if (!submitMonitorRaw) {
      return undefined;
    }

    return JSON.parse(submitMonitorRaw);
  }
}
