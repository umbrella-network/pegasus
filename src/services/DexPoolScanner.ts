import {injectable} from 'inversify';
import {Logger} from 'winston';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {MappingRepository} from '../repositories/MappingRepository.js';
import {BlockchainProviderRepository} from '../repositories/BlockchainProviderRepository.js';
import {DexProtocolFactory, PoolCreatedEvent} from '../factories/DexProtocolFactory.js';
import {DexProtocolInterface} from '../interfaces/DexProtocolInterface.js';
import {DexRepository} from '../repositories/DexRepository.js';
import Application from '../lib/Application.js';
import Settings from '../types/Settings.js';

export type Result = {
  fromBlock: number;
  toBlock?: number;
  success: boolean;
  synchronized?: boolean;
  waitBlockRange?: boolean;
};

export type UniswapPoolCreatedEvent = {
  token0: string;
  token1: string;
  fee: bigint;
  pool: string;
  anchor: number;
};

@injectable()
export class DexPoolScanner {
  logger: Logger;
  settings: Settings;
  mappingRepository!: MappingRepository;
  blockchainProviderRepository!: BlockchainProviderRepository;
  dexRepository!: DexRepository;

  startBlock: number;
  dexProtocolName!: DexProtocolName;
  step: number;
  provider: StaticJsonRpcProvider | undefined;
  chainId!: ChainsIds;
  dexProtocol: DexProtocolInterface;
  logPrefix: string;

  constructor(chainId: ChainsIds, dexProtocolName: DexProtocolName) {
    this.blockchainProviderRepository = Application.get(BlockchainProviderRepository);
    this.mappingRepository = Application.get(MappingRepository);
    this.dexRepository = Application.get(DexRepository);
    this.provider = <StaticJsonRpcProvider>this.blockchainProviderRepository.get(chainId);
    this.dexProtocol = DexProtocolFactory.create(chainId, dexProtocolName, this.provider);
    this.settings = Application.get('Settings');
    this.logger = Application.get('Logger');
    this.step = 0;
    this.logPrefix = `[DexPoolScanner][${chainId}][${dexProtocolName}]`;

    if (!chainId || !dexProtocolName) {
      throw new Error(`${this.logPrefix} chainId or dexProtocolName not set`);
    }

    this.chainId = chainId;
    this.dexProtocolName = dexProtocolName;

    if (!this.settings.blockchains[chainId].providerUrl.join('')) {
      throw new Error(`${this.logPrefix} provider URL not set`);
    }

    const startBlock = this.settings.dexes[chainId]?.[dexProtocolName]?.startBlock;

    if (!startBlock || Number(startBlock) <= 0) {
      throw new Error(`${this.logPrefix} startBlock must be higher than 0`);
    }

    this.startBlock = startBlock!;
    this.step = this.settings.dexes[chainId]?.[dexProtocolName]?.agentStep || 0;
  }

  async run(): Promise<Result> {
    const fromBlock = await this.getMarker();

    if (!this.provider) {
      throw new Error(`${this.logPrefix} run: no provider`);
    }

    const currentBlock = await this.provider.getBlockNumber();
    const blocksToScan = currentBlock - fromBlock;

    if (blocksToScan < this.step - 1) {
      this.logger.debug(`${this.logPrefix} fromBlock: ${fromBlock}, currentBlock: ${currentBlock}, step: ${this.step}`);
      return {fromBlock, success: false, waitBlockRange: true};
    }

    const toBlock = this.getToBlock(fromBlock, currentBlock);

    let success = false;

    try {
      success = await this.apply(fromBlock, toBlock);
    } catch (e) {
      console.log(`${this.logPrefix} ${e}`);
    }

    if (success) await this.updateMarker(toBlock);
    return {fromBlock, toBlock, success};
  }

  private async apply(fromBlock: number, toBlock: number): Promise<boolean> {
    const events = await this.getPoolCreatedEvents(fromBlock, toBlock);
    if (events.length == 0) return true;

    const addresses = events.map((e) => [e.token1, e.token0]).flat();
    const sortedEventsByToken = this.sortArrayByTokens(events);

    for (let i = 0; i < sortedEventsByToken.length; i++) {
      try {
        const event = sortedEventsByToken[i];
        const fee = Number(event.fee);
        const pool = String(event.pool);

        this.logger.info(`${this.logPrefix} Saving token0: ${event.token0}, token1: ${event.token1}. From ${pool}`);

        await this.dexRepository.upsert({
          chainId: this.chainId,
          dexProtocol: this.dexProtocolName,
          token0: event.token0.toLocaleLowerCase(),
          token1: event.token1.toLocaleLowerCase(),
          pool,
          fee,
        });
      } catch (e) {
        this.logger.error(`${this.logPrefix} Could not get a valid symbol for addresses ${addresses} ${e}`);
        return false;
      }
    }

    return true;
  }

  private async getPoolCreatedEvents(fromBlock: number, toBlock: number): Promise<PoolCreatedEvent[]> {
    this.logger.info(`${this.logPrefix} Scanning for Uniswap events between ${fromBlock} to ${toBlock}`);
    const events = await this.dexProtocol.getPoolCreatedEvents(fromBlock, toBlock);
    this.logger.info(`${this.logPrefix} Got ${events.length} new Uniswap pools.`);
    this.logger.debug(`${this.logPrefix} Events: ${JSON.stringify(events)}`);
    return events;
  }

  private sortArrayByTokens(events: PoolCreatedEvent[]) {
    return events.sort((a, b) => {
      const tokenA0 = a.token0.toLowerCase();
      const tokenA1 = a.token1.toLowerCase();
      const tokenB0 = b.token0.toLowerCase();
      const tokenB1 = b.token1.toLowerCase();

      if (tokenA0 === tokenA1 || tokenB0 === tokenB1) {
        throw new Error(`${this.logPrefix} tokens are the same, pool: ${a.pool}`);
      } else {
        return tokenA0.localeCompare(tokenB0);
      }
    });
  }

  private getToBlock(fromBlock: number, latestBlock: number): number {
    const stepBlock = fromBlock + this.step - 1;
    return latestBlock > stepBlock ? stepBlock : latestBlock;
  }

  private async getMarker(): Promise<number> {
    const latestSyncedBlock = await this.mappingRepository.get(this.getId());
    return latestSyncedBlock ? Number(latestSyncedBlock) + 1 : this.startBlock;
  }

  private async updateMarker(blockHeight: number): Promise<void> {
    await this.mappingRepository.set(this.getId(), String(blockHeight));
  }

  private getId() {
    return `${this.chainId}-${this.dexProtocolName}`;
  }
}
