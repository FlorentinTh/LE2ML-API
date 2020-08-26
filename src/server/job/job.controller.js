import httpStatus from 'http-status';
import APIError from '@APIError';
import EventJob from './job.model';
import Config from '@Config';
import { validationResult } from 'express-validator';
import StringHelper from '@StringHelper';
import { JobState, JobProcess, ResultOutput } from './job.enums';
import fs from 'fs';
import path from 'path';
import FileHelper from '@FileHelper';
import { SchemaType } from '../file/conf/conf.enums';
import { Types } from 'mongoose';
import Configuration from '@Configuration';
import JobLogsHelper from '@JobLogsHelper';
import { TaskState } from './task/task.enums';
import ContainerHelper from '@ContainerHelper';

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

  async downloadResultFile(req, res, next) {
    const userId = req.user.id;
    const jobId = req.params.id;
    const output = req.query.output;

    if (!Object.values(ResultOutput).includes(output)) {
      return next(new APIError('Unknown output', httpStatus.BAD_REQUEST));
    }

    const basePath = config.data.base_path;
    const filePath = path.join(userId, 'jobs', jobId, output + '.csv');
    const fullPath = path.join(basePath, filePath);

    try {
      await fs.promises.access(fullPath);
      res.status(httpStatus.OK).json({
        data: filePath,
        message: 'success'
      });
    } catch (error) {
      return next(new APIError('File not found', httpStatus.NOT_FOUND));
    }
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
      const confObj = configuration.getConf();
      job.tasks = configuration.setTasks();
      job.containers = configuration.setContainers();
      job.pipeline = confObj.pipeline;
      job.results = configuration.setResults();

      const process = confObj.process;
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
      const fullPath = path.join(basePath, userId, 'jobs', newJob._id.toString());

      await fs.promises.mkdir(fullPath);
      await fs.promises.writeFile(
        path.join(fullPath, 'conf.json'),
        JSON.stringify(conf, null, 2)
      );

      const input = confObj.input;
      if (Object.keys(input)[0] === 'file') {
        const dataSource = confObj.source;
        const type = input.file.type;
        const filename = input.file.filename;
        const source = path.join(basePath, userId, 'data', dataSource, type, filename);
        const dest = path.join(fullPath, filename);
        await fs.promises.copyFile(source, dest);
      }

      if (JobProcess.TESTING.includes(process)) {
        const source = confObj.source;
        const container = confObj.algorithm.container;
        const modelFilename = confObj.model;

        const sourceModelFilePath = path.join(
          basePath,
          userId,
          'data',
          source,
          'models',
          container,
          modelFilename
        );

        const destModelFilePath = path.join(fullPath, modelFilename);

        try {
          await fs.promises.copyFile(sourceModelFilePath, destModelFilePath);
        } catch (error) {
          return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
        }
      }

      await JobLogsHelper.writeEntry(job, 'started');

      req.origin = 'start';
      req.job = job;

      next();
    } catch (error) {
      console.log(error);
      return next(new APIError('Failed to start job', httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async completeJob(req, res, next) {
    if (!(req.containerFailed === undefined)) {
      if (req.containerFailed) {
        return next();
      }
    }

    let job = req.job;
    const data = {
      state: JobState.COMPLETED,
      completedOn: Date.now()
    };

    const containers = Object.keys(job.containers);

    for (let i = 0; i < containers.length; ++i) {
      if (job.containers[containers[i]][0].started) {
        job.containers[containers[i]][0].started = false;
      }
    }

    data.containers = job.containers;

    try {
      job = await EventJob.findOneAndUpdate({ _id: job._id }, data, {
        new: true
      }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be completed', httpStatus.NOT_FOUND)
        );
      }

      const jobObj = await JobLogsHelper.writeEntry(job, 'completed');

      res.status(httpStatus.OK).json({
        data: {
          job: jobObj
        },
        message: `Job successfully completed`
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
      return next(new APIError('Job cannot be canceled', httpStatus.NOT_FOUND));
    }

    const jobObj = await JobLogsHelper.writeEntry(job, 'canceled');

    res.status(httpStatus.OK).json({
      data: {
        job: jobObj
      },
      message: `Job successfully canceled`
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
      return next(new APIError('Failed to start job', httpStatus.INTERNAL_SERVER_ERROR));
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
      return next(new APIError('Job not found, cannot be started', httpStatus.NOT_FOUND));
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
          new APIError('Job not found, cannot be deleted', httpStatus.NOT_FOUND)
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
        message: `Job successfully deleted`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new JobController();
