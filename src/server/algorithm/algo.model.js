import mongoose, { Schema } from 'mongoose';
import Config from '@Config';
import { type } from './type';

const config = Config.getConfig();
const database = mongoose.connection.useDb(config.mongo.conf_db);

class Algorithm extends Schema {
  constructor() {
    // eslint-disable-next-line no-unused-vars
    const algorithm = super(
      {
        label: {
          type: String,
          required: true
        },
        slug: {
          type: String,
          required: true,
          unique: true
        },
        type: {
          type: String,
          enum: [type.SUPERVISED, type.UNSUPERVISED]
        },
        enabled: {
          type: Boolean,
          required: true,
          default: true
        },
        container: {
          type: String,
          required: true
        },
        isDeleted: {
          type: Boolean,
          default: false
        }
      },
      { versionKey: false }
    );
  }
}

export default database.model('Algorithm', new Algorithm());
