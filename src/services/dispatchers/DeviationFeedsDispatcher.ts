import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BlockchainRepository} from '../../repositories/BlockchainRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {IDeviationFeedsDispatcher} from './IDeviationFeedsDispatcher.js';
import {BSCDeviationDispatcher} from './networks/BSCDeviationDispatcher.js';
import {AvalancheDeviationDispatcher} from './networks/AvalancheDeviationDispatcher.js';
import {LineaDeviationDispatcher} from './networks/LineaDeviationDispatcher.js';
import {ArbitrumDeviationDispatcher} from './networks/ArbitrumDeviationDispatcher.js';
import {PolygonDeviationDispatcher} from './networks/PolygonDeviationDispatcher.js';
import {BaseDeviationDispatcher} from './networks/BaseDeviationDispatcher.js';
import {MultiversXDeviationDispatcher} from './networks/MultiversXDeviationDispatcher.js';
import {MassaDeviationDispatcher} from './networks/MassaDeviationDispatcher.js';

export type DeviationFeedsDispatcherProps = {
  chainId: ChainsIds;
};

@injectable()
export class DeviationFeedsDispatcher {
  protected readonly dispatchers: {[key: string]: IDeviationFeedsDispatcher};
  @inject('Logger') logger!: Logger;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  constructor(
    @inject(ArbitrumDeviationDispatcher) arbitrumDeviationDispatcher: ArbitrumDeviationDispatcher,
    @inject(AvalancheDeviationDispatcher) avalancheDeviationDispatcher: AvalancheDeviationDispatcher,
    @inject(BSCDeviationDispatcher) bscDeviationDispatcher: BSCDeviationDispatcher,
    @inject(LineaDeviationDispatcher) lineaDeviationDispatcher: LineaDeviationDispatcher,
    @inject(PolygonDeviationDispatcher) polygonDeviationDispatcher: PolygonDeviationDispatcher,
    @inject(BaseDeviationDispatcher) baseDeviationDispatcher: BaseDeviationDispatcher,
    @inject(MultiversXDeviationDispatcher) multiversXDeviationDispatcher: MultiversXDeviationDispatcher,
    @inject(MassaDeviationDispatcher) massaDeviationDispatcher: MassaDeviationDispatcher,
  ) {
    this.dispatchers = {
      [ChainsIds.ARBITRUM]: arbitrumDeviationDispatcher,
      [ChainsIds.AVALANCHE]: avalancheDeviationDispatcher,
      [ChainsIds.BSC]: bscDeviationDispatcher,
      [ChainsIds.LINEA]: lineaDeviationDispatcher,
      [ChainsIds.BASE]: baseDeviationDispatcher,
      [ChainsIds.POLYGON]: polygonDeviationDispatcher,
      [ChainsIds.MULTIVERSX]: multiversXDeviationDispatcher,
      [ChainsIds.MASSA]: massaDeviationDispatcher,
    };
  }

  async apply(props: DeviationFeedsDispatcherProps): Promise<void> {
    const {chainId} = props;

    try {
      const {chainId} = props;
      const dispatcher = this.dispatchers[chainId];
      await dispatcher.apply();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      e.message = `[${chainId}] ${e.message}`;
      this.logger.error(e);
      return;
    }
  }

  exists(chainId: ChainsIds): boolean {
    return this.dispatchers[chainId] !== undefined;
  }
}
