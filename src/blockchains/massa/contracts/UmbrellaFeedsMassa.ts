import {Logger} from 'winston';

import {Args, ArrayTypes, Client, ClientFactory, IProvider, ProviderType} from '@massalabs/massa-web3';
import {IContractReadOperationResponse} from '@massalabs/web3-utils/dist/esm/interfaces/IContractReadOperationResponse';

import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import Blockchain from '../../../lib/Blockchain.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface.js';
import {UmbrellaFeedInterface} from '../../../interfaces/UmbrellaFeedInterface.js';
import {PriceData, PriceDataWithKey, UmbrellaFeedsUpdateArgs} from '../../../types/DeviationFeeds.js';

import {ExecutedTx} from '../../../types/Consensus.js';
import logger from '../../../lib/logger.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {MassaWBytesSerializer} from '../utils/MassaWBytesSerializer.js';
import {MassaPriceDataSerializer} from '../utils/MassaPriceDataSerializer.js';
import {MassaAddress} from '../utils/MassaAddress.js';
import {MassaProvider} from '../MassaProvider.js';
import {ProviderInterface} from '../../../interfaces/ProviderInterface.js';
import {MassaEstimatedGas} from '../massaTypes.js';
import {FeedName} from '../../../types/Feed';
import {hashFeedName} from '../../../utils/hashFeedName.js';
import Settings from '../../../types/Settings';

export class UmbrellaFeedsMassa implements UmbrellaFeedInterface {
  protected readonly MAX_GAS = 4_294_167_295n; // Max gas for an op on Massa blockchain

  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly umbrellaFeedsName!: string;
  readonly provider!: ProviderInterface;
  readonly registry!: RegistryInterface;
  readonly blockchain!: Blockchain;
  readonly settings!: Settings;

  protected client!: Client;
  protected deviationClient!: Client;

  constructor(settings: Settings, blockchain: Blockchain, umbrellaFeedsName = 'UmbrellaFeeds') {
    this.logger = logger;
    this.umbrellaFeedsName = umbrellaFeedsName;
    this.loggerPrefix = `[${blockchain.chainId}][UmbrellaFeedsMassa]`;

    this.provider = blockchain.getProvider();
    this.registry = RegistryContractFactory.create(blockchain);
    this.blockchain = blockchain;
    this.settings = settings;

    this.beforeAnyAction().then(() => {
      this.logger.info(`${this.loggerPrefix} constructor done`);
    });
  }

  resolveAddress(): Promise<string> {
    return this.address();
  }

  async address(): Promise<string> {
    return this.registry.getAddress(this.umbrellaFeedsName);
  }

  chainId(): string {
    return ChainsIds.MASSA;
  }

  async hashData(names: string[], priceDatas: PriceData[]): Promise<string> {
    await this.beforeAnyAction();

    const parameter = new Args();
    parameter.addSerializableObjectArray(this.serializeFeedsNames(names));
    parameter.addSerializableObjectArray(this.serializePriceDatas(priceDatas));

    const res = await this.rawCall({targetFunction: 'hashData', parameter, gas: 50_000_000n});
    return '0x' + Buffer.from(new Args(res.returnValue).nextUint8Array()).toString('hex');
  }

  async requiredSignatures(): Promise<number> {
    await this.beforeAnyAction();

    const res = await this.rawCall({targetFunction: 'REQUIRED_SIGNATURES'});
    return Number(new Args(res.returnValue).nextU8());
  }

  async getManyPriceDataRaw(names: FeedName[]): Promise<PriceDataWithKey[] | undefined> {
    if (names.length == 0) return [];
    await this.beforeAnyAction();

    const parameter = new Args();
    parameter.addSerializableObjectArray(this.serializeFeedsNames(names));

    const res = await this.rawCall({targetFunction: 'getManyPriceDataRaw', parameter});
    const priceDatas = new Args(res.returnValue).nextSerializableObjectArray(MassaPriceDataSerializer);

    return names.map((key, i) => {
      return <PriceDataWithKey>{
        ...priceDatas[i].get(),
        key,
      };
    });
  }

  async update(args: UmbrellaFeedsUpdateArgs): Promise<ExecutedTx> {
    await this.beforeAnyAction();

    const deviationAccount = this.deviationClient.wallet().getBaseAccount();

    if (!deviationAccount) throw new Error(`${this.loggerPrefix} empty deviation wallet`);

    const [targetAddress, blockNumber] = await Promise.all([this.resolveAddress(), this.provider.getBlockNumber()]);

    const estimateGas = await this.estimateGasForUpdate(targetAddress, args);

    this.logger.info(`${this.loggerPrefix} estimatedGas: ${JSON.stringify(estimateGas)}`);

    const operationId = await this.client.smartContracts().callSmartContract(
      {
        fee: estimateGas.minimalFees,
        maxGas: estimateGas.estimatedGas,
        coins: estimateGas.estimatedStorageCost,
        targetAddress: targetAddress,
        functionName: 'update',
        parameter: this.parseArgs(args),
      },
      deviationAccount,
    );

    return {hash: operationId, atBlock: blockNumber};
  }

  async estimateGasForUpdate(targetAddress: string, args: UmbrellaFeedsUpdateArgs): Promise<MassaEstimatedGas> {
    // max can change in the future, so le's use some safer value, simple tx should never be even close to the max
    let estimatedGas = (this.MAX_GAS * 8n) / 10n;
    let estimatedStorageCost = 0n;

    try {
      const [readOnlyCall, minimalFees] = await Promise.all([
        this.rawCall({
          targetAddress,
          targetFunction: 'update',
          parameter: this.parseArgs(args),
          gas: this.MAX_GAS,
        }),
        (this.provider as MassaProvider).getMinimalFee(),
      ]);

      const gasMargin = 12n; // 1.2;
      estimatedGas = (BigInt(readOnlyCall.info.gas_cost) * gasMargin) / 10n;

      const prefix = 'Estimated storage cost: ';
      const filteredEvent = readOnlyCall.info.output_events.find((e: {data: string}) => e.data.includes(prefix));

      if (filteredEvent) {
        const storageCostMargin = 11n; // 1.1
        estimatedStorageCost = (BigInt(filteredEvent.data.slice(prefix.length)) * storageCostMargin) / 10n;
        this.logger.debug(`${this.loggerPrefix} estimated storage cost: ${estimatedStorageCost}`);
      } else {
        this.logger.error(`${this.loggerPrefix} Failed to get storage cost: no event`);
      }

      estimatedGas = estimatedGas > this.MAX_GAS ? this.MAX_GAS : estimatedGas;
      this.logger.debug(`${this.loggerPrefix} estimated gas: ${estimatedGas}, fees: ${minimalFees}`);

      return {
        minimalFees,
        estimatedGas,
        estimatedStorageCost,
      };
    } catch (e: unknown) {
      this.logger.error(`${this.loggerPrefix} Failed to get dynamic gas cost for update: ${(e as Error).message}`);
      throw e;
    }
  }

  protected resolveContract = async (): Promise<undefined> => {
    throw new Error(`${this.loggerPrefix} resolveContract not implemented`);
  };

  protected async rawCall(params: {
    targetAddress?: string;
    targetFunction: string;
    parameter?: Array<number> | Args;
    gas?: bigint;
  }): Promise<IContractReadOperationResponse> {
    await this.beforeAnyAction();
    const targetAddress = params.targetAddress || (await this.registry.getAddress(this.umbrellaFeedsName));

    return this.client.smartContracts().readSmartContract({
      maxGas: params.gas || this.MAX_GAS,
      targetAddress: targetAddress,
      targetFunction: params.targetFunction,
      parameter: params.parameter || [],
    });
  }

  protected serializeFeedsNames(keys: string[]): MassaWBytesSerializer[] {
    return this.serializeKeys(keys.map((k) => hashFeedName(k)));
  }

  protected serializeKeys(keysBytes32: string[]): MassaWBytesSerializer[] {
    return keysBytes32.map((bytes32) => new MassaWBytesSerializer(bytes32));
  }

  protected serializePriceDatas(datas: PriceData[]): MassaPriceDataSerializer[] {
    return datas.map((data) => new MassaPriceDataSerializer(data.data, data.heartbeat, data.timestamp, data.price));
  }

  protected sortSignatures(signatures: string[]): {sortedSignatures: string[]; publicKeys: string[]} {
    const VALIDATOR_0: string = 'P12W6zgQb5aykbYSz4CfQLuk3axRcp5jYX1fmBT7VRdgVnzv6oHH';
    const VALIDATOR_1: string = 'P1QV6AsrtPdZqk9BVyMMfFCDgYEaMaSBatnCk8xs1jJzcMGNeFa';

    const sorted = signatures
      // TODO remove this once sorting for massa will be fixed
      .filter((pk) => {
        const addr = pk.split('@')[0];
        return [VALIDATOR_0, VALIDATOR_1].includes(addr);
      })
      .sort((a, b) => {
        const addr1 = a.split('@')[0];
        const addr2 = b.split('@')[0];
        return MassaAddress.sort(addr1, addr2);
      });

    const sortedSignatures: string[] = [];
    const publicKeys: string[] = [];

    sorted.forEach((as) => {
      const [a, s] = as.split('@');
      publicKeys.push(a);
      sortedSignatures.push(s);
    });

    return {sortedSignatures, publicKeys};
  }

  protected parseArgs(args: UmbrellaFeedsUpdateArgs): number[] {
    const {sortedSignatures, publicKeys} = this.sortSignatures(args.signatures);

    const updateArgs = new Args();
    updateArgs.addSerializableObjectArray(this.serializeFeedsNames(args.keys));
    updateArgs.addSerializableObjectArray(this.serializePriceDatas(args.priceDatas));
    updateArgs.addArray(sortedSignatures, ArrayTypes.STRING);
    updateArgs.addArray(publicKeys, ArrayTypes.STRING);

    return updateArgs.serialize();
  }

  private async beforeAnyAction(): Promise<void> {
    if (this.client) return;

    const {id} = await (this.provider as MassaProvider).getNetwork();
    const providerUrl = (this.provider as MassaProvider).providerUrl;

    this.client = await ClientFactory.createCustomClient(
      [{url: providerUrl, type: ProviderType.PUBLIC} as IProvider],
      BigInt(id),
      true,
    );

    if (!this.blockchain.deviationWallet) throw new Error(`${this.loggerPrefix} deviation wallet empty`);

    this.deviationClient = await ClientFactory.createCustomClient(
      [{url: (this.provider as MassaProvider).providerUrl, type: ProviderType.PUBLIC} as IProvider],
      BigInt(id),
      true,
      await this.blockchain.deviationWallet.getRawWallet(),
    );

    this.logger.info(`${this.loggerPrefix} clients initialised`);
  }
}
