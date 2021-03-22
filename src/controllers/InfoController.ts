import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import Settings from '../types/Settings';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import ChainContract from '../contracts/ChainContract';
import Blockchain from "../lib/Blockchain";
import Block from "../models/Block";
import {getModelForClass} from "@typegoose/typegoose";

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

  private async getLastSubmittedBlock(): Promise<Block | undefined> {
    const blocks: Block[] = await getModelForClass(Block)
      .find({})
      .limit(1)
      .sort({height: -1})
      .exec();

    return blocks[0];
  }

  pong = async (request: Request, response: Response): Promise<void> => {
    const lastSubmittedBlock = await this.getLastSubmittedBlock()

    response.send({
      validator: await this.blockchain.wallet.getAddress(),
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      validatorRegistryAddress: (await this.validatorRegistryContract.resolveContract()).address,
      chainContractAddress: (await this.chainContract.resolveContract()).address,
      version: this.settings.version || null,
      environment: this.settings.environment,
      name: this.settings.name,
      lastSubmittedBlock: lastSubmittedBlock ? lastSubmittedBlock.height : undefined
    });
  }
}

export default InfoController;
