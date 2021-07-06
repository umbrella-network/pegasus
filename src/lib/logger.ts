import winston, {format, Logger} from 'winston';

const {combine, timestamp, printf, colorize, align} = format;

const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp(),
    align(),
    printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
