import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {Token} from '../models/Token.js';

@injectable()
export class TokenRepository {
  async findOne(filter: Partial<Token>): Promise<Token | null> {
    return getModelForClass(Token).findOne(filter).exec();
  }
}
