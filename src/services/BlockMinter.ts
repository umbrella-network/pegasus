import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import BlockchainService from './BlockchainService';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(BlockchainService) blockchain!: BlockchainService;
  @inject(ChainContract) chainContract!: ChainContract;

  async apply(): Promise<void> {
    if (await this.isLeader()) {
      this.logger.info('We are the leader!');
      this.mint();
    } else {
      this.logger.info('We are NOT the leader! :(');
    }

    // await this.mint();
  }

  private isLeader = async (): Promise<boolean> => {
    const currentLeader = await this.chainContract.getLeaderAddress();
    return currentLeader === this.blockchain.wallet.address;
  }

  private mint = async (): Promise<void> => {
    this.chainContract.submit();
  }
}

export default BlockMinter;
