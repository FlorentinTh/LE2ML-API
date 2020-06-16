import mongoose, { Schema } from 'mongoose';
import Config from '@Config';
import { type } from './algo.type';

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
          required: true
        },
        type: {
          type: String,
          enum: [type.SUPERVISED, type.UNSUPERVISED],
          required: true
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
        config: {
          type: String,
          default: null
        },
        isDeleted: {
          type: Boolean,
          default: false
        }
      },
      { versionKey: false }
    );

    algorithm.index({ slug: 1, container: 1 }, { unique: true });
  }
}

export default database.model('Algorithm', new Algorithm());
