import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BSCBlockDispatcher} from './networks/BSCBlockDispatcher';
import {IBlockChainDispatcher} from './IBlockChainDispatcher';
import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import {ChainsIds} from '../../types/ChainsIds';
import {AvalancheBlockDispatcher} from './networks/AvalancheBlockDispatcher';
import {PolygonBlockDispatcher} from './networks/PolygonBlockDispatcher';
import {ArbitrumBlockDispatcher} from './networks/ArbitrumBlockDispatcher';
import {EthereumBlockDispatcher} from './networks/EthereumBlockDispatcher';

export type BlockChainDispatcherProps = {
  chainId: ChainsIds;
};

@injectable()
export class BlockChainDispatcher {
  protected readonly dispatchers: {[key: string]: IBlockChainDispatcher};
  @inject('Logger') logger!: Logger;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  constructor(
    @inject(BSCBlockDispatcher) bscBlockDispatcher: BSCBlockDispatcher,
    @inject(AvalancheBlockDispatcher) avalancheBlockDispatcher: AvalancheBlockDispatcher,
    @inject(PolygonBlockDispatcher) polygonBlockDispatcher: PolygonBlockDispatcher,
    @inject(ArbitrumBlockDispatcher) arbitrumBlockDispatcher: ArbitrumBlockDispatcher,
    @inject(EthereumBlockDispatcher) ethereumBlockDispatcher: EthereumBlockDispatcher,
  ) {
    this.dispatchers = {
      bsc: bscBlockDispatcher,
      avax: avalancheBlockDispatcher,
      ethereum: ethereumBlockDispatcher,
      polygon: polygonBlockDispatcher,
      arbitrum: arbitrumBlockDispatcher,
    };
  }

  async apply(props: BlockChainDispatcherProps): Promise<void> {
    const {chainId} = props;
    this.logger.info(`[${chainId}] Block Dispatcher initialized`);

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
