import { inject, injectable } from 'inversify';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import logger from './logger';
import Settings from '../types/Settings';
import HealthController from '../controllers/HealthController';
import BlocksController from '../controllers/BlocksController';
import SignatureController from "../controllers/SignatureController";
import Blockchain from './Blockchain';
import InfoController from '../controllers/InfoController';
import CryptoCompareWSInitializer from '../services/CryptoCompareWSInitializer';
import {Logger} from 'winston';

@injectable()
class Server {
  private port: number;
  private router: express.Application;
  private server: http.Server;
  private blockchain: Blockchain;
  private cryptoCompareWSInitializer: CryptoCompareWSInitializer;
  private logger: Logger;

  constructor(
    @inject('Logger') logger: Logger,
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain,
    @inject(HealthController) healthController: HealthController,
    @inject(BlocksController) blocksController: BlocksController,
    @inject(SignatureController) signatureController: SignatureController,
    @inject(InfoController) infoController: InfoController,
    @inject(CryptoCompareWSInitializer) cryptoCompareWSInitializer: CryptoCompareWSInitializer,
  ) {
    this.port = settings.port;
    this.logger = logger;
    this.cryptoCompareWSInitializer = cryptoCompareWSInitializer;

    this.router = express()
      .use(helmet())
      .use(compression())
      .use(express.json())
      .use(express.urlencoded({ extended: true }))
      .use('/blocks', blocksController.router)
      .use('/health', healthController.router)
      .use('/signature', signatureController.router)
      .use('/info', infoController.router);

    this.server = http.createServer(this.router);
    this.blockchain = blockchain;
  }

  start(): void {
    this.server.listen(this.port, () => logger.info(`Validator ${this.blockchain.wallet.address} is live on ${this.port}`));

    this.cryptoCompareWSInitializer.apply().catch((err) => {
      this.logger.error(err);
      process.exit(1);
    });
  }
}

export default Server;
