import httpStatus from 'http-status';
import APIError from '@APIError';
import EventJob from './job.model';
import Config from '@Config';
import { validationResult } from 'express-validator';
import StringHelper from '@StringHelper';
import { state } from './job.state';
import fs from 'fs';
import path from 'path';
import FileHelper from '../helpers/fileHelper';
import schemaType from '../file/schema.type';
import { Types } from 'mongoose';
import Configuration from '../configuaration/configuration';

const config = Config.getConfig();

class JobController {
  async getJobs(req, res, next) {}

  async getJobByUser(req, res, next) {
    const jobState = req.query.state;

    if (!Object.values(state).includes(jobState)) {
      return next(new APIError('Unknown job state', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;

    const or = [];

    if (jobState === state.STARTED) {
      or.push({ state: jobState }, { state: state.CANCELED });
    } else if (jobState === state.COMPLETED) {
      or.push({ state: jobState });
    }

    try {
      const jobs = await EventJob.find()
        .select()
        .or(or)
        .where({ user: userId, isDeleted: false })
        .exec();

      if (!jobs) {
        return next(new APIError('Cannot find all jobs.', httpStatus.NOT_FOUND));
      }

      res.status(httpStatus.OK).json({
        data: {
          jobs: jobs
        },
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async getJobLogs(req, res, next) {}

  async streamJobChanges(req, res, next) {}

  async startJob(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const job = new EventJob();

    const userId = req.user.id;
    job.label = req.body.label.toLowerCase();
    job.slug = StringHelper.toSlug(req.body.label, '_');
    job.state = state.STARTED;
    job.user = Types.ObjectId(userId);

    const version = req.query.v;

    try {
      const conf = req.body.conf;
      const validation = await FileHelper.validateJson(conf, version, schemaType.CONFIG);

      if (!validation.ok) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          data: validation.errors,
          message: 'error'
        });
      }

      const tasks = new Configuration(conf).getTasks();
      job.tasks = tasks;

      const newJob = await job.save();
      const basePath = config.data.base_path;
      const userId = req.user.id;
      const fullPath = path.join(basePath, userId, 'jobs', newJob._id.toString());

      await fs.promises.mkdir(fullPath);
      await fs.promises.writeFile(
        path.join(fullPath, 'conf.json'),
        JSON.stringify(conf, null, 2)
      );

      /**
       *
       * Start container
       * Store container ID
       * Update given task in callback when started.
       * End request in callback
       *
       */

      res.status(httpStatus.OK).json({
        data: {
          job: newJob
        },
        message: 'Job successfully started'
      });
    } catch (error) {
      return next(new APIError('Failed to start job.', httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async updateJobTask(req, res, next) {
    const id = req.params.id;

    const body = req.body;
    const data = {
      tasks: {
        windowing: body.windowing === undefined ? null : body.windowing,
        features: body.features === undefined ? null : body.features,
        learning: body.learning === undefined ? null : body.learning
      }
    };

    try {
      const job = await EventJob.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be updated.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          job: job
        },
        message: `Job successfully updated.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async completeJob(req, res, next) {
    const id = req.params.id;
    const data = {
      state: state.COMPLETED,
      completedOn: Date.now()
    };

    try {
      const job = await EventJob.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be completed.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          job: job
        },
        message: `Job successfully completed.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async cancelJob(req, res, next) {
    const id = req.params.id;
    const data = {
      state: state.CANCELED
    };

    try {
      const job = await EventJob.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be canceled.', httpStatus.NOT_FOUND)
        );
      }

      /**
       *
       * get all container IDs
       * stop 'em if not already stopped
       *
       */

      res.status(httpStatus.OK).json({
        data: {
          job: job
        },
        message: `Job successfully canceled.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async restartJob(req, res, next) {
    const id = req.params.id;
    const data = {
      state: state.STARTED
    };

    try {
      const userId = req.user.id;
      const confPath = path.join(
        config.data.base_path,
        userId.toString(),
        'jobs',
        id.toString(),
        'conf.json'
      );
      const file = await fs.promises.readFile(confPath);
      const conf = JSON.parse(file);

      const validation = await FileHelper.validateJson(
        conf,
        conf.version,
        schemaType.CONFIG
      );

      if (!validation.ok) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          data: validation.errors,
          message: 'error'
        });
      }

      const tasks = new Configuration(conf).getTasks();
      data.tasks = tasks;
    } catch (error) {
      return next(new APIError('Failed to start job.', httpStatus.INTERNAL_SERVER_ERROR));
    }

    try {
      const job = await EventJob.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be started.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          job: job
        },
        message: `Job successfully started.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeJob(req, res, next) {
    const id = req.params.id;
    const data = {
      isDeleted: true
    };

    try {
      const job = await EventJob.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be deleted.', httpStatus.NOT_FOUND)
        );
      }

      try {
        await FileHelper.removeDataDirectories(req.user.id.toString(), id.toString());
      } catch (error) {
        return next(
          new APIError(
            'Unable to remove data directories',
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          job: job
        },
        message: `Job successfully deleted.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new JobController();
