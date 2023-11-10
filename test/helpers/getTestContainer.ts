import {Container} from 'inversify';
import winston from 'winston';
import settings from '../../src/config/settings.js';

const {createLogger, transports} = winston;

export function getTestContainer(): Container {
  const container = new Container({autoBindInjectable: true});

  const logger = createLogger({
    level: 'DEBUG',
    transports: [new transports.Console({silent: true})],
  });

  container.bind('Logger').toConstantValue(logger);
  container.bind('Settings').toConstantValue(settings);
  return container;
}
