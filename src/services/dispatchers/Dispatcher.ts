import {inject} from 'inversify';
import {Logger} from 'winston';
import newrelic from 'newrelic';
import {GasEstimator} from '@umb-network/toolbox';
import {TransactionResponse, TransactionReceipt} from '@ethersproject/providers';
import {BigNumber, Wallet} from 'ethers';
import {PayableOverrides} from "@ethersproject/contracts";
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";

import Settings from '../../types/Settings';
import Blockchain from '../../lib/Blockchain';
import {FailedTransactionEvent} from '../../constants/ReportedMetricsEvents';
import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import {sleep} from '../../utils/sleep';
import {ChainsIds} from '../../types/ChainsIds';
import {parseEther} from "ethers/lib/utils";
import {BalanceMonitorSaver} from "../balanceMonitor/BalanceMonitorSaver";


export abstract class Dispatcher {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(BalanceMonitorSaver) balanceMonitorSaver!: BalanceMonitorSaver;

  readonly chainId!: ChainsIds;
  protected blockchain!: Blockchain;

  protected async dispatch(
    fn: () => Promise<TransactionResponse>,
    payableOverrides: PayableOverrides,
    timeout: number
  ): Promise<string | null> {
      try {
        return await this.sendTx(fn, payableOverrides, timeout);
      } catch (e) {
        if (!this.isNonceError(<Error>e)) {
          throw e;
        }

        const lastNonce = await this.blockchain.wallet.getTransactionCount('latest');
        const newNonce = lastNonce + 1;
        this.logger.warn(`[${this.chainId}] Submit tx with nonce ${lastNonce} failed. Retrying with ${newNonce}`);
        return this.sendTx(fn, {...payableOverrides, nonce: newNonce}, timeout);
      }
  }

  protected async calculatePayableOverrides(props?: {nonce?: number, data?: unknown}): Promise<PayableOverrides> {
    const gasMetrics = await this.resolveGasMetrics();
    if (!gasMetrics) return {};

    const nonce = props?.nonce;

    return gasMetrics.isTxType2
      ? {maxPriorityFeePerGas: gasMetrics.maxPriorityFeePerGas, maxFeePerGas: gasMetrics.maxFeePerGas, nonce}
      : {gasPrice: gasMetrics.gasPrice, nonce};
  }

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    const {minGasPrice, maxGasPrice} = this.blockchain.chainSettings.transactions;
    return GasEstimator.apply(this.blockchain.provider, minGasPrice, maxGasPrice);
  }

  protected async sendTx(
    fn: () => Promise<TransactionResponse>,
    payableOverrides: PayableOverrides,
    timeout: number
  ): Promise<string | null> {
    const {tx, receipt, timeoutMs} = await this.executeTx(fn, timeout);

    if (!receipt) {
      this.logger.warn(`[${this.chainId}] canceling tx ${tx.hash}`);
      const gasPrice = payableOverrides.gasPrice ? BigNumber.from(payableOverrides.gasPrice).toNumber() : undefined;
      await this.cancelPendingTransaction(gasPrice, timeout).catch(this.logger.warn);
      throw new Error(`[${this.chainId}] sendTx timeout: ${timeoutMs}ms`);
    }

    if (receipt.status !== 1) {
      newrelic.recordCustomEvent(FailedTransactionEvent, {
        transactionHash: receipt.transactionHash,
      });

      this.logger.warn(`[${this.chainId}] tx ${receipt.transactionHash} status failed (${receipt.status})`);
      return null;
    }

    return receipt.transactionHash;
  }

  protected isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }

  protected async waitUntilNextBlock(currentBlockNumber: number): Promise<number> {
    // it would be nice to subscribe for blockNumber, but we're forcing http for RPC
    // this is not pretty solution, but we're using proxy, so infura calls should not increase
    let newBlockNumber = await this.blockchain.getBlockNumber();

    while (currentBlockNumber === newBlockNumber) {
      this.logger.info(`[${this.chainId}] waitUntilNextBlock: current ${currentBlockNumber}`);
      await sleep(this.settings.blockchain.transactions.waitForBlockTime);
      newBlockNumber = await this.blockchain.getBlockNumber();
    }

    return newBlockNumber;
  }

  protected async executeTx(
    fn: () => Promise<TransactionResponse>,
    timeoutMs: number,
  ): Promise<{tx: TransactionResponse; receipt: TransactionReceipt | undefined; timeoutMs: number}> {
    const [currentBlockNumber, tx] = await Promise.all([this.blockchain.getBlockNumber(), fn()]);
    // there is no point of doing any action on tx if block is not minted
    const newBlockNumber = await this.waitUntilNextBlock(currentBlockNumber);
    this.logger.info(`[${this.chainId}] New block detected ${newBlockNumber}, waiting for tx to be minted.`);

    return {tx, receipt: await Promise.race([tx.wait(), this.txTimeout(timeoutMs)]), timeoutMs};
  }

  protected async txTimeout(timeout: number): Promise<undefined> {
    return new Promise<undefined>((resolve) =>
      setTimeout(async () => {
        resolve(undefined);
      }, timeout),
    );
  }

  protected async cancelPendingTransaction(prevGasPrice: number | undefined, timeout: number): Promise<boolean> {
    const gasMetrics = await this.resolveGasMetrics();

    const txData = {
      from: this.blockchain.wallet.address,
      to: this.blockchain.wallet.address,
      value: BigNumber.from(0),
      nonce: await this.blockchain.wallet.getTransactionCount('latest'),
      gasLimit: 21000,
      gasPrice: prevGasPrice && gasMetrics ? Math.max(gasMetrics.gasPrice, prevGasPrice) * 2 : undefined,
    };

    this.logger.warn(`[${this.chainId}] Sending canceling tx`, {nonce: txData.nonce, gasPrice: txData.gasPrice});

    const fn = () => this.blockchain.wallet.sendTransaction(txData);

    const {tx, receipt} = await this.executeTx(fn, timeout);

    if (!receipt || receipt.status !== 1) {
      this.logger.warn(`[${this.chainId}] Canceling tx ${tx.hash} filed or still pending`);
      return false;
    }

    return receipt.status === 1;
  }

  protected checkBalanceIsEnough = async (wallet: Wallet): Promise<void> => {
    const balance = await wallet.getBalance();
    const error = this.testBalanceThreshold(balance, wallet.address);
    await this.balanceMonitorSaver.apply(this.chainId, balance.toString(), !!error, wallet.address);

    if (error) {
      throw new Error(error);
    }
  };

  protected testBalanceThreshold = (balance: BigNumber, address: string): string | undefined => {
    const {errorLimit, warningLimit} = this.blockchain.chainSettings.transactions.mintBalance;

    if (balance.lt(parseEther(errorLimit))) {
      return `[${this.chainId}] Balance (${address.slice(0, 10)}) is lower than ${errorLimit} - ERROR`;
    }

    if (balance.lt(parseEther(warningLimit))) {
      this.logger.warn(`[${this.chainId}] Balance (${address.slice(0, 10)}) is lower than ${warningLimit}`);
    }
  };
}
