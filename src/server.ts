import './boot';
import Application from './lib/Application';
import Server from './lib/Server';

Application.get(Server).start();
