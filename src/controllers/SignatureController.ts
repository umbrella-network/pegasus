import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import {SignedBlock} from '../types/SignedBlock';
import BlockSigner from '../services/BlockSigner';
import {DeviationVerifier} from '../services/deviationsFeeds/DeviationVerifier';
import {DeviationDataToSign} from '../types/DeviationFeeds';
import {RequestBodyToDataToSign} from '../services/tools/RequestBodyToDataToSign';

@injectable()
class SignatureController {
  router: express.Router;

  private blockSigner: BlockSigner;
  private deviationVerifier: DeviationVerifier;

  constructor(
    @inject(BlockSigner) blockSigner: BlockSigner,
    @inject(DeviationVerifier) deviationVerifier: DeviationVerifier,
  ) {
    this.blockSigner = blockSigner;
    this.deviationVerifier = deviationVerifier;

    this.router = express.Router().post('/', this.index).post('/deviation', this.deviationTrigger);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const block: SignedBlock = request.body;

    try {
      response.send(await this.blockSigner.apply(block));
    } catch (err) {
      response.status(400);
      response.json({error: err.message});
    }
  };

  deviationTrigger = async (request: Request, response: Response): Promise<void> => {
    const toSign: DeviationDataToSign = RequestBodyToDataToSign.apply(request.body);

    try {
      response.send(await this.deviationVerifier.apply(toSign));
    } catch (err) {
      response.status(400);
      response.json({error: err.message});
    }
  };
}

export default SignatureController;
