import { TaskState } from '../../job/task/task.enum';

class V1 {
  constructor(config = null) {
    this.config = config;
  }

  getProp(prop) {
    if (!(typeof prop === 'string')) {
      throw new Error('Expected type for argument prop is String.');
    }
    return this.config[prop];
  }

  getTasks() {
    const tasks = {};
    if (this.config.windowing.enable) {
      Object.assign(tasks, { windowing: TaskState.QUEUED });
    } else {
      Object.assign(tasks, { windowing: null });
    }

    if (!(this.config.features === undefined) && this.config.features.length > 0) {
      Object.assign(tasks, { features: TaskState.QUEUED });
    } else {
      Object.assign(tasks, { features: null });
    }

    if (
      (this.config.process === 'train' || this.config.process === 'test') &&
      !(this.config.process === 'none')
    ) {
      Object.assign(tasks, { learning: TaskState.QUEUED });
    } else {
      Object.assign(tasks, { learning: null });
    }

    return tasks;
  }
}

export default V1;
