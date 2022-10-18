import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';

import ConsensusData from '../models/ConsensusData';
import {ConsensusDataProps} from '../types/Consensus';

@injectable()
export class ConsensusDataRepository {
  async save(props: ConsensusDataProps): Promise<ConsensusData> {
    const {root, chainIds, signatures, fcdKeys, fcdValues, dataTimestamp, timePadding, leaves} = props;
    const consensusDataTTL = timePadding * 10;
    const expireAt = dayjs().add(consensusDataTTL, 'second').toDate();
    const ConsensusDataModel = getModelForClass(ConsensusData);
    await ConsensusDataModel.deleteMany({});

    const consensusData = new ConsensusDataModel({
      root,
      chainIds,
      signatures,
      leaves,
      fcdKeys,
      fcdValues,
      dataTimestamp,
      expireAt,
    });

    return consensusData.save();
  }

  async read(): Promise<ConsensusData | undefined> {
    const consensusData = await getModelForClass(ConsensusData).find();
    return consensusData[0];
  }
}
