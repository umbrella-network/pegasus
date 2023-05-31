import {DeviationDataToSign} from '../types/DeviationFeeds';
import {ChainsIds} from '../types/ChainsIds';
import {DeviationConsensus} from '../models/DeviationConsensus';
import {DataCollection} from '../types/custom';

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
