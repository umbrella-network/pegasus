import {Contract, ethers} from 'ethers';
import {Logger} from 'winston';
import {ContractRegistry} from '@umb-network/toolbox';
import {PayableOverrides} from '@ethersproject/contracts';
import {TransactionResponse} from '@ethersproject/providers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import Settings from '../../../types/Settings.js';
import Blockchain from '../../../lib/Blockchain.js';
import {PriceData, PriceDataWithKey, Signature, UmbrellaFeedsUpdateArgs} from '../../../types/DeviationFeeds.js';
import {UmbrellaFeedInterface} from '../../../interfaces/UmbrellaFeedInterface.js';
import {ExecutedTx} from '../../../types/Consensus.js';
import logger from '../../../lib/logger.js';
import {EvmEstimatedGas} from '../evmTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FeedContract implements UmbrellaFeedInterface {
  protected umbrellaFeedsAbi!: {abi: never};
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(settings: Settings, blockchain: Blockchain) {
    this.logger = logger;
    this.settings = settings;
    this.blockchain = blockchain;
    this.loggerPrefix = `[${this.blockchain.chainId}][FeedContract]`;
    this.umbrellaFeedsAbi = JSON.parse(readFileSync(__dirname + '/UmbrellaFeeds.abi.json', 'utf-8')) as never;
  }

  async address(): Promise<string> {
    return this.resolveAddress();
  }

  async update(args: UmbrellaFeedsUpdateArgs, payableOverrides: PayableOverrides): Promise<ExecutedTx> {
    if (!this.blockchain.deviationWallet) {
      throw new Error(`${this.loggerPrefix} deviationWallet empty for ${this.blockchain.chainId}`);
    }

    const signatures = await this.splitSignatures(args.signatures);

    const contract = await this.resolveContract();

    if (!contract) {
      return {
        hash: '',
        atBlock: 0n,
      };
    }

    const txResponse: TransactionResponse = await contract
      .connect(this.blockchain.deviationWallet.getRawWallet())
      .update(args.keys, args.priceDatas, signatures, payableOverrides);

    this.logger.info(`${this.loggerPrefix} tx nonce: ${txResponse.nonce}, hash: ${txResponse.hash}`);
    const atBlock = txResponse.blockNumber ? BigInt(txResponse.blockNumber) : await this.blockchain.getBlockNumber();

    return {hash: txResponse.hash, atBlock};
  }

  async getManyPriceDataRaw(keys: string[]): Promise<PriceDataWithKey[] | undefined> {
    try {
      const contract = await this.resolveContract();
      if (!contract) return;

      const pricesData = await contract.callStatic.getManyPriceDataRaw(keys.map(ethers.utils.id));

      return pricesData.map((data: PriceDataWithKey, i: number): PriceDataWithKey => {
        return {
          ...data,
          price: BigInt(data.price.toString()),
          key: keys[i],
        };
      });
    } catch (e: unknown) {
      this.logger.error(`${this.loggerPrefix} FeedContract, getManyPriceDataRaw error: ${(e as Error).message}`);
      return;
    }
  }

  async hashData(bytes32Keys: string[], priceDatas: PriceData[]): Promise<string> {
    const contract = await this.resolveContract();
    if (!contract) throw new Error(`${this.loggerPrefix} hashData failed`);

    return contract.callStatic.hashData(bytes32Keys, priceDatas);
  }

  async requiredSignatures(): Promise<number> {
    const contract = await this.resolveContract();
    if (!contract) throw new Error(`${this.loggerPrefix} requiredSignatures failed`);

    return contract.callStatic.REQUIRED_SIGNATURES();
  }

  async estimateGasForUpdate(args: UmbrellaFeedsUpdateArgs): Promise<EvmEstimatedGas> {
    if (!this.blockchain.deviationWallet) {
      throw new Error(`[FeedContract] deviationWallet empty for ${this.blockchain.chainId}`);
    }

    const contract = await this.resolveContract();
    if (!contract) return {gasLimit: 0n};

    const gasLimit = await contract
      .connect(this.blockchain.deviationWallet.getRawWallet())
      .estimateGas.update(args.keys, args.priceDatas, await this.splitSignatures(args.signatures));

    return {gasLimit: gasLimit.toBigInt()};
  }

  protected resolveContract = async (): Promise<Contract | undefined> => {
    try {
      if (!this.registry) {
        this.registry = new ContractRegistry(
          this.blockchain.provider.getRawProvider(),
          this.blockchain.getContractRegistryAddress(),
        );
      }

      const address = await this.registry.getAddress(this.settings.blockchain.contracts.feeds.name);

      if (address === ethers.constants.AddressZero) {
        this.logger.error(
          `[${this.blockchain.chainId}] empty address for ${this.settings.blockchain.contracts.feeds.name}`,
        );

        return;
      }

      return new Contract(address, this.umbrellaFeedsAbi.abi, this.blockchain.provider.getRawProvider());
    } catch (e: unknown) {
      this.logger.error(`${this.loggerPrefix} resolveContract error: ${(e as Error).message}`);
      return;
    }
  };

  protected splitSignatures = async (signatures: string[]): Promise<Signature[]> => {
    return signatures
      .map((signature) => ethers.utils.splitSignature(signature))
      .map((s): Signature => {
        return <Signature>{
          v: s.v,
          r: s.r,
          s: s.s,
        };
      });
  };

  async resolveAddress(): Promise<string> {
    const contract = await this.resolveContract();
    return contract?.address || '';
  }
}
