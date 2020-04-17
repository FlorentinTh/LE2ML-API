import mongoose, { Schema } from 'mongoose';
import Config from '@Config';
import { domain } from './domain';

const config = Config.getConfig();
const database = mongoose.connection.useDb(config.mongo.conf_db);

class Feature extends Schema {
  constructor() {
    // eslint-disable-next-line no-unused-vars
    const feature = super(
      {
        label: {
          type: String,
          required: true
        },
        slug: {
          type: String,
          required: true
        },
        domain: {
          type: String,
          enum: [domain.ADMIN, domain.USER],
          default: domain.USER
        }
      },
      { versionKey: false }
    );
  }
}

export default database.model('Feature', new Feature());
