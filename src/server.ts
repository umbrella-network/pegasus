import {boot} from './boot';
import Application from './lib/Application';
import Server from './lib/Server';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent';

(async () => {
  await boot()
  Application.get(ApplicationUpdateAgent).start();
  Application.get(Server).start();
})();
