import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import { Contract, ContractInterface, ethers } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class ChainContract {
  static ABI: ContractInterface = fs.readFileSync(path.resolve(__dirname, './ChainContract.abi.json'), 'utf-8');

  contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    this.contract = new ethers.Contract(
      settings.blockchain.contracts.chain.address,
      ChainContract.ABI,
      blockchain.provider
    );
  }

  getLeaderAddress = async (): Promise<string> => {
    return this.contract.getLeaderAddress();
  }

  submit = (): void => {
    // this.contract.methods.submit().call();
    console.log('====================');
    console.log('submitted!');
    console.log('====================');
  }
}

export default ChainContract;
