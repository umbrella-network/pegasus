import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {SymbolDataRepository} from './common/SymbolDataRepository.js';
import {PriceModel_KuCoin} from '../../models/fetchers/PriceModel_KuCoin.js';

@injectable()
export class KuCoinDataRepository extends SymbolDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_KuCoin);
    this.logPrefix = '[KuCoinDataRepository]';
  }
}
