import {Logger} from "winston";

import {PayableOverrides} from "@ethersproject/contracts";
import {Args, ArrayTypes, Client, ClientFactory, IProvider, ProviderType} from "@massalabs/massa-web3";

import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory';
import Blockchain from '../../../lib/Blockchain';
import {RegistryInterface} from '../../../interfaces/RegistryInterface';
import {UmbrellaFeedInterface} from "../../../interfaces/UmbrellaFeedInterface";
import {PriceData, PriceDataWithKey, UmbrellaFeedsUpdateArgs} from "../../../types/DeviationFeeds";

import {ExecutedTx} from "../../../types/Consensus";
import logger from '../../../lib/logger';
import {ChainsIds} from "../../../types/ChainsIds";
import {ethers} from "ethers";
import {MassaWBytesSerializer} from "../utils/MassaWBytesSerializer";
import {MassaPriceDataSerializer} from "../utils/MassaPriceDataSerializer";
import {MassaAddress} from "../utils/MassaAddress";
import {MassaProvider} from "../MassaProvider";
import {ProviderInterface} from "../../../interfaces/ProviderInterface";
import {MassaWallet} from "../MassaWallet";

export class UmbrellaFeedsMassa implements UmbrellaFeedInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly umbrellaFeedsName!: string;
  readonly provider!: ProviderInterface;
  readonly registry!: RegistryInterface;
  readonly blockchain!: Blockchain;

  protected client!: Client;
  protected deviationClient!: Client;

  constructor(blockchain: Blockchain, umbrellaFeedsName = 'UmbrellaFeeds') {
    this.logger = logger;
    this.umbrellaFeedsName = umbrellaFeedsName;
    this.loggerPrefix = `[${blockchain.chainId}][UmbrellaFeedsMassa]`;

    this.provider = blockchain.provider;
    this.registry = RegistryContractFactory.create(blockchain);
    this.blockchain = blockchain;

    this.beforeAnyAction();
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

  async hashData(bytes32Keys: string[], priceDatas: PriceData[]): Promise<string> {
    await this.beforeAnyAction();

    const parameter = new Args();
    parameter.addSerializableObjectArray(this.serializeKeys(bytes32Keys));
    parameter.addSerializableObjectArray(this.serializePriceDatas(priceDatas));

    const res = await this.rawCall({targetFunction: 'hashData', parameter, gas: 50_000_000n});
    return '0x' + Buffer.from(new Args(res).nextUint8Array()).toString('hex');
  }

  async requiredSignatures(): Promise<number> {
    await this.beforeAnyAction();

    const res = await this.rawCall({targetFunction: 'REQUIRED_SIGNATURES', gas: 10_000_000n});
    return Number(new Args(res).nextU8());
  }

  async getManyPriceDataRaw(keys: string[]): Promise<PriceDataWithKey[] | undefined> {
    if (keys.length == 0) return [];
    await this.beforeAnyAction();

    const parameter = new Args();
    parameter.addSerializableObjectArray(this.serializeFeedsNames(keys));

    const res = await this.rawCall({targetFunction: 'getManyPriceDataRaw', parameter, gas: 10_000_000n});
    const priceDatas = new Args(res).nextSerializableObjectArray(MassaPriceDataSerializer);

    return keys.map((key, i) => {
      return <PriceDataWithKey>{
        ...priceDatas[i].get(),
        key
      }
    });
  }

  async update(args: UmbrellaFeedsUpdateArgs, payableOverrides: PayableOverrides): Promise<ExecutedTx> {
    await this.beforeAnyAction();

    const deviationAccount = this.deviationClient.wallet().getBaseAccount();

    if (!deviationAccount) throw new Error(`${this.loggerPrefix} empty deviation wallet`);

    const {sortedSignatures, publicKeys} = this.sortSignatures(args.signatures);

    const updateArgs = new Args();
    updateArgs.addSerializableObjectArray(this.serializeKeys(args.keys));
    updateArgs.addSerializableObjectArray(this.serializePriceDatas(args.priceDatas));
    updateArgs.addArray(sortedSignatures, ArrayTypes.STRING);
    updateArgs.addArray(publicKeys, ArrayTypes.STRING);

    const [targetAddress, blockNumber] = await Promise.all([
      this.resolveAddress(),
      this.provider.getBlockNumber()
    ]);

    const operationId = await this.client.smartContracts().callSmartContract(
      {
        fee: 0n,
        maxGas: payableOverrides.gasLimit ? BigInt(payableOverrides.gasLimit) : 70_000_000n,
        coins: 0n,
        targetAddress: targetAddress,
        functionName: 'update',
        parameter: updateArgs.serialize(),
      },
      deviationAccount
    );

    return {hash: operationId, atBlock: blockNumber};
  }

  async estimateGasForUpdate(args: UmbrellaFeedsUpdateArgs): Promise<bigint> {
    throw new Error(`${this.loggerPrefix} estimateGasForUpdate: use estimateCost()`);
  }

  async estimateCost(): Promise<bigint> {
    throw new Error(`${this.loggerPrefix} estimateCost()`);
  }

  protected resolveContract = async (): Promise<undefined> => {
    throw new Error(`${this.loggerPrefix} resolveContract not implemented`);
  };

  protected async rawCall(params: {targetFunction: string, parameter?: Array<number> | Args, gas?: bigint}): Promise<Uint8Array> {
    await this.beforeAnyAction();
    const targetAddress = await this.registry.getAddress(this.umbrellaFeedsName);

    const res = await this.client.smartContracts().readSmartContract({
      maxGas: params.gas || 10_000_000n,
      targetAddress: targetAddress,
      targetFunction: params.targetFunction,
      parameter: params.parameter || [],
    });

    return res.returnValue;
  }

  protected serializeFeedsNames(keys: string[]): MassaWBytesSerializer[] {
    return this.serializeKeys(keys.map(k => ethers.utils.id(k)));
  }

  protected serializeKeys(keysBytes32: string[]): MassaWBytesSerializer[] {
    return keysBytes32.map(bytes32 => new MassaWBytesSerializer(bytes32));
  }

  protected serializePriceDatas(datas: PriceData[]): MassaPriceDataSerializer[] {
    return datas
      .map(data => new MassaPriceDataSerializer(data.data, data.heartbeat, data.timestamp, data.price));
  }

  protected sortSignatures(signatures: string[]): {sortedSignatures: string[], publicKeys: string[]} {
    const sorted = signatures.sort((a, b) => {
      const addr1 = a.split('@')[0];
      const addr2 = b.split('@')[0];
      return MassaAddress.sort(addr1, addr2);
    });

    const sortedSignatures: string[] = [];
    const publicKeys: string[] = [];

    sorted.forEach(as => {
      const [a, s] = as.split('@');
      publicKeys.push(a);
      sortedSignatures.push(s);
    });

    return {sortedSignatures, publicKeys};
  }

  protected async beforeAnyAction(): Promise<void> {
    if (this.client) return;

    await (this.provider as MassaProvider).beforeAnyAction();

    this.client = await ClientFactory.createCustomClient(
      [
        { url: (this.provider as MassaProvider).providerUrl, type: ProviderType.PUBLIC } as IProvider,
      ],
      true,
    );

    await (this.blockchain.deviationWallet as MassaWallet).beforeAnyAction();

    this.deviationClient = await ClientFactory.createCustomClient(
      [
        { url: (this.provider as MassaProvider).providerUrl, type: ProviderType.PUBLIC } as IProvider,
      ],
      true,
      this.blockchain.deviationWallet?.getRawWallet()
    );

    this.logger.info(`${this.loggerPrefix} clients initialised`);
  }
}

