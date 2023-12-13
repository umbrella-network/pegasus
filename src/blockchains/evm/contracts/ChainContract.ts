import {Contract} from 'ethers';
import {TransactionResponse} from '@ethersproject/providers';
import {ContractRegistry} from '@umb-network/toolbox';
import {PayableOverrides} from '@ethersproject/contracts';
import {Logger} from 'winston';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import Settings from '../../../types/Settings.js';
import Blockchain from '../../../lib/Blockchain.js';
import {ChainStatus} from '../../../types/ChainStatus.js';
import {Validator} from '../../../types/Validator.js';
import {ChainSubmitArgs} from '../../../types/ChainSubmit.js';
import {ChainsIds, NonEvmChainsIds} from '../../../types/ChainsIds.js';
import {ExecutedTx} from '../../../types/Consensus.js';
import logger from '../../../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChainContract {
  protected chainAbi!: never;
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(settings: Settings, blockchain: Blockchain) {
    this.logger = logger;
    this.settings = settings;
    this.blockchain = blockchain;
    this.loggerPrefix = `[${this.blockchain.chainId}][ChainContract]`;

    if (NonEvmChainsIds.includes(this.blockchain.chainId as ChainsIds)) {
      throw new Error(`[ChainContract] ${this.blockchain.chainId} not supported`);
    }

    this.chainAbi = JSON.parse(readFileSync(__dirname + '/Chain.abi.json', 'utf-8')) as never;
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
    const contract = await this.resolveContract();
    if (!contract) throw new Error(`${this.loggerPrefix} can not resolve contract`);

    const txResponse: TransactionResponse = await contract
      .connect(this.blockchain.wallet.getRawWalletSync())
      .submit(args.dataTimestamp, args.root, args.keys, args.values, args.v, args.r, args.s, payableOverrides);

    this.logger.info(`${this.loggerPrefix} tx nonce: ${txResponse.nonce}, hash: ${txResponse.hash}`);
    const atBlock = txResponse.blockNumber ? BigInt(txResponse.blockNumber) : await this.blockchain.getBlockNumber();

    return {hash: txResponse.hash, atBlock};
  }

  async estimateGasForSubmit(args: ChainSubmitArgs): Promise<bigint> {
    const contract = await this.resolveContract();
    if (!contract) return 0n;

    const gas = await contract
      .connect(this.blockchain.wallet.getRawWalletSync())
      .estimateGas.submit(args.dataTimestamp, args.root, args.keys, args.values, args.v, args.r, args.s);

    return gas.toBigInt();
  }

  resolveContract = async (): Promise<Contract | undefined> => {
    try {
      if (!this.registry) {
        this.registry = new ContractRegistry(
          this.blockchain.provider.getRawProviderSync(),
          this.blockchain.getContractRegistryAddress(),
        );
      }

      const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
      return new Contract(chainAddress, this.chainAbi, this.blockchain.provider.getRawProviderSync());
    } catch (e: unknown) {
      this.logger.error(`${this.loggerPrefix} ChainContract resolveContract error: ${(e as Error).message}`);
      return;
    }
  };

  protected async resolveAddress(): Promise<string> {
    const contract = await this.resolveContract();
    return contract?.address || '';
  }
}

export default ChainContract;
