import {boot} from './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import {AgentCoordinator} from './agents/AgentCoordinator';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent';

(async () => {
  await boot();
  const argv = yargs(process.argv.slice(2)).options({agent: {type: 'string'}}).argv;
  await Application.get(AgentCoordinator).start(argv.agent);
  Application.get(ApplicationUpdateAgent).start();
})();
