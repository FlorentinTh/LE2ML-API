import mongoose, { Schema } from 'mongoose';
import Config from '@Config';
import { JobState, JobPipeline, JobProcess } from './job.enums';
import User from '../user/user.model';

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
          enum: [JobState.STARTED, JobState.COMPLETED, JobState.CANCELED],
          required: true
        },
        startedOn: {
          type: Date,
          default: Date.now
        },
        completedOn: {
          type: Date,
          default: null
        },
        pipeline: {
          type: String,
          enum: [JobPipeline.ML, JobPipeline.DL],
          required: true
        },
        process: {
          type: String,
          enum: [JobProcess.TRAINING, JobProcess.TESTING, JobProcess.NONE],
          required: true
        },
        tasks: {
          type: Object,
          required: true
        },
        containers: {
          type: Object,
          default: {}
        },
        isDeleted: {
          type: Boolean,
          default: false
        }
      },
      { versionKey: false }
    );

    job.methods.getUserDetails = this.getUserDetails;
    job.methods.getTasks = this.getTasks;
  }

  async getUserDetails(userId) {
    const user = await User.findOne({ _id: userId });

    if (user) {
      return {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email
      };
    }
  }
}

const EventJob = database.model('Job', new Job(), 'jobs');

export default EventJob;
