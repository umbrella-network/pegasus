import {Contract, ethers} from 'ethers';
import {inject, injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository.js';
import Settings from '../../../types/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type PoolCreatedEvent = {
  token0: string;
  token1: string;
  fee: bigint;
  pool: string;
  anchor: number;
};

@injectable()
export class UniswapV3Factory {
  protected ABI!: never;

  readonly contractId: string = '';
  readonly provider!: StaticJsonRpcProvider;
  readonly contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    const blockchainKey = 'ethereum';

    if (!settings.api.uniswap.scannerContractId || !settings.blockchains[blockchainKey].providerUrl.join('')) {
      return;
    }

    this.ABI = JSON.parse(readFileSync(__dirname + '/UniswapV3Factory.abi.json', 'utf-8')) as never;

    this.contractId = settings.api.uniswap.scannerContractId;
    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get(blockchainKey);
    this.contract = new Contract(this.contractId, this.ABI, this.provider);
  }

  async getPoolCreatedEvents(fromBlock: number, toBlock?: number): Promise<PoolCreatedEvent[]> {
    const events = await this.contract.queryFilter(
      {
        topics: [ethers.utils.id('PoolCreated(address,address,uint24,int24,address)')],
      },
      fromBlock,
      toBlock,
    );

    return events.map((e) => this.deserializePoolCreatedEvents(e));
  }

  private deserializePoolCreatedEvents(event: ethers.Event): PoolCreatedEvent {
    const parsedEvent = this.contract.interface.parseLog(event);

    return {
      token0: parsedEvent.args[0],
      token1: parsedEvent.args[1],
      fee: parsedEvent.args[2],
      pool: parsedEvent.args[4],
      anchor: event.blockNumber,
    };
  }
}
