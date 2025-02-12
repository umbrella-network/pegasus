import {inject} from 'inversify';
import {Logger} from 'winston';

export abstract class LogPrinter {
  @inject('Logger') protected logger!: Logger;

  protected lastStatusLogs: Record<string, number> = {};
  protected logPrefix!: string;

  protected printNotImportantWarn(msg: string) {
    if (!this.canPrint(msg, 'warn')) {
      return;
    }

    this.logger.warn(`${this.logPrefix} ${msg} (stat)`);
  }

  protected printNotImportantInfo(msg: string) {
    if (!this.canPrint(msg, 'info')) {
      return;
    }

    this.logger.info(`${this.logPrefix} ${msg} (stat)`);
  }

  protected printNotImportantDebug(msg: string) {
    if (!this.canPrint(msg, 'debug')) {
      return;
    }

    this.logger.debug(`${this.logPrefix} ${msg} (stat)`);
  }

  private canPrint(msg: string, level: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silly'): boolean {
    const key = level + msg;
    const lastTime = this.lastStatusLogs[key];
    const can = !(lastTime && lastTime + 60_000 * 5 > Date.now());

    this.lastStatusLogs[key] = Date.now();

    return can;
  }
}
