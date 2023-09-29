import BigNumber from "bignumber.js";
import {Logger} from "winston";
import axios from "axios";

import {
  AbiRegistry,
  Address,
  BigUIntValue,
  BytesValue,
  ContractFunction,
  IGasLimit,
  Interaction,
  ITransactionPayload,
  List,
  NumericalValue,
  ResultsParser,
  SmartContract,
  Struct,
  Tuple,
  U32Value
} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {PayableOverrides} from "@ethersproject/contracts";

import {VariadicValue} from "@multiversx/sdk-core/out/smartcontracts/typesystem/variadic";
import {ContractQueryResponse} from "@multiversx/sdk-network-providers/out/contractQueryResponse";
import {TypedValue} from "@multiversx/sdk-core/out/smartcontracts/typesystem";
import {UserSigner} from "@multiversx/sdk-wallet/out";
import {Signature} from "@multiversx/sdk-core/out/signature";

import {RegistryContractFactory} from '../../factories/contracts/RegistryContractFactory';
import Blockchain from '../../lib/Blockchain';
import {RegistryInterface} from '../interfaces/RegistryInterface';
import umbrellaFeedsAbi from './umbrella-feeds.abi.json'
import {UmbrellaFeedInterface} from "../interfaces/UmbrellaFeedInterface";
import {PriceData, PriceDataWithKey, UmbrellaFeedsUpdateArgs} from "../../types/DeviationFeeds";

import {MultiversXAddress} from "../../services/tools/MultiversXAddress";
import {ExecutedTx} from "../../types/Consensus";
import logger from '../../lib/logger';
import {MultiversXProvider} from "../../lib/providers/MultiversXProvider";


export class UmbrellaFeedsMultiversX implements UmbrellaFeedInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly umbrellaFeedsName!: string;
  readonly blockchain!: Blockchain;
  registry!: RegistryInterface;

  constructor(blockchain: Blockchain, umbrellaFeedsName = 'UmbrellaFeeds') {
    this.logger = logger;
    this.umbrellaFeedsName = umbrellaFeedsName;
    this.blockchain = blockchain;
    this.loggerPrefix = `[${this.blockchain.chainId}][UmbrellaFeedsMultiversX]`
  }

  resolveAddress(): Promise<string> {
    return this.address();
  }
  async address(): Promise<string> {
    const contract = await this.resolveContract();
    return contract ? contract.getAddress().bech32() : '';
  }

  chainId(): string {
    return this.blockchain.chainId;
  }

  async hashData(bytes32Keys: string[], priceDatas: PriceData[]): Promise<string> {
    const args = this.parseDataForHashing(bytes32Keys, priceDatas);
    const response = await this.apiCall('hashData', args);
    if (!response) throw new Error(`${this.loggerPrefix} hashData failed`)

    const parsedResponse = new ResultsParser().parseUntypedQueryResponse(response);
    return '0x' + parsedResponse.values[0].toString('hex');
  }

  async requiredSignatures(): Promise<number> {
    const response = await this.apiCall('required_signatures');
    if (!response) throw new Error(`${this.loggerPrefix} requiredSignatures failed`)

    const parsedResponse = new ResultsParser().parseUntypedQueryResponse(response);
    return parseInt(parsedResponse.values[0].toString('hex'), 16);
  }

  async getManyPriceDataRaw(bytes32Keys: string[]): Promise<PriceDataWithKey[] | undefined> {
    try {
      const response = await this.apiCall('getManyPriceDataRaw', bytes32Keys.map(k => new BytesValue(this.bufferFromString(k))));
      if (!response) return;

      const endpointDefinition = AbiRegistry.create(umbrellaFeedsAbi).getEndpoint('getManyPriceDataRaw');
      const parsedResponse = new ResultsParser().parseQueryResponse(response, endpointDefinition);

      const items = (parsedResponse.values as VariadicValue[])[0].getItems() as Struct[];

      return items.map((values, i) => {
        const fields = values.getFields();
        const [heartbeat, timestamp, price] = fields as unknown as [NumericalValue, NumericalValue, NumericalValue];

        return <PriceDataWithKey>{
          data: 0,
          heartbeat: parseInt(heartbeat.value.toString(10)),
          timestamp: parseInt(timestamp.value.toString(10)),
          price: BigInt(new BigNumber(price.value).toFixed()),
          key: bytes32Keys[i],
        };
      });
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} getManyPriceDataRaw error: ${e.message}`)
      return;
    }
  }

  async update(args: UmbrellaFeedsUpdateArgs, payableOverrides: PayableOverrides): Promise<ExecutedTx> {
    const contract = await this.resolveContract();

    if (!contract) {
      return {
        hash: '',
        atBlock: 0n
      }
    }

    const deviationWallet = this.blockchain.deviationWallet;
    if (!deviationWallet) throw new Error(`${this.loggerPrefix} deviationWallet not set`);

    const multiversXWallet = deviationWallet.getRawWallet<UserSigner>();

    // TODO GAS
    const parsedArgs = this.parseDataForUpdate(args);
    const singleDataGasLimit = 13_000_000; // 13M for initial tx for full data!
    const otherDataGasLimit = 1_000_000;

    const [nonce, chainID] = await Promise.all([
      deviationWallet.getNextNonce(),
      (this.blockchain.provider as MultiversXProvider).getChainID()
    ]);

    const updateTransaction = contract.methods.update(parsedArgs)
      .withSender(multiversXWallet.getAddress())
      .withNonce(nonce)
      // .withGasLimit(singleDataGasLimit + ((args.keys.length - 1) * otherDataGasLimit))
      .withChainID(chainID)
      .buildTransaction();

    const gasLimit = await this.estimateCost(contract.getAddress().bech32(), updateTransaction.getData(), chainID, nonce);

    updateTransaction.setGasLimit(gasLimit);

    const toSign = updateTransaction.serializeForSigning();
    const txSignature = await multiversXWallet.sign(toSign);

    updateTransaction.applySignature(Signature.fromBuffer(txSignature));

    const apiNetworkProvider = this.blockchain.provider.getRawProvider<ApiNetworkProvider>();

    const hash = await apiNetworkProvider.sendTransaction(updateTransaction);
    const atBlock = await this.blockchain.getBlockNumber();

    return {hash, atBlock};
  }

  async estimateGasForUpdate(args: UmbrellaFeedsUpdateArgs): Promise<bigint> {
    throw new Error(`${this.loggerPrefix} estimateGasForUpdate: use estimateCost()`);
  }

  async estimateCost(receiver: string, payload: ITransactionPayload, chainID: string, nonce: number): Promise<IGasLimit> {
    const provider = this.blockchain.provider as MultiversXProvider;
    const costUrl = `${provider.getProviderUrl()}/transaction/cost`;

    const data = {
      "value": "0",
      "receiver": receiver,
      "sender": this.blockchain.deviationWallet?.address || '',
      "data": payload.encoded(),
      "chainID": chainID,
      "version": 1,
      "nonce": nonce
    }

    const res = await axios.post(costUrl, data);

    const gas = parseInt(res.data.data.txGasUnits, 10);

    if (gas == 0 && res.data.data.returnMessage) {
      this.logger.error(`gas: ${JSON.stringify(res.data)}`);
      throw new Error(`${this.loggerPrefix} estimateCost error: ${res.data.data.returnMessage}`)
    }

    return {
      valueOf(): number {
        return gas;
      }
    };
  }

  protected resolveContract = async (): Promise<SmartContract | undefined> => {
    try {
      if (!this.registry) {
        this.registry = RegistryContractFactory.create(this.blockchain);
      }

      const umbrellaFeedsAddress = await this.registry.getAddress(this.umbrellaFeedsName);
      return new SmartContract({address: new Address(umbrellaFeedsAddress), abi: AbiRegistry.create(umbrellaFeedsAbi)});
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} resolveContract error: ${e.message}`)
      return;
    }
  };

  protected async apiCall(functionName: string, args: TypedValue[] = []): Promise<ContractQueryResponse | undefined> {
    const contract = await this.resolveContract();
    if (!contract) return ;

    const query = new Interaction(contract, new ContractFunction(functionName), args).buildQuery();
    return this.blockchain.provider.getRawProvider<ApiNetworkProvider>().queryContract(query);
  }

  protected parseDataForHashing(bytes32Keys: string[], priceDatas: PriceData[]): TypedValue[] {
    return [
      List.fromItems(bytes32Keys.map(k => new BytesValue(Buffer.from(k.replace('0x', ''), 'hex')))),
      List.fromItems(priceDatas.map(priceData =>
        Tuple.fromItems([
          new U32Value(priceData.heartbeat),
          new U32Value(priceData.timestamp),
          new BigUIntValue(priceData.price.toString()),
        ])))
    ];
  }

  protected parseDataForUpdate(args: UmbrellaFeedsUpdateArgs): TypedValue[] {
    return [
      VariadicValue.fromItemsCounted(...args.keys.map(k => new BytesValue(this.bufferFromString(k)))),
      VariadicValue.fromItemsCounted(...args.priceDatas.map(priceData =>
        Tuple.fromItems([
          new U32Value(priceData.heartbeat),
          new U32Value(priceData.timestamp),
          new BigUIntValue(priceData.price.toString()),
        ]))),

      VariadicValue.fromItemsCounted(...this.sortSignatures(args.signatures).map(s => {
        const [publicAddress, signature] = s.split('@');
          return new BytesValue(Buffer.concat([MultiversXAddress.toBuffer(publicAddress), this.bufferFromString(signature)]));
        }
      )),
    ];
  }

  protected sortSignatures(signatures: string[]): string[] {
    return signatures.sort((a, b) => {
      const addr1 = a.split('@')[0];
      const addr2 = b.split('@')[0];
      return MultiversXAddress.sort(addr1, addr2);
    });
  }

  protected bufferFromString(s: string): Buffer {
    return Buffer.from(s.replace('0x', ''), 'hex');
  }
}

