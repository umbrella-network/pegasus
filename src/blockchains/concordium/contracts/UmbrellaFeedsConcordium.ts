import {Logger} from 'winston';
import {
  AccountAddress,
  CcdAmount,
  Energy,
  Parameter,
  TransactionExpiry,
  buildBasicAccountSigner,
  ContractTransactionMetadata,
} from '@concordium/web-sdk';

import * as UmbrellaFeedsContract from './generated/umbrella_feeds_umbrella_feeds.js';
import {UpdateParameter, ReturnValueViewContractSetup} from './generated/umbrella_feeds_umbrella_feeds.js';

import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import Blockchain from '../../../lib/Blockchain.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface.js';
import {UmbrellaFeedInterface} from '../../../interfaces/UmbrellaFeedInterface.js';
import {PriceData, PriceDataWithKey, UmbrellaFeedsUpdateArgs} from '../../../types/DeviationFeeds.js';
import {ExecutedTx} from '../../../types/Consensus.js';
import logger from '../../../lib/logger.js';
import {ConcordiumAddress} from '../utils/ConcordiumAddress.js';
import {toViewMessageHashParameter} from '../utils/toViewMessageHashParameter.js';
import {FeedName} from '../../../types/Feed';
import {ConcordiumWallet} from '../ConcordiumWallet.js';
import {decodeDryRunError} from '../utils/errors.js';
import {signatureExpireTimestamp} from '../utils/signatureExpireTimestamp.js';

export class UmbrellaFeedsConcordium implements UmbrellaFeedInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly umbrellaFeedsName!: string;
  readonly blockchain!: Blockchain;
  registry!: RegistryInterface;

  constructor(blockchain: Blockchain, umbrellaFeedsName = 'UmbrellaFeeds') {
    this.logger = logger;
    this.umbrellaFeedsName = umbrellaFeedsName;
    this.blockchain = blockchain;
    this.loggerPrefix = `[${this.blockchain.chainId}][UmbrellaFeedsConcordium]`;
    this.registry = RegistryContractFactory.create(blockchain);
  }

  async resolveAddress(): Promise<string> {
    return this.address();
  }

  async address(): Promise<string> {
    return this.registry.getAddress(this.umbrellaFeedsName);
  }

  chainId(): string {
    return this.blockchain.chainId;
  }

  async hashData(names: string[], priceDatas: PriceData[]): Promise<string> {
    const feeds = await this.resolveContract();

    const params = toViewMessageHashParameter(feeds.contractAddress, names, priceDatas);

    const result = await UmbrellaFeedsContract.dryRunViewMessageHash(feeds, params);
    const parsed = UmbrellaFeedsContract.parseReturnValueViewMessageHash(result);

    if (!parsed) throw new Error(`${this.loggerPrefix} hashData failed`);

    return parsed;
  }

  async contractSetup(): Promise<ReturnValueViewContractSetup> {
    const feeds = await this.resolveContract();

    const result = await UmbrellaFeedsContract.dryRunViewContractSetup(feeds, Parameter.empty());
    const parsed = UmbrellaFeedsContract.parseReturnValueViewContractSetup(result);

    if (!parsed) throw new Error(`${this.loggerPrefix} contractSetup failed`);

    return parsed;
  }

  async requiredSignatures(): Promise<number> {
    const feeds = await this.resolveContract();

    const result = await UmbrellaFeedsContract.dryRunRequiredSignatures(feeds, Parameter.empty());
    const parsed = UmbrellaFeedsContract.parseReturnValueRequiredSignatures(result);

    if (!parsed) throw new Error(`${this.loggerPrefix} requiredSignatures failed`);

    return Number(parsed);
  }

  async getManyPriceDataRaw(names: FeedName[]): Promise<PriceDataWithKey[] | undefined> {
    try {
      const feeds = await this.resolveContract();
      const result = await UmbrellaFeedsContract.dryRunGetManyPriceDataRaw(feeds, names);
      const parsed = UmbrellaFeedsContract.parseReturnValueGetManyPriceDataRaw(result);

      if (result.tag == 'failure') throw new Error(`${this.loggerPrefix} getManyPriceDataRaw failed`);
      if (!parsed) throw new Error(`${this.loggerPrefix} getManyPriceDataRaw parsing failed`);

      return parsed.map((p, i) => {
        const empty = p.type == 'None';

        return {
          price: empty ? 0n : BigInt(p.content.price),
          data: empty ? 0 : p.content.data,
          timestamp: empty ? 0 : Number(p.content.timestamp.value),
          heartbeat: empty ? 0 : Number(p.content.heartbeat),
          key: names[i],
        };
      });
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} getManyPriceDataRaw error: ${(e as Error).message}`);
      return;
    }
  }

  async update(args: UmbrellaFeedsUpdateArgs): Promise<ExecutedTx> {
    const contract = await this.resolveContract();
    const senderAddress = await this.blockchain.deviationWallet?.address();
    if (!senderAddress) throw new Error(`${this.loggerPrefix} empty deviationWallet`);

    const parameter: UpdateParameter = toViewMessageHashParameter(
      contract.contractAddress,
      args.keys,
      args.priceDatas,
      this.sortSignatures(args.signatures),
    );

    const energy = await this.estimateCost(contract, parameter);
    if (!energy) throw new Error(`${this.loggerPrefix} can not estimate gas`);

    const meta: ContractTransactionMetadata = {
      amount: CcdAmount.zero(),
      energy,
      expiry: TransactionExpiry.fromEpochSeconds(signatureExpireTimestamp(args.priceDatas[0])),
      senderAddress: AccountAddress.fromBase58(senderAddress),
    };

    const wallet = this.blockchain.deviationWallet as ConcordiumWallet;
    const signer = buildBasicAccountSigner(wallet.signKey());

    const tx = await UmbrellaFeedsContract.sendUpdate(contract, meta, parameter, signer);
    const atBlock = await this.blockchain.getBlockNumber();

    return {hash: Buffer.from(tx.buffer).toString('hex'), atBlock};
  }

  async estimateCost(
    contract: UmbrellaFeedsContract.Type,
    parameter: UpdateParameter,
  ): Promise<Energy.Type | undefined> {
    const res = await UmbrellaFeedsContract.dryRunUpdate(contract, parameter);

    if (res.tag == 'success') {
      return res.usedEnergy;
    }

    const error = decodeDryRunError(res);
    this.logger.error(`${this.loggerPrefix} estimateCost error: ${error}`);
    this.logger.warn(`${this.loggerPrefix} ${JSON.stringify(contract.contractAddress)}: ${JSON.stringify(parameter)}`);
    return undefined;
  }

  protected sortSignatures(signatures: string[]): string[] {
    return signatures.sort((a, b) => {
      const addr1 = a.split('@')[0];
      const addr2 = b.split('@')[0];
      return ConcordiumAddress.sort(addr1, addr2);
    });
  }

  private resolveContract = async (): Promise<UmbrellaFeedsContract.Type> => {
    const feeds = await this.registry.getAddress(this.umbrellaFeedsName);
    const contractAddress = ConcordiumAddress.fromIndexedString(feeds);
    return UmbrellaFeedsContract.create(this.blockchain.provider.getRawProviderSync(), contractAddress);
  };
}
