import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import {SignedBlock} from '../types/SignedBlock';
import BlockSigner from '../services/BlockSigner';
import newrelic from 'newrelic';

@injectable()
class SignatureController {
  router: express.Router;

  private blockSigner: BlockSigner;

  constructor(@inject(BlockSigner) blockSigner: BlockSigner) {
    this.blockSigner = blockSigner;

    this.router = express.Router().post('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const block: SignedBlock = request.body;
    newrelic.recordCustomEvent('PriceDiscrepancy', {
      key: 'testkey',
      discrepancy: '50'
    })
    
    try {
      const signature = await this.blockSigner.apply(block);

      response.send({data: signature});
    } catch (err) {
      response.status(400);
      response.json({error: err.message});
    }
  };
}

export default SignatureController;
