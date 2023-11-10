import {boot} from './boot.js';
import yargs from 'yargs';
import Application from './lib/Application.js';
import {AgentCoordinator} from './agents/AgentCoordinator.js';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent.js';

(async () => {
  await boot();
  const argv = yargs(process.argv.slice(2)).options({agent: {type: 'string'}}).argv;
  await Application.get(AgentCoordinator).start(argv.agent);
  Application.get(ApplicationUpdateAgent).start();
})();
