import {Container} from 'inversify';
import winston from 'winston';
import settings from '../../src/config/settings.js';
import Settings from '../../src/types/Settings.js';
const {createLogger, format, transports} = winston;

export function getTestContainer(customSetting?: Settings): Container {
  const container = new Container({autoBindInjectable: true});

  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'error',
    format: format.combine(
      format.errors({stack: true}),
      format.colorize(),
      format.printf(({level, message, stack}) => {
        if (stack) {
          return `${level}: ${message}\n${stack}`;
        } else {
          return `${level}: ${message}`;
        }
      }),
    ),
    transports: [new transports.Console()],
  });

  logger.info('test logger configured');

  container.bind('Logger').toConstantValue(logger);
  container.bind('Settings').toConstantValue(customSetting || settings);
  return container;
}
