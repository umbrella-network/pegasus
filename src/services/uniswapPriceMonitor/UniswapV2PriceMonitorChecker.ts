import {inject, injectable} from 'inversify';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {UNISWAPV2_PRICE_MONITOR_KEY} from './key.js';

@injectable()
export class UniswapV2PriceMonitorChecker {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(): Promise<number | undefined> {
    const data = await this.mappingRepository.get(UNISWAPV2_PRICE_MONITOR_KEY);
    return data ? parseInt(data, 10) : undefined;
  }
}
