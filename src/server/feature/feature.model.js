import mongoose, { Schema } from 'mongoose';
import Config from '@Config';
import { FeatureDomain } from './feature.enums';

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
          required: true,
          unique: true
        },
        domain: {
          type: String,
          enum: [FeatureDomain.ADMIN, FeatureDomain.USER],
          default: FeatureDomain.USER
        },
        source: {
          type: String,
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
        isDeleted: {
          type: Boolean,
          default: false
        }
      },
      { versionKey: false }
    );
  }
}

export default database.model('Feature', new Feature());
