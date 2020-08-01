import EventJob from '../server/job/job.model';
import FileHelper from '@FileHelper';
import dayjs from 'dayjs';

class JobLogsHelper {
  static async writeEntry(job, action) {
    if (!(job.constructor === EventJob)) {
      throw new Error('Expected type for argument job is EventJob');
    }

    if (!(action.constructor === String)) {
      throw new Error('Expected type for argument action is String');
    }

    const user = await job.getUserDetails(job.user);
    const jobObj = job.toObject();
    jobObj.user = user;

    try {
      await FileHelper.writeToJobsLog({
        action: action,
        date: dayjs().format('DD-MM-YYYY HH:mm'),
        job: jobObj
      });

      return jobObj;
    } catch (error) {
      throw new Error('Job log failed to write');
    }
  }
}

export default JobLogsHelper;
