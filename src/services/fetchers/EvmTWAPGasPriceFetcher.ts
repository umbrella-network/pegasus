import {inject, injectable} from 'inversify';

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
  @inject(TWAPGasRepository) protected gasRepository!: TWAPGasRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  private logPrefix = `[${FetcherName.TWAPGasPrice}]`;

  static fetcherSource = '';

  async apply(params: EvmTWAPGasPriceInputParams, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {twap = 20, chainId} = params;
    const {timestamp, symbols} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    const gas = await this.gasRepository.twap(chainId, twap, timestamp);
    if (!gas) return {prices: []};

    // gas is uint, no decimals, however we're using Gwei as unit, and this give us 9 decimals
    // but UmbrellaFeeds is 8 decimals, so in order to have gas in wei in smart contract, we have to /1e8 not by 1e9
    const gasPrice = Number(gas) / 1e8;

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      {prices: [gasPrice]},
      symbols,
      FetcherName.TWAPGasPrice,
      FetchedValueType.Price,
      EvmTWAPGasPriceFetcher.fetcherSource,
    );

    return {prices: [gasPrice]};
  }
}
