import { injectable } from 'inversify';
import express, { Application, Request, Response } from 'express';

@injectable()
class HeathController {
  router: Application;

  constructor() {
    this.router = express().get('/', this.pong);
  }

  pong = async (request: Request, response: Response): Promise<void> => {
    response.send('pong');
  }
}

export default HeathController;
