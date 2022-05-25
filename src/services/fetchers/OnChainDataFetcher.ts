import {ethers} from 'ethers';
import {inject, injectable} from 'inversify';

import {OnChainCall} from '../../types/Feed';
import Blockchain from '../../lib/Blockchain';

@injectable()
class OnChainDataFetcher {
  @inject(Blockchain) blockchain!: Blockchain;

  async apply(params: OnChainCall): Promise<string> {
    const data = await this.fetchData(params);
    return ethers.BigNumber.from(data).toString();
  }

  private async fetchData(params: OnChainCall): Promise<string> {
    return this.blockchain.provider.call({
      to: params.address,
      data: OnChainDataFetcher.txData(params),
    });
  }

  private static txData(params: OnChainCall): string {
    const abi = [
      {
        name: params.method,
        type: 'function',
        stateMutability: 'view',
        inputs: params.inputs.map((type) => {
          return {type};
        }),
        outputs: params.outputs.map((type) => {
          return {type};
        }),
      },
    ];

    const iface = new ethers.utils.Interface(abi);
    return iface.encodeFunctionData(params.method, params.args);
  }
}

export default OnChainDataFetcher;
