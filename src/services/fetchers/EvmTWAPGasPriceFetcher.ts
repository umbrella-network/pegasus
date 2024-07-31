import {inject, injectable} from 'inversify';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {FeedFetcherInterface, FeedFetcherOptions, FetcherName, PriceValueType} from '../../types/fetchers.js';
import {BlockchainGasRepository} from '../../repositories/BlockchainGasRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';

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
class EvmTWAPGasPriceFetcher implements FeedFetcherInterface {
  @inject(BlockchainGasRepository) protected gasRepository!: BlockchainGasRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  static fetcherSource = '';

  async apply(params: EvmTWAPGasPriceInputParams, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {twap = 20, chainId} = params;
    const {timestamp, symbols} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    const gas = await this.gasRepository.twap(chainId, twap, timestamp);
    if (!gas) return {prices: []};

    // gas is uint, no decimals, however we're using Gwei as unit, and this give us 9 decimals
    // but UmbrellaFeeds is 8 decimals, so in order to have gas in wei in smart contract, we have to /1e8 not by 1e9
    const gasPrice = Number(gas) / 1e8;

    await this.priceDataRepository.saveFetcherResults(
      {prices: [gasPrice]},
      symbols,
      FetcherName.TWAPGasPrice,
      PriceValueType.Price,
      EvmTWAPGasPriceFetcher.fetcherSource,
    );

    return {prices: [gasPrice]};
  }
}

export default EvmTWAPGasPriceFetcher;
