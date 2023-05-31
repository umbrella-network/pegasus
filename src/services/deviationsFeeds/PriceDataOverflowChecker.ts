import {inject, injectable} from 'inversify';

import {PriceData} from '../../types/DeviationFeeds';
import {Logger} from 'winston';

@injectable()
export class PriceDataOverflowChecker {
  @inject('Logger') logger!: Logger;

  apply(priceData: PriceData): boolean {
    const {data, price, heartbeat, timestamp} = priceData;

    let valid = true;

    const dataMaxUint8 = 2 ** 8;
    const heartbeatMaxUint24 = 2 ** 24;
    const timestampMaxUint32 = 2 ** 32;
    const priceMaxUint128 = 2n ** 128n;

    if (data >= dataMaxUint8) {
      valid = false;
      this.logger.error(`[PriceDataOverflowChecker] data: got ${data}, max uint8 ${dataMaxUint8}`);
    }

    if (heartbeat >= heartbeatMaxUint24) {
      valid = false;
      this.logger.error(`[PriceDataOverflowChecker] heartbeat: got ${heartbeat}, max uint24 ${heartbeatMaxUint24}`);
    }

    if (timestamp >= timestampMaxUint32) {
      valid = false;
      this.logger.error(`[PriceDataOverflowChecker] timestamp: got ${timestamp}, max uint32 ${timestampMaxUint32}`);
    }

    if (price >= priceMaxUint128) {
      valid = false;
      this.logger.error(`[PriceDataOverflowChecker] price: got ${price}, max uint128 ${priceMaxUint128}`);
    }

    return valid;
  }
}
