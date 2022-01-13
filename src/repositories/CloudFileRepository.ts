import {injectable} from 'inversify';
import NodeCache from 'node-cache';

@injectable()
export class CloudFileRepository {
  cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
  }

  async read(path: string): Promise<string> {
    if (this.cache.has(path)) return <string>this.cache.get(path);

    // TODO: read content from local data dir
    const data = '' // await fs.promises.readFile(fullPath, 'utf8');
    this.cache.set(path, data);
    return data;
  }
}