import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
// import Web3 from 'web3';
// import { Contract } from 'web3-eth-contract';
// import { AbiItem } from 'web3-utils';
import { Provider } from '@ethersproject/providers';
import { Contract, ContractInterface, ethers } from 'ethers';
import settings from '../config/settings';

@injectable()
class ChainContract {
  static ABI: ContractInterface = fs.readFileSync(path.resolve(__dirname, './ChainContract.abi.json'), 'utf-8');

  contract!: Contract;

  constructor() {
    console.log(ChainContract.ABI);
    // const provider = new ethers.providers.HttpSocketProvider(settings.blockchain.provider.url);
    const provider = new ethers.providers.JsonRpcProvider();

    this.contract = new ethers.Contract(
      settings.blockchain.contracts.chain.address,
      ChainContract.ABI,
      provider
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

// @injectable()
// class ChainContract {
//   static ABI: AbiItem[] = JSON.parse(
//     fs.readFileSync(path.resolve(__dirname, './ChainContract.abi.json'), 'utf-8')
//   );

//   contract: Contract;

//   constructor(
//     @inject(Web3) web3: Web3
//   ) {
//     this.contract = new web3.eth.Contract(
//       ChainContract.ABI,
//       settings.blockchain.contracts.chain.address,
//       {
//         from: <string> web3.eth.defaultAccount
//       }
//     );
//   }

//   getLeaderAddress = async (): Promise<string> => {
//     return this.contract.methods.getLeaderAddress().call();
//   }

//   submit = (): void => {
//     // this.contract.methods.submit().call();
//     console.log('====================');
//     console.log('submitted!');
//     console.log('====================');
//   }
// }

export default ChainContract;
