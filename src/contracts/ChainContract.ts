import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import { Contract, ContractInterface, BigNumber } from 'ethers';
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
    this.contract = new Contract(
      settings.blockchain.contracts.chain.address,
      ChainContract.ABI,
      blockchain.provider
    );
  }

  getLeaderAddress = async (): Promise<string> => this.contract.getLeaderAddress();
  getBlockHeight = async (): Promise<BigNumber> => this.contract.getBlockHeight();
  submit = async (): Promise<void> => this.contract.submit();
}

export default ChainContract;
