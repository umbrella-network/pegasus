import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import settings from '../config/settings';

@injectable()
class BlockMinter {
  @inject(ChainContract) chainContract!: ChainContract;

  async apply(): Promise<void> {
    // get current leader address using chainContract.getCurrentLeader()
    // compare against my account num (public key)
    // if they match (i.e. I am a leader) then create / mint a block
    // blocks can be created by submitting a transaction using the leader's private key (me)
    // and chainContract.submit()
    // THIS WILL BE A STOPPING POINT FOR NOW
    const currentLeader = await this.chainContract.getLeaderAddress();
    console.log('==============');
    console.log(currentLeader);
    console.log('==============');
    // if(currentLeader != this.web3.eth.defaultAccount) return;

    // await this.mint();
  }

  private mint = async (): Promise<void> => {
    this.chainContract.submit();
  }
}

export default BlockMinter;
