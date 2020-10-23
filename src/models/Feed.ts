import { prop } from '@typegoose/typegoose';

class Feed {
  @prop()
  _id!: string;

  @prop()
  name?: string;

  @prop()
  sourceUrl!: string;

  @prop()
  tolerance?: number;

  @prop({ index: true })
  lastSynchronizedAt?: Date;
}

export default Feed;
