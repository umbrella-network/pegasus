import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BSCBlockDispatcher} from './BSCBlockDispatcher';
import {IBlockChainDispatcher} from './IBlockChainDispatcher';
import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import Settings from '../../types/Settings';
import {ChainsIds} from '../../types/ChainsIds';
import Blockchain from '../../lib/Blockchain';
import {AvalancheBlockDispatcher} from './AvalancheBlockDispatcher';
import {PolygonBlockDispatcher} from './PolygonBlockDispatcher';
import {ArbitrumBlockDispatcher} from './ArbitrumBlockDispatcher';
import {EthereumBlockDispatcher} from './EthereumBlockDispatcher';

export type BlockChainDispatcherProps = {
  chainId: ChainsIds;
};

@injectable()
export class BlockChainDispatcher {
  private readonly dispatchers: {[key: string]: IBlockChainDispatcher};
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject('Settings') private readonly settings!: Settings;

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
}
