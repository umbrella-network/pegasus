import {inject, injectable} from 'inversify';
import {StaticJsonRpcProvider, TransactionReceipt} from '@ethersproject/providers';

import {ProviderRepository} from '../../../repositories/ProviderRepository';
import {BlockchainGas} from '../../../types/BlockchainGas';
import {ChainsIds} from '../../../types/ChainsIds';

@injectable()
export class BlockchainGasCalculator {
  @inject(ProviderRepository) protected providerRepository!: ProviderRepository;

  async apply(chainId: ChainsIds, blockNumber: number): Promise<BlockchainGas | undefined> {
    const provider: StaticJsonRpcProvider = this.providerRepository.get(chainId).getRawProvider();

    const block = await provider.getBlock(blockNumber);
    if (block.transactions.length == 0) return;

    const receipts = await this.getReceipts(chainId, block.transactions);

    const gas = this.gasFromReceipts(receipts);

    const avg = this.calculateGas(gas);

    return {
      chainId,
      gas: avg,
      blockNumber,
      blockTimestamp: block.timestamp,
    };
  }

  protected async getReceipts(chainId: ChainsIds, txs: string[]): Promise<TransactionReceipt[]> {
    const provider: StaticJsonRpcProvider = this.providerRepository.get(chainId).getRawProvider();
    return Promise.all(txs.map((tx) => provider.getTransactionReceipt(tx)));
  }

  protected gasFromReceipts(receipts: TransactionReceipt[]): bigint[] {
    return receipts.map((r) => r.effectiveGasPrice.toBigInt());
  }

  protected calculateGas(gas: bigint[]): bigint {
    const pop = Math.trunc(gas.length / 10);
    const data = pop > 0 && gas.length - 2 * pop > 0 ? gas.sort().slice(pop, -pop) : gas;
    const sum = data.reduce((sum, g) => sum + g, 0n);
    return sum / BigInt(data.length);
  }
}
