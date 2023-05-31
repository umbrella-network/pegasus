import {DeviationDataToSign} from '../../types/DeviationFeeds';

export class DeviationDataToSignFilter {
  static apply(dataToSign: DeviationDataToSign, ignoredKeys: Set<string>): DeviationDataToSign {
    ignoredKeys.forEach((key) => {
      delete dataToSign.leaves[key];
      delete dataToSign.proposedPriceData[key];
    });

    Object.keys(dataToSign.feedsForChain).map((chainId) => {
      dataToSign.feedsForChain[chainId] = dataToSign.feedsForChain[chainId].filter((key) => !ignoredKeys.has(key));
    });

    return dataToSign;
  }
}
