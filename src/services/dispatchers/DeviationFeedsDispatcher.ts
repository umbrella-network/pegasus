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
import {ConcordiumDeviationDispatcher} from './networks/ConcordiumDeviationDispatcher.js';
import {AvaxMeldDeviationDispatcher} from './networks/AvaxMeldDeviationDispatcher.js';
import {XDCDeviationDispatcher} from './networks/XDCDeviationDispatcher.js';
import {OKXDeviationDispatcher} from './networks/OKXDeviationDispatcher.js';
import {ArtheraDeviationDispatcher} from './networks/ArtheraDeviationDispatcher.js';
import {AstarDeviationDispatcher} from './networks/AstarDeviationDispatcher.js';
import {RootstckDeviationDispatcher} from './networks/RootstckDeviationDispatcher.js';

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
    @inject(ConcordiumDeviationDispatcher) concordiumDeviationDispatcher: ConcordiumDeviationDispatcher,
    @inject(AvaxMeldDeviationDispatcher) avaxMeldDeviationDispatcher: AvaxMeldDeviationDispatcher,
    @inject(XDCDeviationDispatcher) xdcDeviationDispatcher: XDCDeviationDispatcher,
    @inject(OKXDeviationDispatcher) okxDeviationDispatcher: OKXDeviationDispatcher,
    @inject(ArtheraDeviationDispatcher) artheraDeviationDispatcher: ArtheraDeviationDispatcher,
    @inject(AstarDeviationDispatcher) astarDeviationDispatcher: AstarDeviationDispatcher,
    @inject(RootstckDeviationDispatcher) rootstckDeviationDispatcher: RootstckDeviationDispatcher,
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
      [ChainsIds.CONCORDIUM]: concordiumDeviationDispatcher,
      [ChainsIds.AVAX_MELD]: avaxMeldDeviationDispatcher,
      [ChainsIds.XDC]: xdcDeviationDispatcher,
      [ChainsIds.OKX]: okxDeviationDispatcher,
      [ChainsIds.ARTHERA]: artheraDeviationDispatcher,
      [ChainsIds.ASTAR]: astarDeviationDispatcher,
      [ChainsIds.ROOTSTCK]: rootstckDeviationDispatcher,
    };
  }

  async apply(props: DeviationFeedsDispatcherProps): Promise<void> {
    const {chainId} = props;

    try {
      const {chainId} = props;
      const dispatcher = this.dispatchers[chainId];
      await dispatcher.apply();
    } catch (e: unknown) {
      (e as Error).message = `[${chainId}] ${(e as Error).message}`;
      this.logger.error(e);
      return;
    }
  }

  exists(chainId: ChainsIds): boolean {
    return this.dispatchers[chainId] !== undefined;
  }
}
