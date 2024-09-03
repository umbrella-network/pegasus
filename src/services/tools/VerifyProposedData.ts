import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {DeviationDataToSign, DeviationLeavesAndFeeds} from '../../types/DeviationFeeds.js';

@injectable()
export class VerifyProposedData {
  @inject('Logger') logger!: Logger;

  apply(deviationDataToSign: DeviationDataToSign, feeds: DeviationLeavesAndFeeds) {
    const keys = Object.keys(deviationDataToSign.leaves);

    keys.forEach((key) => {
      // because we are using only prices (numbers) for on-chain data, we can simply compare hex value
      const leaveValue = BigInt(deviationDataToSign.leaves[key]);
      const precision = BigInt(feeds.feeds[key].precision);
      const expectedPrice = leaveValue / 10n ** (18n - precision);

      const proposedPrice = deviationDataToSign.proposedPriceData[key].price;

      if (expectedPrice != proposedPrice) {
        const err = `[VerifyProposedData] ${key} data not match: ${expectedPrice} (${precision}) vs ${proposedPrice}`;
        this.logger.error(err);
        throw new Error(err);
      }
    });
  }
}
