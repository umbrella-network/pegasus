import {injectable} from 'inversify';

import {DeviationDataToSign, DeviationFeeds, PriceData, PriceDataByKey} from '../../types/DeviationFeeds';
import {PriceDataFactory} from '../../factories/PriceDataFactory';
import Leaf from '../../types/Leaf';

@injectable()
export class PriceMetadataComparator {
  apply(dataToSign: DeviationDataToSign, localLeaves: Leaf[], localFeeds: DeviationFeeds): boolean {
    const localPriceDataByKey: PriceDataByKey = PriceDataFactory.createMany(
      dataToSign.dataTimestamp,
      localLeaves,
      localFeeds,
    );
    const keys = Object.keys(dataToSign.leaves);

    keys.forEach((key) => {
      const priceData = dataToSign.proposedPriceData[key];

      if (!this.equal(priceData, localPriceDataByKey[key])) {
        throw new Error(`[PriceDataComparator] expected ${key}: ${priceData} got ${localPriceDataByKey[key]}`);
      }
    });

    return true;
  }

  protected equal(a: PriceData, b: PriceData): boolean {
    // price is checked at discrepancy level
    return a.data === b.data && a.heartbeat === b.heartbeat && a.timestamp === b.timestamp;
  }
}
