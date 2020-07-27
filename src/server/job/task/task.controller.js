import httpStatus from 'http-status';
import APIError from '@APIError';
import EventJob from '../job.model';
import { JobState } from '../job.enums';
import { TaskState } from './task.enum';
import JobLogsHelper from '../logs/logs.helper';

class TaskController {
  async startTask(req, res, next) {
    const task = req.query.task;
    const id = req.params.id;

    let job = await EventJob.findOne({ _id: id }).exec();

    if (!job) {
      return next(
        new APIError('Job not found, cannot be updated.', httpStatus.NOT_FOUND)
      );
    }

    const data = {};
    data.tasks = job.tasks;

    if (job.tasks[task] === TaskState.QUEUED) {
      data.tasks[task] = TaskState.STARTED;
    }

    job = await EventJob.findOneAndUpdate({ _id: id }, data, { new: true }).exec();

    if (!job) {
      return next(
        new APIError('Job cannot be updated.', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    const jobObj = await JobLogsHelper.writeEntry(job, 'updated');

    res.status(httpStatus.OK).json({
      data: {
        job: jobObj
      },
      message: `Job successfully updated.`
    });
  }

  async failTask(req, res, next) {
    const id = req.params.id;
    const task = req.query.task;

    const data = {
      state: JobState.ERROR,
      completedOn: Date.now()
    };

    try {
      let job = await EventJob.findOne({ _id: id }).exec();

      if (!job) {
        return next(
          new APIError('Job not found, cannot be completed.', httpStatus.NOT_FOUND)
        );
      }

      data.tasks = job.tasks;
      data.tasks[task] = TaskState.FAILED;

      job = await EventJob.findOneAndUpdate({ _id: id }, data, { new: true }).exec();

      if (!job) {
        return next(
          new APIError('Job cannot be updated.', httpStatus.INTERNAL_SERVER_ERROR)
        );
      }

      const jobObj = await JobLogsHelper.writeEntry(job, 'failed');

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
}

export default new TaskController();
