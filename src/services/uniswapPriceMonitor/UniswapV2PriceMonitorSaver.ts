import {inject, injectable} from 'inversify';

import {MappingRepository} from '../../repositories/MappingRepository';
import {UNISWAPV2_PRICE_MONITOR_KEY} from './key';

@injectable()
export class UniswapV2PriceMonitorSaver {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(prices: number): Promise<void> {
    await this.mappingRepository.set(UNISWAPV2_PRICE_MONITOR_KEY, prices.toString());
  }
}
