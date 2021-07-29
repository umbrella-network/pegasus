import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Signature} from 'ethers';
import {ABI, LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';
import {getModelForClass} from '@typegoose/typegoose';
import newrelic from 'newrelic';

import ConsensusRunner from './ConsensusRunner';
import FeedProcessor from './FeedProcessor';
import BlockRepository from './BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Block from '../models/Block';
import {ChainStatus} from '../types/ChainStatus';
import Settings from '../types/Settings';
import {LogMint} from '../types/events';
import {chainReadyForNewBlock} from '../utils/mining';
import {MintedBlock} from '../types/MintedBlock';
import {FailedTransactionEvent} from '../constants/ReportedMetricsEvents';
import GasEstimator from './GasEstimator';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(ConsensusRunner) consensusRunner!: ConsensusRunner;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject('Settings') settings!: Settings;
  @inject(GasEstimator) gasEstimator!: GasEstimator;

  async apply(): Promise<void> {
    const [chainAddress, chainStatus] = await this.chainContract.resolveStatus();

    if (!this.isLeader(chainStatus)) return;

    const dataTimestamp = this.timeService.apply(this.settings.dataTimestampOffsetSeconds);
    const {nextBlockId} = chainStatus;

    if (!(await this.canMint(chainStatus, dataTimestamp))) {
      return;
    }

    this.logger.info(
      `Proposing new block for block: ${chainStatus.blockNumber}/${nextBlockId.toString()} at ${dataTimestamp}...`,
    );

    const validators = this.chainContract.resolveValidators(chainStatus);
    const consensus = await this.consensusRunner.apply(dataTimestamp, nextBlockId, validators, chainStatus.staked);

    if (!consensus) {
      this.logger.warn(
        `No consensus for block ${chainStatus.blockNumber}/${chainStatus.nextBlockId} at  ${dataTimestamp}`,
      );
      return;
    }

    this.logger.info(`Minting a block with ${consensus.signatures.length} signatures...`);

    const mintedBlock = await this.mint(
      consensus.dataTimestamp,
      consensus.root,
      consensus.fcdKeys,
      consensus.fcdValues,
      consensus.signatures,
      chainStatus,
    );

    if (mintedBlock) {
      const {hash, logMint} = mintedBlock;
      this.logger.info(`New Block ${logMint.blockId} minted with TX ${hash}`);
      await this.blockRepository.saveBlock(chainAddress, consensus, logMint.blockId.toNumber(), true);
    }
  }

  private isLeader(chainStatus: ChainStatus): boolean {
    const {blockNumber, nextBlockId, nextLeader} = chainStatus;

    this.logger.info(
      `Next leader for ${blockNumber}/${nextBlockId}: ${nextLeader}, ${nextLeader === this.blockchain.wallet.address}`,
    );

    return nextLeader === this.blockchain.wallet.address;
  }

  private static splitSignature(signature: string): Signature {
    return ethers.utils.splitSignature(signature);
  }

  private async mint(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: FeedValue[],
    signatures: string[],
    chainStatus: ChainStatus,
  ): Promise<MintedBlock | null> {
    try {
      const components = signatures.map((signature) => BlockMinter.splitSignature(signature));

      const gasPrice = await this.gasEstimator.apply();

      const [currentBlockNumber, tx] = await Promise.all([
        this.blockchain.getBlockNumber(),
        this.chainContract.submit(
          dataTimestamp,
          root,
          keys.map(LeafKeyCoder.encode),
          values.map((v, i) => LeafValueCoder.encode(v, keys[i])),
          components.map((sig) => sig.v),
          components.map((sig) => sig.r),
          components.map((sig) => sig.s),
          gasPrice,
        ),
      ]);

      this.logger.info(`Tx submitted at ${currentBlockNumber}, waiting for new block.`);

      // there is no point of canceling tx if block is not minted
      const newBlockNumber = await this.waitUntilNextBlock(currentBlockNumber);

      this.logger.info(`New block detected ${newBlockNumber}, waiting for tx to be minted.`);

      const receipt = await Promise.race([tx.wait(), BlockMinter.txTimeout(chainStatus)]);

      if (!receipt) {
        this.logger.warn(`canceling tx ${tx.hash}`);
        await this.cancelPendingTransaction(gasPrice).catch(this.logger.warn);

        throw new Error('mint TX timeout');
      }

      if (receipt.status !== 1) {
        newrelic.recordCustomEvent(FailedTransactionEvent, {
          transactionHash: receipt.transactionHash,
        });

        return null;
      }

      const logMint = this.getLogMint(receipt.logs);

      if (!logMint) {
        return null;
      }

      return {hash: receipt.transactionHash, logMint};
    } catch (e) {
      const err = await this.handleTimestampDiscrepancyError(e, dataTimestamp);
      newrelic.noticeError(err);
      this.logger.error(err);
      return null;
    }
  }

  private static async txTimeout(chainStatus: ChainStatus): Promise<undefined> {
    return new Promise<undefined>((resolve) =>
      setTimeout(async () => {
        resolve(undefined);
      }, chainStatus.timePadding * 1000),
    );
  }

  private async waitUntilNextBlock(currentBlockNumber: number): Promise<number> {
    // it would be nice to subscribe for blockNumber, but we forcing http for RPC
    // this is not pretty solution, but we using proxy, so infura calls should not increase
    let newBlockNumber = await this.blockchain.getBlockNumber();

    while (currentBlockNumber === newBlockNumber) {
      this.logger.info(`waitUntilNextBlock: current ${currentBlockNumber}, new ${newBlockNumber}.`);
      await BlockMinter.sleep(this.settings.blockchain.transactions.waitForBlockTime);
      newBlockNumber = await this.blockchain.getBlockNumber();
    }

    return newBlockNumber;
  }

  private static sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  private async handleTimestampDiscrepancyError(e: Error, dataTimestamp: number): Promise<Error> {
    if (!e.message.includes('you can predict the future')) {
      return e;
    }

    const blockTimestamp = await this.blockchain.getBlockTimestamp();
    return new Error(`Timestamp discrepancy ${blockTimestamp - dataTimestamp}s: (${e.message})`);
  }

  private async cancelPendingTransaction(prevGasPrice: number): Promise<boolean> {
    const gasPrice = await this.gasEstimator.apply();

    const txData = {
      from: this.blockchain.wallet.address,
      to: this.blockchain.wallet.address,
      value: BigNumber.from(0),
      nonce: await this.blockchain.wallet.getTransactionCount('latest'),
      gasLimit: 21000,
      gasPrice: Math.max(gasPrice, prevGasPrice) * 2,
    };

    this.logger.warn('Sending canceling tx', {nonce: txData.nonce, gasPrice: txData.gasPrice});

    const tx = await this.blockchain.wallet.sendTransaction(txData);

    const receipt = await tx.wait();

    return receipt.status === 1;
  }

  private getLogMint(logs: ethers.providers.Log[]): LogMint {
    const iface = new ethers.utils.Interface(ABI.chainAbi);
    const logMint = logs.map((log) => iface.parseLog(log)).find((event) => event.name === 'LogMint');

    if (!logMint) {
      throw Error('can`t find LogMint in logs');
    }

    const {minter, staked, blockId, power} = logMint.args;
    return {minter, staked, blockId, power};
  }

  private async canMint(chainStatus: ChainStatus, dataTimestamp: number): Promise<boolean> {
    const [ready, error] = chainReadyForNewBlock(chainStatus, dataTimestamp);
    error && this.logger.info(error);
    return ready;
  }

  private static async getLastSubmittedBlock(): Promise<Block | undefined> {
    // sorting by timestamp because blockId can change eg blocks can be reverted
    // so latest submitted not necessary can be the one with highest blockId
    const blocks: Block[] = await getModelForClass(Block).find({}).limit(1).sort({timestamp: -1}).exec();
    return blocks[0];
  }
}

export default BlockMinter;
