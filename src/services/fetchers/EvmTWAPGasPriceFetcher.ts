import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {TWAPGasRepository} from '../../repositories/fetchers/TWAPGasRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';

/*
PolygonGasPrice-TWAP20:
  inputs:
    - fetcher:
        name: TWAPGasPrice
        params:
          twap: 20
          chainId: polygon
 */

export interface EvmTWAPGasPriceInputParams {
  twap: number;
  chainId: ChainsIds;
}

@injectable()
export class EvmTWAPGasPriceFetcher implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;
  @inject(TWAPGasRepository) protected gasRepository!: TWAPGasRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  private logPrefix = `[${FetcherName.TWAPGasPrice}]`;

  static fetcherSource = '';

  async apply(params: EvmTWAPGasPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {twap = 20, chainId} = params[0];
    const {timestamp, symbols} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    const gas = await this.gasRepository.twap(chainId, twap, timestamp);

    if (!gas) {
      this.logger.warn(`${this.logPrefix} ${chainId} no price for TWAP${params[0].twap}`);
      return {prices: []};
    }

    const gasPriceGwei = gas / 1e9;

    this.logger.debug(`${this.logPrefix} ${chainId} fetched TWAP${params[0].twap}: ${gas} (${gasPriceGwei})`);

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      {prices: [gasPriceGwei]},
      symbols,
      FetcherName.TWAPGasPrice,
      FetchedValueType.Price,
      EvmTWAPGasPriceFetcher.fetcherSource,
    );

    return {prices: [gas], timestamp};
  }
}
