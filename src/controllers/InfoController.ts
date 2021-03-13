import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import Settings from '../types/Settings';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import ChainContract from '../contracts/ChainContract';
import Blockchain from "../lib/Blockchain";

@injectable()
class InfoController {
  router: express.Router;
  blockchain!: Blockchain;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(ValidatorRegistryContract) private readonly validatorRegistryContract: ValidatorRegistryContract,
    @inject(ChainContract) private readonly chainContract: ChainContract,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    this.router = express.Router().get('/', this.pong);
    this.blockchain = blockchain;
  }

  pong = async (request: Request, response: Response): Promise<void> => {
    response.send({
      validator: await this.blockchain.wallet.getAddress(),
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      validatorRegistryAddress: (await this.validatorRegistryContract.resolveContract()).address,
      chainContractAddress: (await this.chainContract.resolveContract()).address,
      version: this.settings.version || null,
      environment: this.settings.environment,
      name: this.settings.name,
    });
  }
}

export default InfoController;
