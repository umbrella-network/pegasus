import { injectable, postConstruct } from 'inversify';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import logger from './logger';
import settings from '../config/settings';

@injectable()
class Server {
  private router!: express.Application;
  private server!: http.Server;

  @postConstruct()
  setup(): void {
    this.router = express();
    this.router.use(helmet());
    this.router.use(compression())
    this.router.use(cookieParser());
    this.router.use(express.json());
    this.router.use(express.urlencoded());
    this.server = http.createServer(this.router);
  }

  start(): void {
    this.server.listen(settings.port, () => logger.info('Live on: ' + settings.port));
  }
}

export default Server;
