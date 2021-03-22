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
import MintGuard from './MintGuard';
import FeedProcessor from "./FeedProcessor";
import loadFeeds from "../config/loadFeeds";
import Settings from "../types/Settings";
import {SignedBlock} from '../types/SignedBlock';
import SignatureCollector from './SignatureCollector';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(SaveMintedBlock) saveMintedBlock!: SaveMintedBlock;
  @inject(MintGuard) mintGuard!: MintGuard;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<void> {
    if (!(await this.isLeader())) return;

    const blockHeight = await this.chainContract.getBlockHeight();

    if (!(await this.canMint(blockHeight))) {
      this.logger.info(`Skipping blockHeight: ${blockHeight.toString()}...`);
      return;
    }

    this.logger.info(`Proposing new block for blockHeight: ${blockHeight.toString()}...`);

    const [firstClassLeaves, leaves] = await Promise.all([
      this.loadFeeds(this.settings.feedsOnChain),
      this.loadFeeds(this.settings.feedsFile)
    ]);

    const tree = this.sortedMerkleTreeFactory.apply(BlockMinter.sortLeaves(leaves));

    const sortedFirstClassLeaves = BlockMinter.sortLeaves(firstClassLeaves);
    const numericFcdKeys: string[] = sortedFirstClassLeaves.map(({label}) => label);
    const numericFcdValues: number[] = sortedFirstClassLeaves.map(({valueBytes}) => LeafValueCoder.decode(valueBytes) as number);

    const affidavit = BlockMinter.generateAffidavit(tree.getRoot(), blockHeight, numericFcdKeys, numericFcdValues);
    const signature = await BlockMinter.signAffidavitWithWallet(this.blockchain.wallet, affidavit);

    const signedBlock: SignedBlock = {
      signature,
      blockHeight: blockHeight.toNumber(),
      leaves: Object.fromEntries(leaves.map(({
                                               label,
                                               valueBytes
                                             }) => [label, LeafValueCoder.decode(valueBytes) as number])),
      fcd: Object.fromEntries(numericFcdKeys.map((_, idx) => [numericFcdKeys[idx], numericFcdValues[idx]])),
    };

    const signatures = await this.signatureCollector.apply(signedBlock, affidavit);

    const mint = await this.mint(tree.getRoot(), numericFcdKeys, numericFcdValues, signatures);
    if (mint) {
      await this.saveBlock(leaves, Number(blockHeight), tree.getRoot(), numericFcdKeys, numericFcdValues);
    }
  }

  private async loadFeeds(feedFileName: string): Promise<Leaf[]> {
    const feeds = await loadFeeds(feedFileName);
    const leaves = await this.feedProcessor.apply(feeds);

    if (!leaves.length) {
      throw new Error(`we can't get leaves... check API access to feeds.`)
    }

    return leaves;
  }

  private async canMint(blockHeight: BigNumber): Promise<boolean> {
    const [votersCount, allowed] = await Promise.all([
      this.chainContract.getBlockVotersCount(blockHeight),
      this.mintGuard.apply(Number(blockHeight))
    ]);

    this.logger.info(`canMint: ${votersCount.isZero()} && ${allowed}`)

    return votersCount.isZero() && allowed;
  }

  private async isLeader(): Promise<boolean> {
    const currentLeader = await this.chainContract.getLeaderAddress();

    this.logger.info(`Current leader: ${currentLeader}, ${currentLeader === this.blockchain.wallet.address}`);

    return currentLeader === this.blockchain.wallet.address;
  }

  static recoverSigner(affidavit: string, signature: string): string {
    const pubKey = ethers.utils.recoverPublicKey(
      ethers.utils.solidityKeccak256(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32',
        ethers.utils.arrayify(affidavit)]), signature);

    return ethers.utils.computeAddress(pubKey)
  }

  static sortLeaves(feeds: Leaf[]): Leaf[] {
    return sort(feeds).asc(({label}) => label);
  }

  static generateAffidavit(root: string, blockHeight: BigNumber, numericFCDKeys: string[], numericFCDValues: number[]): string {
    const encoder = new ethers.utils.AbiCoder();
    let testimony = encoder.encode(['uint256', 'bytes32'], [blockHeight, root]);

    numericFCDKeys.forEach((key, i) => {
      testimony += ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'uint256'],
        [converters.strToBytes32(key), converters.numberToUint256(numericFCDValues[i])]).slice(2);
    })

    return ethers.utils.keccak256(testimony);
  }

  static async signAffidavitWithWallet(wallet: Wallet, affidavit: string): Promise<string> {
    const toSign = ethers.utils.arrayify(affidavit)
    return wallet.signMessage(toSign);
  }

  private static splitSignature(signature: string): Signature {
    return ethers.utils.splitSignature(signature);
  }

  private async mint(root: string, keys: string[], values: number[], signatures: string[]): Promise<boolean> {
    try {
      const components = signatures.map((signature) => BlockMinter.splitSignature(signature));

      const tx = await this.chainContract.submit(
        root,
        keys.map(converters.strToBytes32),
        values.map(converters.numberToUint256),
        components.map((sig) => sig.v),
        components.map((sig) => sig.r),
        components.map((sig) => sig.s),
      );

      const receipt = await tx.wait();
      return receipt.status == 1;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  private async saveBlock(leaves: Leaf[], blockHeight: number, root: string, numericFcdKeys: string[], numericFcdValues: number[]): Promise<void> {
    await this.saveMintedBlock.apply({leaves, blockHeight, root, numericFcdKeys, numericFcdValues});
  }
}

export default BlockMinter;
