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
    // get current leader address using chainContract.getCurrentLeader()
    // compare against my account num (public key)
    // if they match (i.e. I am a leader) then create / mint a block
    // blocks can be created by submitting a transaction using the leader's private key (me)
    // and chainContract.submit()
    // THIS WILL BE A STOPPING POINT FOR NOW
    if (await this.isLeader()) {
      this.logger.info('We are the leader!');
      this.mint();
    } else {
      this.logger.info('We are NOT the leader! :(');
    }
    // if(currentLeader != this.web3.eth.defaultAccount) return;

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
