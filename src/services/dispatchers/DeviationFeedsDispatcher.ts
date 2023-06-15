import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import {ChainsIds} from '../../types/ChainsIds';
import {IDeviationFeedsDispatcher} from "./IDeviationFeedsDispatcher";
import {BSCDeviationDispatcher} from "./networks/BSCDeviationDispatcher";
import {AvalancheDeviationDispatcher} from "./networks/AvalancheDeviationDispatcher";
import {LineaDeviationDispatcher} from "./networks/LineaDeviationDispatcher";
import {ArbitrumDeviationDispatcher} from "./networks/ArbitrumDeviationDispatcher";

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
  ) {
    this.dispatchers = {
      arbitrum: arbitrumDeviationDispatcher,
      avax: avalancheDeviationDispatcher,
      bsc: bscDeviationDispatcher,
      linea: lineaDeviationDispatcher,
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
