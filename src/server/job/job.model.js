import mongoose, { Schema } from 'mongoose';
import Config from '@Config';
import { state } from './job.state';

const config = Config.getConfig();
const database = mongoose.connection.useDb(config.mongo.event_db);

class Job extends Schema {
  constructor() {
    // eslint-disable-next-line no-unused-vars
    const job = super(
      {
        label: {
          type: String,
          required: true
        },
        slug: {
          type: String,
          required: true
        },
        user: {
          type: mongoose.ObjectId,
          required: true
        },
        state: {
          type: String,
          enum: [state.STARTED, state.RUNNING, state.COMPLETED, state.CANCELED],
          required: true
        },
        startedOn: {
          type: Date,
          default: Date.now
        },
        completedOn: {
          type: Date,
          default: null
        }
      },
      { versionKey: false }
    );
  }
}

export default database.model('Job', new Job());
