import {inject} from 'inversify';
import {Logger} from 'winston';
import {BigNumber} from 'ethers';
import {PayableOverrides} from '@ethersproject/contracts';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';

import Settings, {BlockchainType} from '../../types/Settings.js';
import {BlockchainRepository} from '../../repositories/BlockchainRepository.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {BalanceMonitorSaver} from '../balanceMonitor/BalanceMonitorSaver.js';
import {IWallet} from '../../interfaces/IWallet.js';
import {ExecutedTx, TxHash} from '../../types/Consensus.js';
import Blockchain from '../../lib/Blockchain.js';

export abstract class Dispatcher {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(BalanceMonitorSaver) balanceMonitorSaver!: BalanceMonitorSaver;

  readonly chainId!: ChainsIds;
  readonly blockchainType!: BlockchainType;
  protected blockchain!: Blockchain;
  // this can be any wallet
  protected sendingWallet!: IWallet;
  protected logPrefix!: string;

  protected lastStatusLogs: Record<string, number> = {};

  protected init(): void {
    this.logPrefix = `[${this.chainId}][${this.blockchainType}]`;

    this.blockchain = this.blockchainRepository.get(this.chainId);

    if (!this.blockchain) {
      this.logger.error(`${this.logPrefix} can not setup Blockchain`);
      return;
    }

    const wallet =
      this.blockchainType == BlockchainType.LAYER2 ? this.blockchain.wallet : this.blockchain.deviationWallet;

    if (wallet) {
      this.sendingWallet = wallet;
    } else {
      this.logger.warn(`${this.logPrefix} no wallet`);
    }
  }

  protected async dispatch(
    fn: () => Promise<ExecutedTx>,
    payableOverrides: PayableOverrides,
    timeout: number,
  ): Promise<TxHash | null> {
    try {
      return await this.sendTx(fn, payableOverrides, timeout);
    } catch (e) {
      if (!this.isNonceError(<Error>e)) {
        throw e;
      }

      const lastNonce = await this.sendingWallet.getNextNonce();
      const newNonce = lastNonce + 1;
      this.logger.warn(`${this.logPrefix} Submit tx with nonce ${lastNonce} failed. Retrying with ${newNonce}`);
      return this.sendTx(fn, {...payableOverrides, nonce: newNonce}, timeout);
    }
  }

  protected async calculatePayableOverrides(props?: {nonce?: number; data?: unknown}): Promise<PayableOverrides> {
    const gasMetrics = await this.resolveGasMetrics();
    if (!gasMetrics) return {};

    const nonce = props?.nonce;

    return gasMetrics.isTxType2
      ? {
          maxPriorityFeePerGas: this.multiplyGas(gasMetrics.maxPriorityFeePerGas),
          maxFeePerGas: this.multiplyGas(gasMetrics.maxFeePerGas),
          nonce,
        }
      : {gasPrice: this.multiplyGas(gasMetrics.gasPrice), nonce};
  }

  protected multiplyGas(n: number | undefined): number | undefined {
    if (n === undefined) return undefined;

    const {gasMultiplier} = this.blockchain.chainSettings.transactions;
    if (!gasMultiplier) return n;

    return Math.trunc(n * gasMultiplier);
  }

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    const {minGasPrice} = this.blockchain.chainSettings.transactions;
    return this.blockchain.provider.gasEstimation(minGasPrice);
  }

  // returns tx hash ONLY when tx was successful
  protected async sendTx(
    fn: () => Promise<ExecutedTx>,
    payableOverrides: PayableOverrides,
    timeout: number,
  ): Promise<TxHash | null> {
    const {txHash, success, timeoutMs} = await this.executeTx(fn, timeout);

    if (success === undefined) {
      this.logger.warn(`${this.logPrefix} canceling tx ${txHash}`);
      const gasPrice = payableOverrides.gasPrice ? BigNumber.from(payableOverrides.gasPrice).toNumber() : undefined;
      await this.cancelPendingTransaction(gasPrice, timeout).catch(this.logger.warn);
      throw new Error(`${this.logPrefix} sendTx timeout: ${timeoutMs}ms`);
    }

    if (!success) {
      this.logger.warn(`${this.logPrefix} tx ${txHash} status failed`);
      return null;
    }

    return txHash;
  }

  protected isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }

  protected async executeTx(
    fn: () => Promise<ExecutedTx>,
    timeoutMs: number,
  ): Promise<{txHash: string; success: boolean | undefined; timeoutMs: number}> {
    const {hash, atBlock} = await fn();

    // there is no point of doing any action on tx if block is not minted
    const newBlockNumber = await this.blockchain.provider.waitUntilNextBlock(BigInt(atBlock));

    if (newBlockNumber != 0n) {
      this.logger.info(`${this.logPrefix} New block detected ${newBlockNumber}, waiting for tx to be minted.`);
    }

    const timeStart = Date.now();
    const success = await this.blockchain.provider.waitForTx(hash, timeoutMs);
    const timeEnd = Date.now();

    this.logger.info(`${this.logPrefix} tx finalised in ${Math.round((timeEnd - timeStart) / 1000)} sec.`);

    return {txHash: hash, success, timeoutMs};
  }

  protected async cancelPendingTransaction(prevGasPrice: number | undefined, timeout: number): Promise<boolean> {
    const gasMetrics = await this.resolveGasMetrics();

    const txData = {
      from: this.sendingWallet.address,
      to: this.sendingWallet.address,
      value: BigNumber.from(0),
      nonce: await this.sendingWallet.getNextNonce(),
      gasLimit: 21000,
      gasPrice: prevGasPrice && gasMetrics ? Math.max(gasMetrics.gasPrice, prevGasPrice) * 2 : undefined,
    };

    this.logger.warn(`${this.logPrefix} Sending canceling tx`, {nonce: txData.nonce, gasPrice: txData.gasPrice});

    const fn = () => this.sendingWallet.sendTransaction(txData);

    const {txHash, success} = await this.executeTx(fn, timeout);

    if (!success) {
      this.logger.warn(`${this.logPrefix} Canceling tx ${txHash} filed or still pending`);
      return false;
    }

    return success;
  }

  protected checkBalanceIsEnough = async (wallet: IWallet): Promise<boolean> => {
    const balance = await wallet.getBalance();
    const error = this.testBalanceThreshold(balance, wallet);
    await this.balanceMonitorSaver.apply(this.chainId, balance.toString(), !!error, wallet.address);

    if (error) {
      this.logger.error(error);
      return false;
    }

    return true;
  };

  protected testBalanceThreshold = (balance: bigint, wallet: IWallet): string | undefined => {
    const {errorLimit, warningLimit} = this.blockchain.chainSettings.transactions.minBalance;

    if (balance < wallet.toNative(errorLimit)) {
      return `${this.logPrefix} Balance (${wallet.address.slice(0, 10)}) is lower than ${errorLimit} - ERROR`;
    }

    if (balance < wallet.toNative(warningLimit)) {
      this.logger.warn(`${this.logPrefix} Balance (${wallet.address.slice(0, 10)}) is lower than ${warningLimit}`);
    }
  };

  protected printNotImportantInfo(msg: string) {
    const lastTime = this.lastStatusLogs[msg];

    if (lastTime && lastTime + 60_000 > Date.now()) {
      // print only once a minute
      return;
    }

    this.lastStatusLogs[msg] = Date.now();
    this.logger.info(`${this.logPrefix} ${msg} (stat)`);
  }
}
