import {Logger} from 'winston';

export const mockedLogger: Logger = {
  log: () => mockedLogger,
  error: () => mockedLogger,
  warn: () => mockedLogger,
  help: () => mockedLogger,
  data: () => mockedLogger,
  info: () => mockedLogger,
  debug: () => mockedLogger,
  prompt: () => mockedLogger,
  http: () => mockedLogger,
  verbose: () => mockedLogger,
  input: () => mockedLogger,
  silly: () => mockedLogger,
  emerg: () => mockedLogger,
  alert: () => mockedLogger,
  crit: () => mockedLogger,
  warning: () => mockedLogger,
  notice: () => mockedLogger,
} as unknown as Logger;
