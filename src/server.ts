import {boot} from './boot.js';
import Application from './lib/Application.js';
import Server from './lib/Server.js';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent.js';

(async () => {
  await boot();
  Application.get(ApplicationUpdateAgent).start();
  Application.get(Server).start();
})();
