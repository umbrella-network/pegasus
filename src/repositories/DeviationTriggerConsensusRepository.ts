import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {DeviationConsensus} from '../models/DeviationConsensus';
import {Logger} from 'winston';

@injectable()
export class DeviationTriggerConsensusRepository {
  @inject('Logger') logger!: Logger;

  async save(props: DeviationConsensus): Promise<void> {
    const ConsensusDataModel = getModelForClass(DeviationConsensus);
    await ConsensusDataModel.deleteMany({chainId: props.chainId});

    const consensusData = new ConsensusDataModel({
      ...props,
      priceData: props.priceData.map((data) => {
        return {
          ...data,
          price: data.price.toString(10),
        };
      }),
    });

    await consensusData.save();

    this.logger.info(`[${props.chainId}] saved consensus @${props.dataTimestamp}`);
  }

  async read(chainId: string): Promise<DeviationConsensus | undefined> {
    const [consensusData] = await getModelForClass(DeviationConsensus).find({chainId});

    if (consensusData) {
      consensusData.priceData = consensusData.priceData.map((data) => {
        return {
          ...data,
          price: BigInt(data.price),
        };
      });
    }

    return consensusData;
  }

  async delete(chainId: string): Promise<void> {
    await getModelForClass(DeviationConsensus).deleteOne({chainId});
  }

  async existedChains(): Promise<Set<string>> {
    const all = await getModelForClass(DeviationConsensus).find();
    return new Set(all.map((consensus) => consensus.chainId));
  }
}
