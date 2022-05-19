import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {PriceRepository} from '../repositories/PriceRepository';
import {Logger} from 'winston';
import {FeedPrice} from '../types/Feed';
import {chunk} from 'lodash';

@injectable()
export class PriceService {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(PriceRepository) priceRepository!: PriceRepository;

  async savePrices(price: FeedPrice[]): Promise<void> {
    try {
      for (const batch of chunk(price, this.settings.mongodb.priceBatchSize)) {
        await this.priceRepository.saveBatch(batch);
      }
      this.logger.info('[PriceService] Prices saved');
    } catch (e) {
      this.logger.error(`[PriceService] Error saving prices, skipping...`);
      this.logger.error('[PriceService]', e);
    }
  }
}
