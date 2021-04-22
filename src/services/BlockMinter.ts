import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {ethers, Signature} from 'ethers';
import {converters} from '@umb-network/toolbox';
import {getModelForClass} from '@typegoose/typegoose';

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

  async apply(): Promise<void> {
    const chainStatus = await this.chainContract.resolveStatus();

    if (!this.isLeader(chainStatus)) return;

    const dataTimestamp = this.timeService.apply(this.settings.dataTimestampOffsetSeconds);
    const {nextBlockHeight} = chainStatus;

    if (!(await this.canMint(chainStatus))) {
      return;
    }

    this.logger.info(
      `Proposing new block for block: ${chainStatus.blockNumber}/${nextBlockHeight.toString()} at ${dataTimestamp}...`,
    );

    const validators = this.chainContract.resolveValidators(chainStatus);

    const consensus = await this.consensusRunner.apply(
      dataTimestamp,
      nextBlockHeight.toNumber(),
      validators,
      chainStatus.staked,
    );

    if (!consensus) {
      this.logger.warn(
        `No consensus for block ${chainStatus.blockNumber}/${chainStatus.nextBlockHeight} at  ${dataTimestamp}`,
      );
      return;
    }

    this.logger.info(`Minting a block with ${consensus.signatures.length} signatures...`);

    const tx = await this.mint(
      consensus.dataTimestamp,
      consensus.root,
      consensus.numericFcdKeys,
      consensus.numericFcdValues,
      consensus.signatures,
    );

    if (tx) {
      this.logger.info(`Minted in TX ${tx}`);
      await this.saveBlock(consensus);
    }
  }

  private isLeader(chainStatus: ChainStatus): boolean {
    const {blockNumber, nextLeader, nextBlockHeight} = chainStatus;

    this.logger.info(
      `Next leader for ${blockNumber}/${nextBlockHeight}: ${nextLeader}, ${
        nextLeader === this.blockchain.wallet.address
      }`,
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
  ): Promise<string | null> {
    try {
      const components = signatures.map((signature) => BlockMinter.splitSignature(signature));

      const tx = await this.chainContract.submit(
        dataTimestamp,
        root,
        keys.map(converters.strToBytes32),
        values.map(converters.numberToUint256),
        components.map((sig) => sig.v),
        components.map((sig) => sig.r),
        components.map((sig) => sig.s),
      );

      const receipt = await tx.wait();
      return receipt.status == 1 ? receipt.transactionHash : null;
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  private async canMint(chainStatus: ChainStatus): Promise<boolean> {
    if (chainStatus.lastBlockHeight.gt(0) && chainStatus.lastBlockHeight.eq(chainStatus.nextBlockHeight)) {
      this.logger.info(
        `skipping ${chainStatus.blockNumber}/${chainStatus.nextBlockHeight.toString()}, waiting for new round`,
      );
      return false;
    }

    let lastSubmittedBlock = await BlockMinter.getLastSubmittedBlock();

    if (!lastSubmittedBlock) {
      return true;
    }

    await this.reveredBlockResolver.apply(lastSubmittedBlock?.height, chainStatus.nextBlockHeight.toNumber());
    lastSubmittedBlock = await BlockMinter.getLastSubmittedBlock();

    const allowed = lastSubmittedBlock ? chainStatus.nextBlockHeight.gt(lastSubmittedBlock.height) : true;

    if (!allowed) {
      // this can happen when workers will be scheduled faster than they can mint
      this.logger.info(`you already mined this block`);
    }

    return allowed;
  }

  private static async getLastSubmittedBlock(): Promise<Block | undefined> {
    const blocks: Block[] = await getModelForClass(Block).find({}).limit(1).sort({height: -1}).exec();
    return blocks[0];
  }

  private async saveBlock(consensus: Consensus): Promise<void> {
    await this.saveMintedBlock.apply({
      dataTimestamp: new Date(consensus.dataTimestamp * 1000),
      timestamp: new Date(),
      leaves: consensus.leaves,
      blockHeight: consensus.blockHeight,
      root: consensus.root,
      numericFcdKeys: consensus.numericFcdKeys,
      numericFcdValues: consensus.numericFcdValues,
    });
  }
}

export default BlockMinter;
