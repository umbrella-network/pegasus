import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Settings from '../types/Settings';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import ChainContract from '../contracts/ChainContract';

@injectable()
class InfoController {
  router: express.Router;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(ValidatorRegistryContract) private readonly validatorRegistryContract: ValidatorRegistryContract,
    @inject(ChainContract) private readonly chainContract: ChainContract,
  ) {
    this.router = express.Router().get('/', this.pong);
  }

  pong = async (request: Request, response: Response): Promise<void> => {
    response.send({
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      validatorRegistryAddress: (await this.validatorRegistryContract.resolveContract()).address,
      chainContractAddress: (await this.chainContract.resolveContract()).address,
      version: this.settings.version || null,
      environment: this.settings.environment || null,
    });
  }
}

export default InfoController;
