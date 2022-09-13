import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BSCBlockDispatcher} from './BSCBlockDispatcher';
import {IBlockChainDispatcher} from './IBlockChainDispatcher';
import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import Settings from '../../types/Settings';
import {TChainsIds} from '../../types/ChainsIds';
import Blockchain from '../../lib/Blockchain';
import {PolygonBlockDispatcher} from './PolygonBlockDispatcher';
import {AvalancheBlockDispatcher} from './AvalancheBlockDispatcher';

export type BlockChainDispatcherProps = {
  chainId: TChainsIds;
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
    @inject(PolygonBlockDispatcher) polygonBlockDispatcher: PolygonBlockDispatcher,
    @inject(AvalancheBlockDispatcher) avalancheBlockDispatcher: AvalancheBlockDispatcher,
  ) {
    this.dispatchers = {
      bsc: bscBlockDispatcher,
      polygon: polygonBlockDispatcher,
      avax: avalancheBlockDispatcher,
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
