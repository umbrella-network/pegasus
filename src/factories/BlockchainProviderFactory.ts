import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {JsonRpcProvider} from '@ethersproject/providers';

@injectable()
export class BlockchainProviderFactory {
  @inject('Settings')
  private settings!: Settings;

  getRpcProvider(url: string): JsonRpcProvider {
    if (url.startsWith('http')) return new JsonRpcProvider(url);

    throw new Error(`unsupported URL scheme: ${url}. Please switch to http(s)`);
  }
}
