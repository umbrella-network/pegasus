import {inject, injectable} from 'inversify';

import {KeysPerChain, PriceDataWithKey, PriceDataPerChain} from '../../types/DeviationFeeds';
import {ChainsIds} from "../../types/ChainsIds";
import {FeedsContractRepository} from "../../repositories/FeedsContractRepository";
import {Logger} from "winston";


@injectable()
export class PriceDataProvider {
  @inject('Logger') logger!: Logger;
  @inject(FeedsContractRepository) protected feedsContractRepository!: FeedsContractRepository;

  async apply(keysPerChain: KeysPerChain): Promise<PriceDataPerChain> {
    const data: PriceDataPerChain = {};
    const chainIds = Object.keys(keysPerChain).map(chainId => chainId);

    const priceDatas = await Promise.all(chainIds.map(chainId => this.getPriceData(chainId as ChainsIds, keysPerChain[chainId])));

    priceDatas.forEach((priceDataArray, i) => {
      priceDataArray.forEach(priceData => {
        if (!data[chainIds[i]]) {
          data[chainIds[i]] = {};
        }

        data[chainIds[i]][priceData.key] = priceData;
      });
    });

    return data;
  }

  protected async getPriceData(chain: ChainsIds, keys: string[]): Promise<PriceDataWithKey[]> {
    try {
      const feedContract = await this.feedsContractRepository.get(chain);
      return await feedContract.getManyPriceDataRaw(keys);
    } catch (e) {
      (e as Error).message = `[${chain}] getManyPriceDataRaw fail: ${(e as Error).message}`;
      this.logger.error(e);
      return []
    }
  }
}
