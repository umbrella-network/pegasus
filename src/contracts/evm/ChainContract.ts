import {Contract} from 'ethers';
import {TransactionResponse} from '@ethersproject/providers';
import {ContractRegistry} from '@umb-network/toolbox';
import {PayableOverrides} from '@ethersproject/contracts';
import {Logger} from "winston";

import chainAbi from './Chain.abi.json';
import Settings from '../../types/Settings';
import Blockchain from '../../lib/Blockchain';
import {ChainStatus} from '../../types/ChainStatus';
import {Validator} from '../../types/Validator';
import {ChainSubmitArgs} from '../../types/ChainSubmit';
import {ChainsIds, NonEvmChainsIds} from '../../types/ChainsIds';
import {ExecutedTx} from "../../types/Consensus";
import logger from '../../lib/logger';

class ChainContract {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(settings: Settings, blockchain: Blockchain) {
    this.logger = logger;
    this.settings = settings;
    this.blockchain = blockchain;
    this.loggerPrefix = `[${this.blockchain.chainId}][ChainContract]`

    if (NonEvmChainsIds.includes(this.blockchain.chainId as ChainsIds)) {
      throw new Error(`[ChainContract] ${this.blockchain.chainId} not supported`);
    }
  }

  async address(): Promise<string> {
    return this.resolveAddress();
  }

  async requiredSignatures(): Promise<number> {
    const contract = await this.resolveContract();
    if (!contract) throw new Error(`${this.loggerPrefix} requiredSignatures: can not resolve contract`);

    return contract.callStatic.requiredSignatures();
  }

  async resolveStatus(): Promise<[address: string, status: ChainStatus]> {
    const contract = await this.resolveContract();
    if (!contract) throw new Error(`${this.loggerPrefix} resolveStatus: can not resolve contract`);
    return Promise.all([contract.address, contract.getStatus()]);
  }

  resolveValidators(chainStatus: ChainStatus): Validator[] {
    return chainStatus.validators.map((address, i) => {
      return {
        id: address.toLowerCase(),
        location: chainStatus.locations[i],
        power: chainStatus.powers[i],
      };
    });
  }

  async submit(args: ChainSubmitArgs, payableOverrides: PayableOverrides): Promise<ExecutedTx> {
    const contract =  await this.resolveContract();
    if (!contract) throw new Error(`${this.loggerPrefix} can not resolve contract`);

    const txResponse: TransactionResponse = await contract
      .connect(this.blockchain.wallet.getRawWallet())
      .submit(args.dataTimestamp, args.root, args.keys, args.values, args.v, args.r, args.s, payableOverrides);

    this.logger.info(`${this.loggerPrefix} tx nonce: ${txResponse.nonce}, hash: ${txResponse.hash}`);
    const atBlock = txResponse.blockNumber ? BigInt(txResponse.blockNumber) : await this.blockchain.getBlockNumber();

    return {hash: txResponse.hash, atBlock};
  }

  async estimateGasForSubmit(args: ChainSubmitArgs): Promise<bigint> {
    const contract = await this.resolveContract();
    if (!contract) return 0n;

    const gas = await contract
      .connect(this.blockchain.wallet.getRawWallet())
      .estimateGas.submit(args.dataTimestamp, args.root, args.keys, args.values, args.v, args.r, args.s);

    return gas.toBigInt();
  }

  resolveContract = async (): Promise<Contract | undefined> => {
    try {
      if (!this.registry) {
        this.registry = new ContractRegistry(
          this.blockchain.provider.getRawProvider(),
          this.blockchain.getContractRegistryAddress(),
        );
      }

      const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
      return new Contract(chainAddress, chainAbi, this.blockchain.provider.getRawProvider());
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} ChainContract resolveContract error: ${e.message}`)
      return;
    }
  };

  protected async resolveAddress(): Promise<string> {
    const contract =  await this.resolveContract();
    return contract?.address || '';
  }
}

export default ChainContract;
