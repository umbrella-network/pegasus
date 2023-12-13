import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FeedNamesPerChain, PriceDataWithKey, PriceDataPerChain} from '../../types/DeviationFeeds.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository.js';
import {FeedName} from '../../types/Feed';

@injectable()
export class PriceDataProvider {
  @inject('Logger') logger!: Logger;
  @inject(FeedsContractRepository) protected feedsContractRepository!: FeedsContractRepository;

  async apply(namesPerChain: FeedNamesPerChain): Promise<PriceDataPerChain> {
    const data: PriceDataPerChain = {};
    const chainIds = Object.keys(namesPerChain).map((chainId) => chainId);

    const priceDatas = await Promise.all(
      chainIds.map((chainId) => this.getPriceData(chainId as ChainsIds, namesPerChain[chainId])),
    );

    priceDatas.forEach((priceDataArray, i) => {
      const chainId = chainIds[i];

      // if priceDataArray is undefined, this is RPC issues, and we should ignore this chain
      if (priceDataArray === undefined) {
        this.logger.error(`[${chainId}] PriceDataProvider can not get prices`);
        return;
      }

      priceDataArray.forEach((priceData) => {
        if (!data[chainId]) {
          data[chainId] = {};
        }

        data[chainId][priceData.key] = priceData;
      });
    });

    return data;
  }

  protected async getPriceData(chain: ChainsIds, names: FeedName[]): Promise<PriceDataWithKey[] | undefined> {
    try {
      const feedContract = await this.feedsContractRepository.get(chain);
      if (feedContract) return await feedContract.getManyPriceDataRaw(names);

      this.logger.error(`[PriceDataProvider] there is a call for feed on ${chain}, but chain not active`);
    } catch (e) {
      (e as Error).message = `[${chain}] getManyPriceDataRaw fail: ${(e as Error).message}`;
      this.logger.error(e);
      return [];
    }
  }
}
