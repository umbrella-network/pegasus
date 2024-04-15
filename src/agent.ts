import {boot} from './boot.js';
import yargs from 'yargs';
import Application from './lib/Application.js';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent.js';
import {DexCoordinator} from './agents/DexCoordinator.js';
import {DexProtocolName} from './types/DexProtocolName.js';
import {ChainsIds} from './types/ChainsIds.js';

(async () => {
  await boot();

  const argv = yargs(process.argv.slice(2)).options({
    chainId: {type: 'string'},
    dexProtocol: {type: 'string'},
  }).argv;

  if (argv.chainId && argv.dexProtocol) {
    await Application.get(DexCoordinator).startOne(argv.chainId as ChainsIds, argv.dexProtocol as DexProtocolName);
  } else {
    await Application.get(DexCoordinator).start();
  }

  Application.get(ApplicationUpdateAgent).start();
})();
