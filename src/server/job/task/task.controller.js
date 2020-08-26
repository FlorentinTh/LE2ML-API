import httpStatus from 'http-status';
import APIError from '@APIError';
import EventJob from '../job.model';
import { JobState, JobProcess } from '../job.enums';
import { TaskState, TasksList } from './task.enums';
import JobLogsHelper from '@JobLogsHelper';
import { validationResult } from 'express-validator';
import ContainerHelper from '@ContainerHelper';
import FileHelper from '@FileHelper';
import fs from 'fs';
import path from 'path';
import Config from '@Config';

const config = Config.getConfig();

class TaskController {
  async startTask(req, res, next) {
    let job = req.job;
    const tasks = Object.keys(job.tasks);
    const nextTask = {};

    for (let i = 0; i < tasks.length; ++i) {
      const key = tasks[i];
      const value = job.tasks[key];

      if (value === TaskState.QUEUED) {
        nextTask[key] = TaskState.STARTED;
        break;
      }
    }

    if (Object.keys(nextTask).length === 0) {
      if (req.origin === 'complete') {
        return next();
      } else {
        return next(
          new APIError('Job cannot be started', httpStatus.UNPROCESSABLE_ENTITY)
        );
      }
    }

    const currentTask = Object.keys(nextTask)[0];
    const taskContainers = job.containers[currentTask];

    for (let i = 0; i < taskContainers.length; ++i) {
      const taskContainer = taskContainers[i];

      try {
        const container = await ContainerHelper.startContainer(
          taskContainer.name,
          taskContainer.token,
          job._id.toString(),
          job.user.toString()
        );

        taskContainer.started = true;
        taskContainer.id = container;
        req.containerFailed = false;
      } catch (error) {
        req.containerFailed = true;
        req.job = job._id;
        req.task = currentTask;
        return next();
      }
    }

    const data = {
      tasks: {},
      containers: {}
    };

    Object.assign(data.tasks, job.tasks, nextTask);
    Object.assign(job.containers[currentTask], taskContainers);
    Object.assign(data.containers, job.containers);

    try {
      job = await EventJob.findOneAndUpdate({ _id: job._id }, data, { new: true }).exec();
      if (!job) {
        return next(
          new APIError('Job cannot be updated', httpStatus.INTERNAL_SERVER_ERROR)
        );
      }

      const jobObj = await JobLogsHelper.writeEntry(job, 'updated');

      res.status(httpStatus.OK).json({
        data: {
          job: jobObj
        },
        message: `Job successfully updated`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async completeTask(req, res, next) {
    const id = req.params.id;
    const body = req.body;

    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    let job;
    try {
      job = await EventJob.findOne({ _id: id });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(new APIError('Job not found, cannot be updated', httpStatus.NOT_FOUND));
    }

    const data = {
      tasks: {},
      containers: {}
    };

    const input = {};

    const taskContainers = job.containers[body.task];
    let isOtherContainerRunning = false;
    for (let i = 0; i < taskContainers.length; ++i) {
      const taskContainer = taskContainers[i];

      if (taskContainer.token === body.token) {
        taskContainer.started = false;
      }

      if (body.task === TasksList.FEATURES) {
        if (taskContainer.started !== null && taskContainer.started === true) {
          isOtherContainerRunning = true;
          break;
        }
      }
    }

    const jobFolder = path.join(
      config.data.base_path,
      job.user.toString(),
      'jobs',
      job._id.toString()
    );

    const confPath = path.join(jobFolder, 'conf.json');
    const conf = await fs.promises.readFile(confPath, { encoding: 'utf-8' });
    const confObj = JSON.parse(conf);

    if (!isOtherContainerRunning) {
      if (job.tasks[body.task] === body.state) {
        return res.status(httpStatus.CONFLICT).json({
          data: null,
          message: 'Task was already completed'
        });
      }

      if (body.task === TasksList.FEATURES) {
        const fileList = [];

        const inputPath = path.join(jobFolder, 'features');

        try {
          const files = await fs.promises.readdir(inputPath);

          for (let i = 0; i < files.length; ++i) {
            const file = files[i];
            const stats = await fs.promises.stat(path.join(inputPath, file));

            if (stats.isFile()) {
              fileList.push(path.join(inputPath, file));
            }
          }

          if (fileList > 1) {
            const mergeOptions = {
              removeSource: true
            };

            if (confObj.features.save) {
              mergeOptions.saveFile = true;
              mergeOptions.saveDest = path.join(
                config.data.base_path,
                job.user.toString(),
                'data',
                confObj.source,
                'features',
                confObj.features.filename
              );
            }

            await FileHelper.mergeCSVFiles(fileList, jobFolder, mergeOptions);
          } else {
            const copyOptions = {};

            if (confObj.features.save) {
              copyOptions.saveFile = true;
              copyOptions.saveDest = path.join(
                config.data.base_path,
                job.user.toString(),
                'data',
                confObj.source,
                'features',
                confObj.features.filename
              );
            }

            await FileHelper.moveCSVFeatureFile(fileList[0], copyOptions);
          }
        } catch (error) {
          return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
        }
      }

      input[body.task] = body.state;
    }

    Object.assign(data.tasks, job.tasks, input);
    Object.assign(job.containers[body.task], taskContainers);
    Object.assign(data.containers, job.containers);

    if (body.task === TasksList.LEARNING) {
      if (!(body.results === undefined)) {
        data.results = {
          accuracy: body.results[0],
          f1Score: body.results[1],
          kappa: body.results[2]
        };
      }

      if (job.process === JobProcess.TRAINING) {
        const modelFilename = confObj.model;
        const sourceModelFilePath = path.join(jobFolder, modelFilename);
        const destModelFolderPath = path.join(
          config.data.base_path,
          job.user.toString(),
          'data',
          confObj.source,
          'models',
          confObj.algorithm.container
        );

        try {
          await fs.promises.access(destModelFolderPath);
        } catch (error) {
          if (error.code === 'ENOENT') {
            await fs.promises.mkdir(destModelFolderPath, { recursive: true });
          } else {
            return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
          }
        }

        const destModelFilePath = path.join(destModelFolderPath, modelFilename);

        try {
          await fs.promises.copyFile(sourceModelFilePath, destModelFilePath);
        } catch (error) {
          return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
        }
      }
    }

    try {
      const job = await EventJob.findOneAndUpdate(
        { _id: id, state: { $ne: JobState.COMPLETED } },
        data,
        {
          new: true
        }
      ).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be updated', httpStatus.NOT_FOUND)
        );
      }

      const jobObj = await JobLogsHelper.writeEntry(job, 'updated');

      if (isOtherContainerRunning) {
        res.status(httpStatus.OK).json({
          data: {
            job: jobObj
          },
          message: 'success'
        });
      } else {
        req.origin = 'complete';
        req.job = job;
        next();
      }
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async failTask(req, res, next) {
    let id = req.params.id;
    if (id === undefined) {
      id = req.job;
    }

    let task = req.query.task;
    if (task === undefined) {
      task = req.task;
    }

    let job;
    try {
      job = await EventJob.findOne({ _id: id }).exec();
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(new APIError('Job not found', httpStatus.NOT_FOUND));
    }

    if (!req.containerFailed) {
      if (!(job.tasks[task] === TaskState.STARTED)) {
        return next(
          new APIError('Task cannot be set to failed', httpStatus.INTERNAL_SERVER_ERROR)
        );
      }
    }

    const data = {
      state: JobState.ERROR,
      completedOn: Date.now()
    };

    const tasks = job.tasks;
    data.tasks = tasks;
    data.tasks[task] = TaskState.FAILED;

    const tasksKeys = Object.keys(tasks);
    for (let i = 0; i < tasksKeys.length; ++i) {
      const task = tasksKeys[i];
      const state = tasks[task];

      if (state === TaskState.QUEUED) {
        tasks[task] = TaskState.CANCELED;
      }
    }

    if (!req.containerFailed) {
      data.containers = {};
      const taskContainers = job.containers[task];
      for (let i = 0; i < taskContainers.length; ++i) {
        const taskContainer = taskContainers[i];
        try {
          await ContainerHelper.stopContainer(taskContainer.id);
        } catch (error) {
          return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
        }
        taskContainer.started = false;
      }

      Object.assign(job.containers[task], taskContainers);
      Object.assign(data.containers, job.containers);
    }

    try {
      job = await EventJob.findOneAndUpdate({ _id: id }, data, { new: true }).exec();
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    if (!job) {
      return next(
        new APIError('Job cannot be updated', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    const jobObj = await JobLogsHelper.writeEntry(job, 'failed');

    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      data: {
        job: jobObj
      },
      message: `Task ${task} failed`
    });
  }
}

export default new TaskController();
