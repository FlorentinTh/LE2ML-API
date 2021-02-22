import httpStatus from 'http-status';
import APIError from '@APIError';
import Config from '@Config';
import EventJob from '../job.model';
import fs from 'fs';
import path from 'path';
import LineByLineReader from 'line-by-line';
import dayjs from 'dayjs';

const config = Config.getConfig();

class JobController {
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

  async getJobLogChanges(req, res, next) {
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
            job = await EventJob.findOne().where('_id').in([jobId]).exec();
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
}
export default new JobController();
