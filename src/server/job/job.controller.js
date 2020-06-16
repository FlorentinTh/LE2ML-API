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

const config = Config.getConfig();

class JobController {
  async startJob(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const job = new Job();
    job.label = req.body.label.toLowerCase();
    job.slug = StringHelper.toSlug(req.body.label, '_');
    job.state = state.STARTED;

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
