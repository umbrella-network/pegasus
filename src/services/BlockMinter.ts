import {Logger} from 'winston';
import sort from 'fast-sort';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Signature, Wallet} from 'ethers';
import {converters, LeafValueCoder} from '@umb-network/toolbox';

import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import SaveMintedBlock from './SaveMintedBlock';
import FeedProcessor from './FeedProcessor';
import Settings from '../types/Settings';
import {SignedBlock} from '../types/SignedBlock';
import SignatureCollector from './SignatureCollector';
import Feeds from '../types/Feed';
import loadFeeds from '../config/loadFeeds';
import TimeService from './TimeService';
import Block from '../models/Block';
import {getModelForClass} from '@typegoose/typegoose';
import RevertedBlockResolver from './RevertedBlockResolver';
import {ChainStatus} from '../types/ChainStatus';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
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

    const dataTimestamp = this.timeService.apply();
    const {nextBlockHeight} = chainStatus;

    if (!(await this.canMint(chainStatus))) {
      return;
    }

    this.logger.info(`Proposing new block for blockId: ${nextBlockHeight.toString()} at ${dataTimestamp}...`);

    const [firstClassLeaves, leaves] = await this.loadFeeds(
      dataTimestamp,
      this.settings.feedsOnChain,
      this.settings.feedsFile,
    );

    this.logger.info('Signing feeds...');

    const tree = this.sortedMerkleTreeFactory.apply(BlockMinter.sortLeaves(leaves));

    const sortedFirstClassLeaves = BlockMinter.sortLeaves(firstClassLeaves);
    const numericFcdKeys: string[] = sortedFirstClassLeaves.map(({label}) => label);
    const numericFcdValues: number[] = sortedFirstClassLeaves.map(
      ({valueBytes}) => LeafValueCoder.decode(valueBytes) as number,
    );

    const affidavit = BlockMinter.generateAffidavit(
      dataTimestamp,
      tree.getRoot(),
      nextBlockHeight,
      numericFcdKeys,
      numericFcdValues,
    );

    const signature = await BlockMinter.signAffidavitWithWallet(this.blockchain.wallet, affidavit);

    const signedBlock: SignedBlock = {
      dataTimestamp,
      signature,
      blockHeight: nextBlockHeight.toNumber(),
      leaves: Object.fromEntries(
        leaves.map(({label, valueBytes}) => [label, LeafValueCoder.decode(valueBytes) as number]),
      ),
      fcd: Object.fromEntries(numericFcdKeys.map((_, idx) => [numericFcdKeys[idx], numericFcdValues[idx]])),
    };

    const validators = this.chainContract.resolveValidators(chainStatus);

    this.logger.info(`Collecting signatures from ${validators.length - 1} validators...`);

    const signatures = await this.signatureCollector.apply(signedBlock, affidavit, validators);

    this.logger.info(`Minting a block with ${signatures.length} signatures...`);

    const tx = await this.mint(dataTimestamp, tree.getRoot(), numericFcdKeys, numericFcdValues, signatures);

    if (tx) {
      this.logger.info(`Minted in TX ${tx}`);

      await this.saveBlock(
        dataTimestamp,
        leaves,
        Number(nextBlockHeight),
        tree.getRoot(),
        numericFcdKeys,
        numericFcdValues,
      );
    }
  }

  private async loadFeeds(timestamp: number, ...feedFileName: string[]): Promise<Leaf[][]> {
    const feeds: Feeds[] = await Promise.all(feedFileName.map((fileName) => loadFeeds(fileName)));

    return this.feedProcessor.apply(timestamp, ...feeds);
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

  static recoverSigner(affidavit: string, signature: string): string {
    const pubKey = ethers.utils.recoverPublicKey(
      ethers.utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', ethers.utils.arrayify(affidavit)],
      ),
      signature,
    );

    return ethers.utils.computeAddress(pubKey);
  }

  static sortLeaves(feeds: Leaf[]): Leaf[] {
    return sort(feeds).asc(({label}) => label);
  }

  static generateAffidavit(
    dataTimestamp: number,
    root: string,
    blockHeight: BigNumber,
    numericFCDKeys: string[],
    numericFCDValues: number[],
  ): string {
    const encoder = new ethers.utils.AbiCoder();
    let testimony = encoder.encode(['uint256', 'uint256', 'bytes32'], [blockHeight, dataTimestamp, root]);

    numericFCDKeys.forEach((key, i) => {
      testimony += ethers.utils.defaultAbiCoder
        .encode(['bytes32', 'uint256'], [converters.strToBytes32(key), converters.numberToUint256(numericFCDValues[i])])
        .slice(2);
    });

    return ethers.utils.keccak256(testimony);
  }

  static async signAffidavitWithWallet(wallet: Wallet, affidavit: string): Promise<string> {
    const toSign = ethers.utils.arrayify(affidavit);
    return wallet.signMessage(toSign);
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

    const lastSubmittedBlock = await this.getLastSubmittedBlock();

    if (!lastSubmittedBlock) {
      return true;
    }

    await this.reveredBlockResolver.apply(lastSubmittedBlock?.height, chainStatus.nextBlockHeight.toNumber());
    return true;
  }

  private async getLastSubmittedBlock(): Promise<Block | undefined> {
    const blocks: Block[] = await getModelForClass(Block).find({}).limit(1).sort({height: -1}).exec();

    return blocks[0];
  }

  private async saveBlock(
    dataTimestamp: number,
    leaves: Leaf[],
    blockHeight: number,
    root: string,
    numericFcdKeys: string[],
    numericFcdValues: number[],
  ): Promise<void> {
    await this.saveMintedBlock.apply({
      dataTimestamp: new Date(dataTimestamp * 1000),
      timestamp: new Date(),
      leaves,
      blockHeight,
      root,
      numericFcdKeys,
      numericFcdValues,
    });
  }
}

export default BlockMinter;
