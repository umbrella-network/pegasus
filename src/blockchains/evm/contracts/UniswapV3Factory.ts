import {Contract, ethers} from 'ethers';
import {inject, injectable} from 'inversify';
import Settings from '../../../types/Settings';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import ABI from './UniswapV3Factory.abi.json';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository';

export type PoolCreatedEvent = {
  token0: string;
  token1: string;
  fee: bigint;
  pool: string;
  anchor: number;
};

@injectable()
export class UniswapV3Factory {
  static ABI = ABI;

  readonly contractId!: string;
  readonly provider!: StaticJsonRpcProvider;
  readonly contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    this.contractId = settings.api.uniswap.scannerContractId;
    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get('ethereum');
    this.contract = new Contract(this.contractId, UniswapV3Factory.ABI, this.provider);
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
