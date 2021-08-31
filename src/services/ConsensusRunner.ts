import {Logger} from 'winston';
import sort from 'fast-sort';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Wallet} from 'ethers';
import {LeafValueCoder, loadFeeds} from '@umb-network/toolbox';
import Feeds, {FeedValue} from '@umb-network/toolbox/dist/types/Feed';

import FeedProcessor from './FeedProcessor';
import BlockRepository from './BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../types/Leaf';
import {BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {Consensus, DataForConsensus, LeavesAndFeeds} from '../types/Consensus';
import Settings from '../types/Settings';
import {KeyValues, SignedBlock} from '../types/SignedBlock';
import {Validator} from '../types/Validator';
import {ValidatorsResponses} from '../types/ValidatorsResponses';
import {generateAffidavit, signAffidavitWithWallet, sortLeaves, sortSignaturesBySigner} from '../utils/mining';

@injectable()
class ConsensusRunner {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject('Settings') settings!: Settings;

  async apply(
    dataTimestamp: number,
    blockHeight: number,
    validators: Validator[],
    staked: BigNumber,
    requiredSignatures: number,
  ): Promise<Consensus | null> {
    let {firstClassLeaves, leaves} = await this.leavesAndFeeds(dataTimestamp);
    let consensus: Consensus | null = null;
    let discrepanciesKeys: Set<string> = new Set();

    for (let i = 0; i < this.settings.consensus.retries; i++) {
      if (i > 0) {
        const keys: string[] = [];
        discrepanciesKeys.forEach((k) => keys.push(k));
        this.logger.warn(`Dumping discrepancy data (${keys.length}): ${keys.join(', ')}`);
        ({firstClassLeaves, leaves} = this.removeIgnoredKeys(firstClassLeaves, leaves, discrepanciesKeys));
        discrepanciesKeys = new Set(); // reset
      }

      const dataForConsensus: DataForConsensus = await this.getDataForConsensus(
        dataTimestamp,
        firstClassLeaves,
        leaves,
      );

      ({consensus, discrepanciesKeys} = await this.runConsensus(
        dataForConsensus,
        validators,
        staked,
        requiredSignatures,
      ));

      if (consensus || discrepanciesKeys.size === 0) {
        this.logger.info(
          `step ${i} consensus: ${!!consensus}, discrepanciesKeys: ${discrepanciesKeys.size} of ${
            dataForConsensus.leaves.length
          }/${dataForConsensus.fcdKeys.length}`,
        );
        return consensus;
      }
    }

    return null;
  }

  private async leavesAndFeeds(dataTimestamp: number): Promise<LeavesAndFeeds> {
    const feeds: Feeds[] = await Promise.all(
      [this.settings.feedsOnChain, this.settings.feedsFile].map((fileName) => loadFeeds(fileName)),
    );
    const [firstClassLeaves, leaves] = await this.feedProcessor.apply(dataTimestamp, ...feeds);
    return {firstClassLeaves, leaves, fcdsFeeds: feeds[0], leavesFeeds: feeds[1]};
  }

  private async runConsensus(
    dataForConsensus: DataForConsensus,
    validators: Validator[],
    staked: BigNumber,
    requiredSignatures: number,
  ): Promise<{consensus: Consensus | null; discrepanciesKeys: Set<string>}> {
    const {fcdKeys, fcdValues, leaves} = dataForConsensus;

    const signedBlock: SignedBlock = {
      dataTimestamp: dataForConsensus.dataTimestamp,
      leaves: this.leavesToKeyValues(leaves),
      fcd: this.fcdToKeyValues(fcdKeys, fcdValues),
      signature: await signAffidavitWithWallet(this.blockchain.wallet, dataForConsensus.affidavit),
    };

    this.logger.info(
      `Running consensus at ${dataForConsensus.dataTimestamp} with ${validators.length} validators, ${leaves.length} leaves, ${fcdKeys.length} FCDs`,
    );

    const blockSignerResponsesWithPowers = await this.signatureCollector.apply(
      signedBlock,
      dataForConsensus.affidavit,
      validators,
    );

    const {powers, discrepanciesKeys, signatures} = this.processValidatorsResponses(blockSignerResponsesWithPowers);

    if (!this.hasConsensus(signatures, requiredSignatures)) {
      return {consensus: null, discrepanciesKeys};
    }

    return {
      consensus: {
        dataTimestamp: signedBlock.dataTimestamp,
        leaves,
        fcdKeys,
        fcdValues,
        power: powers,
        root: dataForConsensus.root,
        signatures: sortSignaturesBySigner(signatures, dataForConsensus.affidavit),
      },
      discrepanciesKeys: new Set<string>(),
    };
  }

  private leavesToKeyValues(leaves: Leaf[]): KeyValues {
    return Object.fromEntries(leaves.map(({label, valueBytes}) => [label, LeafValueCoder.decode(valueBytes, label)]));
  }

  private fcdToKeyValues(fcdKeys: string[], fcdValues: FeedValue[]): KeyValues {
    return Object.fromEntries(fcdKeys.map((_, idx) => [fcdKeys[idx], fcdValues[idx]]));
  }

  private hasConsensus(signatures: string[], requiredSignatures: number): boolean {
    if (signatures.length < requiredSignatures) {
      this.logger.info(`Not enough signatures: got ${signatures.length}, required: ${requiredSignatures}`);
      return false;
    }

    return true;

    // we turn on power when we will add DPoS
    /*
    const requiredPercent = 66;
    const got = powers.mul(100);
    const required = staked.mul(requiredPercent);

    if (got.gt(required)) {
      return true;
    }

    this.logger.info(`Not enough power: got ${got.toString()}, required: ${required.toString()}`);
    return false;
    */
  }

  private async getDataForConsensus(
    dataTimestamp: number,
    firstClassLeaves: Leaf[],
    leaves: Leaf[],
  ): Promise<DataForConsensus> {
    const tree = SortedMerkleTreeFactory.apply(sortLeaves(leaves));
    const sortedFirstClassLeaves = sortLeaves(firstClassLeaves);
    const fcdKeys: string[] = sortedFirstClassLeaves.map(({label}) => label);

    const fcdValues: FeedValue[] = sortedFirstClassLeaves.map(({valueBytes, label}) =>
      LeafValueCoder.decode(valueBytes, label),
    );

    const affidavit = generateAffidavit(dataTimestamp, tree.getRoot(), fcdKeys, fcdValues);

    return {
      dataTimestamp,
      affidavit,
      fcdKeys,
      fcdValues,
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
      this.versionCheck(response.version);

      if (response.error) {
        return;
      }

      if (response.signature) {
        signatures.push(response.signature);
        powers = powers.add(response.power);
        return;
      }

      (response.discrepancies || []).forEach((discrepancy) => {
        discrepanciesKeys.add(discrepancy.key);
      });
    });

    return {signatures, discrepanciesKeys, powers};
  }

  private versionCheck(version: string) {
    const expected = this.settings.version.split('.');

    if (!version) {
      this.logger.warn('version check fail: no version');
      return;
    }

    const v = version.split('.');

    if (expected[0] !== v[0]) {
      this.logger.error(`version check fail: expected ${this.settings.version} got ${version}`);
    } else if (expected[1] !== v[1]) {
      this.logger.warn(`version check warn: ${this.settings.version} vs ${version}`);
    } else if (expected[2] !== v[2]) {
      this.logger.info(`version check: ${this.settings.version} vs ${version}`);
    }
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

  static async signAffidavitWithWallet(wallet: Wallet, affidavit: string): Promise<string> {
    const toSign = ethers.utils.arrayify(affidavit);
    return wallet.signMessage(toSign);
  }
}

export default ConsensusRunner;
