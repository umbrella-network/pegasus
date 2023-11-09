import {Contract, ethers} from 'ethers';
import {Logger} from 'winston';
import {ContractRegistry} from '@umb-network/toolbox';
import {PayableOverrides} from '@ethersproject/contracts';
import {TransactionResponse} from '@ethersproject/providers';

import umbrellaFeedsAbi from './UmbrellaFeeds.abi.json';
import Settings from '../../../types/Settings';
import Blockchain from '../../../lib/Blockchain';
import {PriceData, PriceDataWithKey, Signature, UmbrellaFeedsUpdateArgs} from '../../../types/DeviationFeeds';
import {UmbrellaFeedInterface} from '../../../interfaces/UmbrellaFeedInterface';
import {ExecutedTx} from '../../../types/Consensus';
import logger from '../../../lib/logger';
import {EvmEstimatedGas} from '../evmTypes';

export class FeedContract implements UmbrellaFeedInterface {
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
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} FeedContract, getManyPriceDataRaw error: ${e.message}`);
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

      return new Contract(address, umbrellaFeedsAbi.abi, this.blockchain.provider.getRawProvider());
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} resolveContract error: ${e.message}`);
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
