import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BasicAgent} from './BasicAgent';

export enum AgentState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

@injectable()
export abstract class LoopAgent extends BasicAgent {
  @inject('Logger') logger!: Logger;

  shutdownGracePeriod = 10000;
  state = AgentState.OFFLINE;
  interval: number | undefined;
  delay: number | undefined;

  abstract execute(): Promise<void>;

  async start(): Promise<void> {
    process.on('SIGTERM', this.shutdown);
    process.on('SIGINT', this.shutdown);
    this.state = AgentState.ONLINE;

    if (this.onStart) {
      await this.onStart();
    }

    await this.run();
  }

  sleep(ms: number): void {
    this.delay = ms;
  }

  async run(): Promise<void> {
    if (this.state == AgentState.ONLINE) {
      await this.execute();

      if (this.delay) {
        setTimeout(async () => await this.run(), this.delay);
        this.delay = undefined;
      } else if (this.interval) {
        setTimeout(async () => await this.run(), this.interval);
      } else {
        setImmediate(async () => await this.run());
      }
    } else {
      console.log('Exiting...');
      process.exit(0);
    }
  }

  async onStart(): Promise<void> {
    return;
  }

  private shutdown = (): void => {
    this.state = AgentState.OFFLINE;
    setTimeout(() => process.exit(1), this.shutdownGracePeriod);
  };
}
