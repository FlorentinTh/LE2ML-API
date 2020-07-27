import mongoose, { Schema } from 'mongoose';
import Config from '@Config';

const config = Config.getConfig();
const database = mongoose.connection.useDb(config.mongo.conf_db);

class DataSource extends Schema {
  constructor() {
    // eslint-disable-next-line no-unused-vars
    const dataSource = super(
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
        enabled: {
          type: Boolean,
          required: true,
          default: true
        },
        default: {
          type: Boolean,
          required: true,
          default: false
        },
        editableFiles: {
          type: Boolean,
          required: true,
          default: false
        }
      },
      { versionKey: false }
    );
  }
}

export default database.model('DataSource', new DataSource(), 'data-sources');
