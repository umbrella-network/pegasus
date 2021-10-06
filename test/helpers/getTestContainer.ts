import {Container} from 'inversify';
import {createLogger, transports} from 'winston';
import settings from '../../src/config/settings';

export function getTestContainer(): Container {
  const container = new Container({autoBindInjectable: true});

  const logger = createLogger({
    level: 'INFO',
    transports: [new transports.Console({silent: true})],
  });

  container.bind('Logger').toConstantValue(logger);
  container.bind('Settings').toConstantValue(settings);
  return container;
}
