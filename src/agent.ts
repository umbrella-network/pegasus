import './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import {AgentCoordinator} from './agents/AgentCoordinator';

const argv = yargs(process.argv.slice(2)).options({ agent: { type: 'string' } }).argv;
(async () => await Application.get(AgentCoordinator).start(argv.agent) )();
