import {Logger} from 'winston';
import sort from 'fast-sort';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Wallet} from 'ethers';
import {converters, LeafValueCoder} from '@umb-network/toolbox';

import FeedProcessor from './FeedProcessor';
import RevertedBlockResolver from './RevertedBlockResolver';
import SaveMintedBlock from './SaveMintedBlock';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import loadFeeds from '../config/loadFeeds';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../models/Leaf';
import {BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {Consensus, DataForConsensus} from '../types/Consensus';
import Feeds from '../types/Feed';
import Settings from '../types/Settings';
import {KeyValues, SignedBlock} from '../types/SignedBlock';
import {Validator} from '../types/Validator';
import {ValidatorsResponses} from '../types/ValidatorsResponses';
import {sortLeaves, generateAffidavit, signAffidavitWithWallet} from '../utils/mining';

@injectable()
class ConsensusRunner {
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

  async apply(
    dataTimestamp: number,
    blockHeight: number,
    validators: Validator[],
    staked: BigNumber,
  ): Promise<Consensus | null> {
    let [firstClassLeaves, leaves] = await this.loadFeeds(
      dataTimestamp,
      this.settings.feedsOnChain,
      this.settings.feedsFile,
    );

    let consensus: Consensus | null = null;
    let discrepanciesKeys: Set<string> = new Set();

    for (let i = 0; i < this.settings.consensus.retries; i++) {
      if (i > 0) {
        const keys: string[] = [];
        discrepanciesKeys.forEach((k) => keys.push(k));
        this.logger.warn(`Dumping discrepancy data: ${keys.join(', ')}`);
        ({firstClassLeaves, leaves} = this.removeIgnoredKeys(firstClassLeaves, leaves, discrepanciesKeys));
        discrepanciesKeys = new Set(); // reset
      }

      const dataForConsensus: DataForConsensus = await this.getDataForConsensus(
        dataTimestamp,
        blockHeight,
        firstClassLeaves,
        leaves,
      );

      ({consensus, discrepanciesKeys} = await this.runConsensus(dataForConsensus, validators, staked));

      if (consensus || discrepanciesKeys.size === 0) {
        return consensus;
      }
    }

    return null;
  }

  private async loadFeeds(timestamp: number, ...feedFileName: string[]): Promise<Leaf[][]> {
    const feeds: Feeds[] = await Promise.all(feedFileName.map((fileName) => loadFeeds(fileName)));
    return this.feedProcessor.apply(timestamp, ...feeds);
  }

  private async runConsensus(
    dataForConsensus: DataForConsensus,
    validators: Validator[],
    staked: BigNumber,
  ): Promise<{consensus: Consensus | null; discrepanciesKeys: Set<string>}> {
    const {numericFcdKeys, numericFcdValues, leaves} = dataForConsensus;

    const signedBlock: SignedBlock = {
      blockHeight: dataForConsensus.blockHeight,
      dataTimestamp: dataForConsensus.dataTimestamp,
      leaves: this.leavesToKeyValues(leaves),
      fcd: this.fcdToKeyValues(numericFcdKeys, numericFcdValues),
      signature: await signAffidavitWithWallet(this.blockchain.wallet, dataForConsensus.affidavit),
    };

    this.logger.info(`Running consensus for ${dataForConsensus.blockHeight} with ${validators.length} validators...`);

    const blockSignerResponsesWithPowers = await this.signatureCollector.apply(
      signedBlock,
      dataForConsensus.affidavit,
      validators,
    );

    const validatorsResponses: ValidatorsResponses = this.processValidatorsResponses(blockSignerResponsesWithPowers);

    if (!this.hasConsensus(validatorsResponses.powers, staked)) {
      return {consensus: null, discrepanciesKeys: validatorsResponses.discrepanciesKeys};
    }

    return {
      consensus: {
        blockHeight: signedBlock.blockHeight,
        dataTimestamp: signedBlock.dataTimestamp,
        leaves,
        numericFcdKeys,
        numericFcdValues,
        power: validatorsResponses.powers,
        root: dataForConsensus.root,
        signatures: validatorsResponses.signatures,
      },
      discrepanciesKeys: new Set<string>(),
    };
  }

  private leavesToKeyValues(leaves: Leaf[]): KeyValues {
    return Object.fromEntries(
      leaves.map(({label, valueBytes}) => [label, LeafValueCoder.decode(valueBytes) as number]),
    );
  }

  private fcdToKeyValues(numericFcdKeys: string[], numericFcdValues: number[]): KeyValues {
    return Object.fromEntries(numericFcdKeys.map((_, idx) => [numericFcdKeys[idx], numericFcdValues[idx]]));
  }

  private hasConsensus(powers: BigNumber, staked: BigNumber): boolean {
    const requiredPercent = 66;
    const got = powers.mul(100);
    const required = staked.mul(requiredPercent);

    if (got.gt(required)) {
      return true;
    }

    this.logger.info(`Not enough power: got ${got.toString()}%, required: ${required.toString()}%`);
    return false;
  }

  private async getDataForConsensus(
    dataTimestamp: number,
    blockHeight: number,
    firstClassLeaves: Leaf[],
    leaves: Leaf[],
  ): Promise<DataForConsensus> {
    const tree = this.sortedMerkleTreeFactory.apply(sortLeaves(leaves));
    const sortedFirstClassLeaves = sortLeaves(firstClassLeaves);
    const numericFcdKeys: string[] = sortedFirstClassLeaves.map(({label}) => label);

    const numericFcdValues: number[] = sortedFirstClassLeaves.map(
      ({valueBytes}) => LeafValueCoder.decode(valueBytes) as number,
    );

    const affidavit = generateAffidavit(dataTimestamp, tree.getRoot(), blockHeight, numericFcdKeys, numericFcdValues);

    return {
      dataTimestamp,
      affidavit,
      blockHeight,
      numericFcdKeys,
      numericFcdValues,
      leaves,
      root: tree.getRoot(),
    };
  }

  private removeIgnoredKeys(
    firstClassLeaves: Leaf[],
    leaves: Leaf[],
    ignoredKeys: Set<string>,
  ): {firstClassLeaves: Leaf[]; leaves: Leaf[]} {
    return {
      firstClassLeaves: firstClassLeaves.filter((leaf) => !ignoredKeys.has(leaf.label)),
      leaves: leaves.filter((leaf) => !ignoredKeys.has(leaf.label)),
    };
  }

  private processValidatorsResponses(blockSignerResponses: BlockSignerResponseWithPower[]): ValidatorsResponses {
    const signatures: string[] = [];
    const discrepanciesKeys: Set<string> = new Set();
    let powers: BigNumber = BigNumber.from(0);

    blockSignerResponses.forEach((response: BlockSignerResponseWithPower) => {
      if (response.signature) {
        signatures.push(response.signature);
        powers = powers.add(response.power);
        return;
      }

      response.discrepancies.forEach((discrepancy) => {
        discrepanciesKeys.add(discrepancy.key);
      });
    });

    return {signatures, discrepanciesKeys, powers};
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
}

export default ConsensusRunner;
