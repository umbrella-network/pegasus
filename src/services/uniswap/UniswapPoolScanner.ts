import {inject, injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {chunk} from 'lodash';

import Settings from '../../types/Settings';
import {UniswapV3Factory} from '../../blockchains/evm/contracts/UniswapV3Factory';
import {UniswapPoolService} from './UniswapPoolService';
import {BlockchainScanner} from '../BlockchainScanner';
import {UniswapV3Helper} from '../../blockchains/evm/contracts/UniswapV3Helper';
import {BlockchainProviderRepository} from '../../repositories/BlockchainProviderRepository';
import {Token} from '../../models/BlockchainSymbol';

export type UniswapPoolCreatedEvent = {
  token0: string;
  token1: string;
  fee: bigint;
  pool: string;
  anchor: number;
};

@injectable()
export class UniswapPoolScanner extends BlockchainScanner {
  readonly settings: Settings;
  readonly blockchainId = 'ethereum';
  readonly markerId = 'UniswapPoolScanner';

  @inject(UniswapPoolService) uniswapPoolService!: UniswapPoolService;
  @inject(UniswapV3Factory) uniswapV3Factory!: UniswapV3Factory;
  @inject(UniswapV3Helper) uniswapV3Helper!: UniswapV3Helper;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    super();

    this.settings = settings;

    if (!settings.blockchains[this.blockchainId].providerUrl.join('')) {
      return;
    }

    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get(this.blockchainId);
    this.startBlock = this.settings.api.uniswap.startBlock;
    this.step = this.settings.api.uniswap.agentStep;
  }

  async apply(fromBlock: number, toBlock: number): Promise<boolean> {
    if (!this.uniswapV3Factory.contractId) {
      this.logger.info(`[UniswapPoolScanner] not active`);
      return false;
    }

    const events = await this.getPoolCreatedEvents(fromBlock, toBlock);
    if (events.length == 0) return true;

    const addresses = events.map((e) => [e.token1, e.token0]).flat();
    const tokens = await this.getTokens(addresses);
    const tokenPairs = chunk(tokens, 2);

    for (let i = 0; i < events.length; i++) {
      try {
        const pair = tokenPairs[i];
        const event = events[i];
        const fee = Number(event.fee);
        const symbol = this.uniswapPoolService.getPoolSymbol(pair[0].symbol, pair[1].symbol);
        this.logger.info(`[UniswapPoolScanner] Saving ${symbol}`);
        await this.uniswapPoolService.upsert({symbol, tokens: pair, fee});
      } catch (e) {
        this.logger.error(`[UniswapPoolScanner] Could not get a valid symbol for tokens ${tokens}`);
      }
    }

    return true;
  }

  private async getPoolCreatedEvents(fromBlock: number, toBlock: number): Promise<UniswapPoolCreatedEvent[]> {
    this.logger.info(`[UniswapPoolScanner] Scanning for Uniswap events between ${fromBlock} to ${toBlock}`);
    const events = await this.uniswapV3Factory.getPoolCreatedEvents(fromBlock, toBlock);
    this.logger.info(`[UniswapPoolScanner] Got ${events.length} new Uniswap pools.`);
    this.logger.debug(`[UniswapPoolScanner] Events: ${JSON.stringify(events)}`);
    return events;
  }

  private async getTokens(addresses: string[]): Promise<Token[]> {
    try {
      let tokenSymbols: string[] = [];

      for (const batch of chunk(addresses, 50)) {
        const batchSymbols = await this.uniswapV3Helper.translateTokenAddressesToSymbols(batch);
        tokenSymbols = tokenSymbols.concat(batchSymbols);
      }

      if (!tokenSymbols.every((s) => s != undefined)) return [];

      return tokenSymbols.map((symbol, i) => ({symbol, address: addresses[i].toLowerCase()}));
    } catch (e) {
      this.logger.error(`[UniswapPoolScanner] Error retrieving symbols for ${addresses}`, e);
      return [];
    }
  }
}
