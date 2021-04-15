import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {NextFunction} from 'express-serve-static-core';

import Settings from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';

@injectable()
class InfoController {
  router: express.Router;
  blockchain!: Blockchain;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(ChainContract) private readonly chainContract: ChainContract,
    @inject(Blockchain) blockchain: Blockchain,
  ) {
    this.router = express.Router().get('/', this.info);
    this.blockchain = blockchain;
  }

  info = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const [validatorAddress, chainContractAddress, network] = await Promise.all([
        this.blockchain.wallet.getAddress(),
        this.chainContract.getAddress(),
        this.blockchain.provider.getNetwork(),
      ]);

      response.send({
        validator: validatorAddress,
        contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
        chainContractAddress: chainContractAddress,
        version: this.settings.version,
        environment: this.settings.environment,
        network,
        name: this.settings.name,
      });
    } catch (err) {
      next(err);
    }
  };
}

export default InfoController;
