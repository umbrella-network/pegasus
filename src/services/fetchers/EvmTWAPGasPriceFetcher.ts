import {inject, injectable} from 'inversify';
import {ChainsIds} from '../../types/ChainsIds';
import {BlockchainGasRepository} from '../../repositories/BlockchainGasRepository';

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

  async apply(
    {twap = 20, chainId}: {twap: number; chainId: ChainsIds},
    timestamp: number,
  ): Promise<number | undefined> {
    const gas = await this.gasRepository.twap(chainId, twap, timestamp);
    if (!gas) return;
    // gas is uint, no decimals, however we're using Gwei as unit, and this give us 9 decimals
    // but UmbrellaFeeds is 8 decimals, so in order to have gas in wei in smart contract, we have to /1e8 not by 1e9
    return Number(gas) / 1e8;
  }
}

export default EvmTWAPGasPriceFetcher;
