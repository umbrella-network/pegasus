import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {KeysPerChain, PriceDataWithKey, PriceDataPerChain} from '../../types/DeviationFeeds.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository.js';

@injectable()
export class PriceDataProvider {
  @inject('Logger') logger!: Logger;
  @inject(FeedsContractRepository) protected feedsContractRepository!: FeedsContractRepository;

  async apply(keysPerChain: KeysPerChain): Promise<PriceDataPerChain> {
    const data: PriceDataPerChain = {};
    const chainIds = Object.keys(keysPerChain).map((chainId) => chainId);

    const priceDatas = await Promise.all(
      chainIds.map((chainId) => this.getPriceData(chainId as ChainsIds, keysPerChain[chainId])),
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

  protected async getPriceData(chain: ChainsIds, keys: string[]): Promise<PriceDataWithKey[] | undefined> {
    try {
      const feedContract = await this.feedsContractRepository.get(chain);
      return await feedContract.getManyPriceDataRaw(keys);
    } catch (e) {
      (e as Error).message = `[${chain}] getManyPriceDataRaw fail: ${(e as Error).message}`;
      this.logger.error(e);
      return [];
    }
  }
}
