import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

@injectable()
export class BlockchainProviderFactory {
  @inject('Settings')
  private settings!: Settings;

  getRpcProvider(url: string): StaticJsonRpcProvider {
    if (!url) throw new Error(`[BlockchainProviderFactory] empty url: ${url}`);

    if (url.startsWith('http')) return new StaticJsonRpcProvider(url);

    throw new Error(`[BlockchainProviderFactory] unsupported URL scheme: ${url}. Please switch to http(s)`);
  }
}
