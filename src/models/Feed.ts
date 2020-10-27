import { prop } from '@typegoose/typegoose';

class Feed {
  @prop()
  _id!: string;

  @prop()
  name?: string;

  @prop()
  sourceUrl!: string;

  @prop()
  extractionPath!: string;

  @prop()
  tolerance?: number;
}

export default Feed;
