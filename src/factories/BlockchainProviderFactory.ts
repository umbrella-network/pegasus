import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

@injectable()
export class BlockchainProviderFactory {
  @inject('Settings')
  private settings!: Settings;

  getRpcProvider(url: string, id: string): StaticJsonRpcProvider {
    if (!url) throw new Error(`[BlockchainProviderFactory][${id}] empty url: ${typeof url}`);

    if (url.startsWith('http')) return new StaticJsonRpcProvider(url);

    throw new Error(`[BlockchainProviderFactory][${id}] unsupported URL scheme: ${url}. Please switch to http(s)`);
  }
}
