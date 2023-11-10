import {DeviationDataToSign} from '../types/DeviationFeeds.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DeviationConsensus} from '../models/DeviationConsensus.js';
import {DataCollection} from '../types/custom.js';

export class DeviationConsensusFactory {
  static create(dataForConsensus: DeviationDataToSign, signatures: DataCollection<string[]>): DeviationConsensus[] {
    const result: DeviationConsensus[] = [];

    Object.keys(signatures).forEach((chainId) => {
      const keys = dataForConsensus.feedsForChain[chainId];

      result.push({
        chainId: chainId as ChainsIds,
        dataTimestamp: dataForConsensus.dataTimestamp,
        keys,
        priceData: keys.map((key) => dataForConsensus.proposedPriceData[key]),
        signatures: signatures[chainId],
        createdAt: new Date(),
      });
    });

    return result;
  }
}
