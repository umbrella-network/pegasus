import {injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository.js';
import {DexProtocolName} from '../../../types/DexProtocolName.js';
import Application from '../../../lib/Application.js';
import Settings from 'src/types/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class ContractHelper {
  readonly ABI!: {abi: never};
  readonly contractAddress: string = '';
  readonly provider: StaticJsonRpcProvider;
  readonly chainId: ChainsIds;
  contract?: Contract;
  logPrefix: string;

  constructor(chainId: ChainsIds, nameABI: string) {
    const blockchainProviderRepository = Application.get(BlockchainProviderRepository);
    const settings = Application.get<Settings>('Settings');
    this.chainId = chainId;
    this.logPrefix = `[ContractHelper][${chainId}][${nameABI}]`;
    this.ABI = JSON.parse(readFileSync(__dirname + `/${nameABI}.abi.json`, 'utf-8'));
    this.contractAddress = settings.dexes[chainId]?.[DexProtocolName.UNISWAP_V3]?.helperContractId || '';
    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get(this.chainId);
  }

  getContract() {
    if (this.contract) {
      return this.contract;
    }

    try {
      this.contract = new Contract(this.contractAddress, this.ABI?.abi, this.provider);
    } catch (e) {
      throw new Error(`${this.logPrefix} failed to connect to helper ${e}`);
    }

    return this.contract;
  }
}
