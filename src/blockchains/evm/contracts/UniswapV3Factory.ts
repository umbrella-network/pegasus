import {Contract, ethers} from 'ethers';
import {injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import Settings from '../../../types/Settings.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {DexProtocolName} from '../../../types/DexProtocolName.js';
import {PoolCreatedEvent} from '../../../factories/DexProtocolFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class UniswapV3Factory {
  protected ABI!: never;

  readonly settings: Settings;
  readonly contractAddress?: string = '';
  readonly provider!: StaticJsonRpcProvider;
  readonly contract!: Contract;

  constructor(chainId: ChainsIds, settings: Settings, provider: StaticJsonRpcProvider) {
    this.settings = settings;
    this.contractAddress = settings.dexes[chainId]?.[DexProtocolName.UNISWAP_V3]?.scannerContractId;

    if (!this.contractAddress || !settings.blockchains[chainId].providerUrl.join('')) {
      throw Error(`[UniswapV3PoolScanner][${chainId}] uniswapV3Factory creation failed`);
    }

    this.ABI = JSON.parse(readFileSync(__dirname + '/UniswapV3Factory.abi.json', 'utf-8')) as never;
    this.contract = new Contract(this.contractAddress, this.ABI, provider);
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
