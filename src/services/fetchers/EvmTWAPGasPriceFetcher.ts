import {inject, injectable} from 'inversify';

import {PriceDataRepository, PriceValueType} from '../../repositories/PriceDataRepository.js';
import {FeedFetcherInterface, FeedFetcherOptions, FetcherName} from '../../types/fetchers.js';
import {BlockchainGasRepository} from '../../repositories/BlockchainGasRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';

/*
PolygonGasPrice-TWAP20:
  discrepancy: 1.0
  precision: 0 # we store original gwei number (uint)
  heartbeat: 3600
  trigger: 1.0
  interval: 60
  chains: [ polygon ]
  inputs:
    - fetcher:
        name: TWAPGasPrice
        params:
          twap: 20
          chainId: polygon
 */
@injectable()
class EvmTWAPGasPriceFetcher implements FeedFetcherInterface {
  @inject(BlockchainGasRepository) protected gasRepository!: BlockchainGasRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  static fetcherSource = '';

  async apply(params: {twap: number; chainId: ChainsIds}, options: FeedFetcherOptions): Promise<number | undefined> {
    const {twap = 20, chainId} = params;
    const {timestamp, base: feedBase, quote: feedQuote} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    const gas = await this.gasRepository.twap(chainId, twap, timestamp);
    if (!gas) return;

    // gas is uint, no decimals, however we're using Gwei as unit, and this give us 9 decimals
    // but UmbrellaFeeds is 8 decimals, so in order to have gas in wei in smart contract, we have to /1e8 not by 1e9
    const gasPrice = Number(gas) / 1e8;

    await this.priceDataRepository.saveFetcherResults(
      {prices: [gasPrice]},
      [`${feedBase}-${feedQuote}`],
      FetcherName.TWAP_GAS_PRICE,
      PriceValueType.Price,
      EvmTWAPGasPriceFetcher.fetcherSource,
    );

    return gasPrice;
  }
}

export default EvmTWAPGasPriceFetcher;
