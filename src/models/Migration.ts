import {prop} from '@typegoose/typegoose';

class Migration {
  @prop()
  _id!: string;

  @prop()
  timestamp!: Date;
}

export default Migration;
