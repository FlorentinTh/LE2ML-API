import httpStatus from 'http-status';
import APIError from '@APIError';
import Job from './job.model';
import Config from '@Config';
import { validationResult } from 'express-validator';
import StringHelper from '@StringHelper';
import { state } from './job.state';
import fs from 'fs';
import path from 'path';
import FileHelper from '../helpers/fileHelper';
import schemaType from '../file/schema.type';
import { Types } from 'mongoose';

const config = Config.getConfig();

class JobController {
  async getJobs(req, res, next) {}

  async getJobByUser(req, res, next) {
    const jobState = req.query.state;

    if (!Object.values(state).includes(jobState)) {
      return next(new APIError('Unknown job state', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;

    try {
      const jobs = await Job.find()
        .select()
        .where({ user: userId, state: jobState })
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

  async startJob(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const job = new Job();

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

      const newJob = await job.save();
      const basePath = config.data.base_path;
      const userId = req.user.id;
      const fullPath = path.join(basePath, userId, 'jobs', newJob._id.toString());

      await fs.promises.mkdir(fullPath);
      await fs.promises.writeFile(
        path.join(fullPath, 'conf.json'),
        JSON.stringify(conf, null, 2)
      );

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
}

export default new JobController();
