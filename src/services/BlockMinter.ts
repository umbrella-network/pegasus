import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {ethers, Signature} from 'ethers';
import {ABI, LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';
import {getModelForClass} from '@typegoose/typegoose';
import newrelic from 'newrelic';

import ConsensusRunner from './ConsensusRunner';
import FeedProcessor from './FeedProcessor';
import RevertedBlockResolver from './RevertedBlockResolver';
import SaveMintedBlock from './SaveMintedBlock';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Block from '../models/Block';
import {ChainStatus} from '../types/ChainStatus';
import {Consensus} from '../types/Consensus';
import Settings from '../types/Settings';
import {LogMint, LogVoter} from '../types/events';
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
  @inject(SaveMintedBlock) saveMintedBlock!: SaveMintedBlock;
  @inject('Settings') settings!: Settings;
  @inject(RevertedBlockResolver) reveredBlockResolver!: RevertedBlockResolver;
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
    );

    if (mintedBlock) {
      const {hash, logMint} = mintedBlock;
      this.logger.info(`New Block ${logMint.blockId} Minted in TX ${hash}`);
      await this.saveBlock(chainAddress, consensus, mintedBlock);
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
    values: number[],
    signatures: string[],
  ): Promise<MintedBlock | null> {
    try {
      const components = signatures.map((signature) => BlockMinter.splitSignature(signature));

      const gasPrice = await this.gasEstimator.apply();

      const tx = await this.chainContract.submit(
        dataTimestamp,
        root,
        keys.map(LeafKeyCoder.encode),
        values.map((v) => LeafValueCoder.encode(v)),
        components.map((sig) => sig.v),
        components.map((sig) => sig.r),
        components.map((sig) => sig.s),
        gasPrice,
      );

      const txTimeout = new Promise<never>((resolve, reject) =>
        setTimeout(() => reject('TX timeout'), this.settings.blockchain.transactions.waitTime),
      );

      const receipt = await Promise.race([tx.wait(), txTimeout]);

      if (receipt.status !== 1) {
        newrelic.recordCustomEvent(FailedTransactionEvent, {
          transactionHash: receipt.transactionHash,
        });
        return null;
      }

      const logMint = this.getLogMint(receipt.logs);
      const logsVoters = this.getLogVoters(receipt.logs);

      if (!logMint) {
        return null;
      }

      return {hash: receipt.transactionHash, anchor: receipt.blockNumber, logMint, logsVoters};
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
      return null;
    }
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

  private getLogVoters(logs: ethers.providers.Log[]): LogVoter[] {
    const iface = new ethers.utils.Interface(ABI.chainAbi);
    const logVoters = logs.map((log) => iface.parseLog(log)).filter((event) => event.name === 'LogVoter');

    if (!logVoters) {
      throw Error('can`t find logVoters in logs');
    }

    return logVoters.map((logVoter) => {
      return {vote: logVoter.args.vote, voter: logVoter.args.voter, blockId: logVoter.args.blockId};
    });
  }

  private async canMint(chainStatus: ChainStatus, dataTimestamp: number): Promise<boolean> {
    const [ready, error] = chainReadyForNewBlock(chainStatus, dataTimestamp);

    if (!ready) {
      this.logger.info(error);
      return false;
    }

    let lastSubmittedBlock = await BlockMinter.getLastSubmittedBlock();

    if (!lastSubmittedBlock) {
      return true;
    }

    await this.reveredBlockResolver.apply(lastSubmittedBlock?.blockId, chainStatus.nextBlockId);
    lastSubmittedBlock = await BlockMinter.getLastSubmittedBlock();

    const allowed = lastSubmittedBlock ? chainStatus.nextBlockId > lastSubmittedBlock.blockId : true;

    // TODO this can be removed if we add feature to Chain to start blockId from 1, not from 0.
    if (!allowed) {
      this.logger.info(`you already mined this block`);
    }

    return allowed;
  }

  private static async getLastSubmittedBlock(): Promise<Block | undefined> {
    const blocks: Block[] = await getModelForClass(Block).find({}).limit(1).sort({blockId: -1}).exec();
    return blocks[0];
  }

  private async saveBlock(chainAddress: string, consensus: Consensus, mintedBlock: MintedBlock): Promise<void> {
    const votes: Record<string, string> = {};

    mintedBlock.logsVoters.forEach((logVoter) => {
      votes[logVoter.voter] = logVoter.vote.toString();
    });

    await this.saveMintedBlock.apply({
      id: `block::${mintedBlock.logMint.blockId}`,
      chainAddress,
      dataTimestamp: new Date(consensus.dataTimestamp * 1000),
      timestamp: new Date(),
      leaves: consensus.leaves,
      blockId: mintedBlock.logMint.blockId.toNumber(),
      anchor: mintedBlock.anchor,
      root: consensus.root,
      fcdKeys: consensus.fcdKeys,
      fcdValues: consensus.fcdValues,
      votes: votes,
      power: mintedBlock.logMint.power.toString(),
      staked: mintedBlock.logMint.staked.toString(),
      miner: mintedBlock.logMint.minter,
    });
  }
}

export default BlockMinter;
