import {inject, injectable} from 'inversify';

import {SubmitTxChecker} from "./SubmitTxChecker";
import {LastTriggerResolver} from "./LastTriggerResolver";

@injectable()
export class TriggerTxChecker extends SubmitTxChecker {
  @inject(LastTriggerResolver) lastTxResolver!: LastTriggerResolver;
}
