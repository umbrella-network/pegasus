import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import { Contract, ContractInterface, BigNumber } from 'ethers';
import { TransactionResponse } from '@ethersproject/providers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class ChainContract {
  static ABI: ContractInterface = fs.readFileSync(path.resolve(__dirname, './ChainContract.abi.json'), 'utf-8');

  contract!: Contract;
  gasPrice!: number;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    this.contract = new Contract(
      settings.blockchain.contracts.chain.address,
      ChainContract.ABI,
      blockchain.provider
    ).connect(blockchain.wallet);

    this.gasPrice = settings.blockchain.transactions.gasPrice;
  }

  getLeaderAddress = async (): Promise<string> => this.contract.getLeaderAddress();
  getBlockHeight = async (): Promise<BigNumber> => this.contract.getBlockHeight();
  getBlockVotersCount = async (blockHeight: BigNumber): Promise<BigNumber> => this.contract.getBlockVotersCount(blockHeight);

  submit = async (root: string, v: number[], r: string[], s: string[]): Promise<TransactionResponse> => this
    .contract
    .submit(root, [], [], v, r, s, {gasPrice: this.gasPrice});
}

export default ChainContract;
