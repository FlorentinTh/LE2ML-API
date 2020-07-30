import httpStatus from 'http-status';
import APIError from '@APIError';
import EventJob from './job.model';
import Config from '@Config';
import { validationResult } from 'express-validator';
import StringHelper from '@StringHelper';
import { JobState, JobProcess } from './job.enums';
import fs from 'fs';
import path from 'path';
import FileHelper from '@FileHelper';
import { SchemaType } from '../file/file.enums';
import { Types } from 'mongoose';
import Configuration from '@Configuration';
import LineByLineReader from 'line-by-line';
import dayjs from 'dayjs';
import JobLogsHelper from './logs/logs.helper';
import { TaskState } from './task/task.enums';
import ContainerHelper from './container/container.helper';

const config = Config.getConfig();

class JobController {
  async getJobByUser(req, res, next) {
    const jobState = req.query.state;

    if (!Object.values(JobState).includes(jobState)) {
      return next(new APIError('Unknown job state', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;

    const or = [];

    if (jobState === JobState.STARTED) {
      or.push(
        { state: jobState },
        { state: JobState.CANCELED },
        { state: JobState.ERROR }
      );
    } else if (jobState === JobState.COMPLETED) {
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

  async getJobLogEntries(req, res, next) {
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, '.app-data', 'jobs.log');

    try {
      await fs.promises.access(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.end();
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }

    res.setHeader('Content-Type', 'application/json');

    const lineReader = new LineByLineReader(fullPath);
    lineReader.on('line', line => {
      res.write(line + '\n');
    });

    lineReader.once('end', line => {
      res.end();
    });
  }

  async getJobChanges(req, res, next) {
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    if (req.httpVersion !== '2.0') {
      res.setHeader('Connection', 'keep-alive');
    }

    const watch = EventJob.watch();

    watch.on('change', async event => {
      if (!res.finished) {
        let job;
        if (event.operationType === 'update') {
          const jobId = event.documentKey._id;
          try {
            job = await EventJob.findOne({ _id: jobId }).exec();
          } catch (error) {
            return next(new APIError('Cannot find job', httpStatus.NOT_FOUND));
          }
        } else if (event.operationType === 'insert') {
          job = event.fullDocument;
        }

        if (job.user.toString() === req.user.id) {
          res.write('data: ' + JSON.stringify(job) + '\n\n');
        }

        res.flush();
      }
    });

    req.on('close', () => {
      if (!res.finished) {
        res.end();
      }
    });
  }

  async getAdminJobChanges(req, res, next) {
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    if (req.httpVersion !== '2.0') {
      res.setHeader('Connection', 'keep-alive');
    }

    const watch = EventJob.watch();

    watch.on('change', async event => {
      if (!res.finished) {
        let job;
        if (event.operationType === 'update') {
          const jobId = event.documentKey._id;
          try {
            job = await EventJob.findOne()
              .where('_id')
              .in([jobId])
              .exec();
          } catch (error) {
            return next(new APIError('Cannot find job', httpStatus.NOT_FOUND));
          }
        } else if (event.operationType === 'insert') {
          job = event.fullDocument;
        }

        const user = await job.getUserDetails(job.user);
        const jobObj = job.toObject();
        jobObj.user = user;

        let action;
        if (event.operationType === 'update') {
          const state = event.updateDescription.updatedFields.state;
          if (!(state === undefined)) {
            if (state === 'started') {
              action = 'restarted';
            } else {
              action = state;
            }
          } else {
            const isDeleted = event.updateDescription.updatedFields.isDeleted;

            const tasks = event.updateDescription.updatedFields.tasks;

            if (!(isDeleted === undefined)) {
              action = 'deleted';
            } else if (!(tasks === undefined)) {
              action = 'updated';
            }
          }
        } else if (event.operationType === 'insert') {
          action = 'started';
        }

        res.write(
          'data: ' +
            JSON.stringify({
              action: action,
              date: dayjs().format('DD-MM-YYYY HH:mm'),
              job: jobObj
            }) +
            '\n\n'
        );

        res.flush();
      }
    });

    req.on('close', () => {
      if (!res.finished) {
        res.end();
      }
    });
  }

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
    job.state = JobState.STARTED;
    job.user = Types.ObjectId(userId);

    const version = req.query.v;

    try {
      const conf = req.body.conf;
      const validation = await FileHelper.validateJson(conf, version, SchemaType.CONFIG);

      if (!validation.ok) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          data: validation.errors,
          message: 'error'
        });
      }

      const configuration = new Configuration(conf);
      job.tasks = configuration.setTasks();
      job.containers = configuration.setContainers();
      job.pipeline = configuration.getProp('pipeline');

      const process = configuration.getProp('process');
      switch (process) {
        case 'train':
          job.process = JobProcess.TRAINING;
          break;
        case 'test':
          job.process = JobProcess.TESTING;
          break;
        default:
          job.process = JobProcess.NONE;
          break;
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

      const input = configuration.getProp('input');
      if (Object.keys(input)[0] === 'file') {
        const dataSource = configuration.getProp('source');
        const type = input.file.type;
        const filename = input.file.filename;
        const source = path.join(basePath, userId, 'data', dataSource, type, filename);
        const dest = path.join(basePath, userId, 'jobs', newJob._id.toString(), filename);
        await fs.promises.copyFile(source, dest);
      }

      await JobLogsHelper.writeEntry(job, 'started');

      req.origin = 'start';
      req.job = job;

      next();
    } catch (error) {
      return next(new APIError('Failed to start job.', httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async completeJob(req, res, next) {
    let job = req.job;
    const data = {
      state: JobState.COMPLETED,
      completedOn: Date.now()
    };

    try {
      job = await EventJob.findOneAndUpdate({ _id: job._id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be completed.', httpStatus.NOT_FOUND)
        );
      }

      const jobObj = await JobLogsHelper.writeEntry(job, 'completed');

      res.status(httpStatus.OK).json({
        data: {
          job: jobObj
        },
        message: `Job successfully completed.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async cancelJob(req, res, next) {
    const id = req.params.id;

    let job;
    try {
      job = await EventJob.findOne({ _id: id }).exec();
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(new APIError('Job not found', httpStatus.NOT_FOUND));
    }

    const data = {
      state: JobState.CANCELED,
      containers: {}
    };

    const tasks = job.tasks;
    data.tasks = tasks;

    const tasksKeys = Object.keys(tasks);
    for (let i = 0; i < tasksKeys.length; ++i) {
      const task = tasksKeys[i];
      const state = tasks[task];

      if (!(state === TaskState.FAILED) && !(state === TaskState.COMPLETED)) {
        tasks[task] = TaskState.CANCELED;
      }
    }

    const jobContainers = job.containers;
    const jobContainersKeys = Object.keys(job.containers);

    for (let i = 0; i < jobContainersKeys.length; ++i) {
      const task = jobContainersKeys[i];
      const containers = jobContainers[task];

      for (let j = 0; j < containers.length; ++j) {
        const container = containers[j];

        if (container.started) {
          try {
            await ContainerHelper.stopContainer(container.id);
          } catch (error) {
            return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
          }
          container.started = false;
        }
      }
    }

    Object.assign(data.containers, jobContainers);

    try {
      job = await EventJob.findOneAndUpdate(
        { _id: id, state: { $ne: JobState.COMPLETED } },
        data,
        {
          new: true
        }
      ).exec();
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(new APIError('Job cannot be canceled.', httpStatus.NOT_FOUND));
    }

    const jobObj = await JobLogsHelper.writeEntry(job, 'canceled');

    res.status(httpStatus.OK).json({
      data: {
        job: jobObj
      },
      message: `Job successfully canceled.`
    });
  }

  async restartJob(req, res, next) {
    const id = req.params.id;

    let job;
    try {
      job = await EventJob.findOne({ _id: id }).exec();
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(new APIError('Job not found', httpStatus.NOT_FOUND));
    }

    const data = {
      state: JobState.STARTED,
      containers: {}
    };

    const jobContainers = job.containers;
    const jobContainersKeys = Object.keys(job.containers);

    for (let i = 0; i < jobContainersKeys.length; ++i) {
      const task = jobContainersKeys[i];
      const containers = jobContainers[task];

      for (let j = 0; j < containers.length; ++j) {
        const container = containers[j];
        container.id = null;
        container.started = null;
      }
    }

    Object.assign(data.containers, jobContainers);

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
        SchemaType.CONFIG
      );

      if (!validation.ok) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          data: validation.errors,
          message: 'error'
        });
      }

      const configuration = new Configuration(conf);
      data.tasks = configuration.setTasks();
    } catch (error) {
      return next(new APIError('Failed to start job.', httpStatus.INTERNAL_SERVER_ERROR));
    }

    try {
      job = await EventJob.findOneAndUpdate(
        { _id: id, state: { $ne: JobState.STARTED } },
        data,
        {
          new: true
        }
      ).exec();
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(
        new APIError('Job not found, cannot be started.', httpStatus.NOT_FOUND)
      );
    }

    await JobLogsHelper.writeEntry(job, 'restarted');

    req.origin = 'restart';
    req.job = job;
    next();
  }

  async removeJob(req, res, next) {
    const id = req.params.id;
    const data = {
      isDeleted: true
    };

    try {
      const job = await EventJob.findOneAndUpdate(
        { _id: id, state: { $ne: JobState.STARTED } },
        data,
        {
          new: true
        }
      ).exec();

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

      await JobLogsHelper.writeEntry(job, 'deleted');

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
