import {injectable} from 'inversify';

import {SubmitTxChecker} from './SubmitTxChecker.js';

@injectable()
export class TriggerTxChecker extends SubmitTxChecker {}
