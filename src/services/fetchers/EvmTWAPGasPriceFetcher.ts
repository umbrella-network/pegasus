import {inject, injectable} from 'inversify';

import {BlockchainGasRepository} from '../../repositories/BlockchainGasRepository.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import {FetcherName} from '../../types/fetchers.js';
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
class EvmTWAPGasPriceFetcher {
  @inject(BlockchainGasRepository) protected gasRepository!: BlockchainGasRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  static fetcherSource = '';

  async apply(
    {twap = 20, chainId}: {twap: number; chainId: ChainsIds},
    timestamp: number,
  ): Promise<number | undefined> {
    const gas = await this.gasRepository.twap(chainId, twap, timestamp);
    if (!gas) return;

    // gas is uint, no decimals, however we're using Gwei as unit, and this give us 9 decimals
    // but UmbrellaFeeds is 8 decimals, so in order to have gas in wei in smart contract, we have to /1e8 not by 1e9
    const gasPrice = Number(gas) / 1e8;

    const payload: PriceDataPayload = {
      fetcher: FetcherName.TWAP_GAS_PRICE,
      value: gasPrice.toString(),
      valueType: PriceValueType.Price,
      timestamp: timestamp,
      feedBase: 'PolygonGasPrice',
      feedQuote: 'TWAP20',
      fetcherSource: EvmTWAPGasPriceFetcher.fetcherSource,
    };

    await this.priceDataRepository.savePrice(payload);

    return gasPrice;
  }
}

export default EvmTWAPGasPriceFetcher;
