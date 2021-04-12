import winston, {Logger} from 'winston';

export const testingLogger: Logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});
