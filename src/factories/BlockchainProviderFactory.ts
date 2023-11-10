import {inject, injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

import Settings from '../types/Settings.js';

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
