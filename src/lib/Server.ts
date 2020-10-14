import { inject, injectable } from 'inversify';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import logger from './logger';
import settings from '../config/settings';
import HealthController from '../controllers/HealthController';

@injectable()
class Server {
  private router!: express.Application;
  private server!: http.Server;

  constructor(
    @inject(HealthController) healthController: HealthController
  ) {
    this.router = express()
      .use(helmet())
      .use(compression())
      .use(express.json())
      .use(express.urlencoded({ extended: true }))
      .use('/health', healthController.router);

    this.server = http.createServer(this.router);
  }

  start(): void {
    this.server.listen(settings.port, () => logger.info('Live on: ' + settings.port));
  }
}

export default Server;
