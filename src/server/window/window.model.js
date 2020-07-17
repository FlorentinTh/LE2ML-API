import mongoose, { Schema } from 'mongoose';
import Config from '@Config';

const config = Config.getConfig();
const database = mongoose.connection.useDb(config.mongo.conf_db);

class Window extends Schema {
  constructor() {
    // eslint-disable-next-line no-unused-vars
    const window = super(
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
        container: {
          type: String,
          required: true
        },
        default: {
          type: Boolean,
          required: true,
          default: false
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

export default database.model('Window', new Window());
