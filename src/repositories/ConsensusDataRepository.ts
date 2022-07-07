import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';

import ConsensusData from '../models/ConsensusData';
import {HexStringWith0x} from '../types/custom';

export type SaveConsensusDataProps = {
  root: string;
  chainIds: string[];
  signatures: string[];
  fcdKeys: string[];
  fcdValues: HexStringWith0x[];
  timestamp: number;
  timePadding: number;
};

@injectable()
export class ConsensusDataRepository {
  async save(props: SaveConsensusDataProps): Promise<ConsensusData> {
    const {root, chainIds, signatures, fcdKeys, fcdValues, timestamp, timePadding} = props;
    const consensusDataTTL = timePadding - 1;
    const expireAt = dayjs().add(consensusDataTTL, 'second').toDate();
    const ConsensusDataModel = getModelForClass(ConsensusData);
    await ConsensusDataModel.deleteMany({});

    const consensusData = new ConsensusDataModel({
      root,
      chainIds,
      signatures,
      fcdKeys,
      fcdValues,
      timestamp,
      expireAt,
    });

    return consensusData.save();
  }

  async read(): Promise<ConsensusData | undefined> {
    const consensusData = await getModelForClass(ConsensusData).find();
    return consensusData[0];
  }
}
