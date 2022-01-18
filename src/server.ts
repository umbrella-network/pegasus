import {boot} from './boot';
import Application from './lib/Application';
import Server from './lib/Server';

(async () => {
  await boot()
  Application.get(Server).start();
})();
