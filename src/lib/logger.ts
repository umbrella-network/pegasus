import {Logger, createLogger, format, transports} from 'winston';

const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.errors({stack: true}),
    format.colorize(),
    format.timestamp(),
    format.printf(({level, message, timestamp, stack}) => {
      if (stack) {
        return `${timestamp} ${level}: ${message}\n${stack}`;
      } else {
        return `${timestamp} ${level}: ${message}`;
      }
    }),
  ),
  transports: [new transports.Console()],
});

export default logger;
