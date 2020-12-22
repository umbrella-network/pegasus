import {prop} from '@typegoose/typegoose';

class Feed {
  @prop()
  sourceUrl!: string;

  @prop()
  leafLabel!: string;

  @prop()
  fetcher!: string;

  @prop()
  calculator?: string;

  @prop()
  discrepancy?: number;
}

export default Feed;
