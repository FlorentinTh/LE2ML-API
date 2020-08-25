import { TaskState } from '../../job/task/task.enums';
import { v4 as uuidv4 } from 'uuid';

class V1 {
  constructor(config = null) {
    this.config = config;
  }

  getProp(prop) {
    return this.config[prop];
  }

  setContainers() {
    const containers = {};

    if (this.config.windowing.enable) {
      const containerName = this.config.windowing.parameters.function.container;
      Object.assign(containers, {
        windowing: [{ id: null, name: containerName, token: uuidv4(), started: null }]
      });
    } else {
      Object.assign(containers, { windowing: null });
    }

    if (!(this.config.features === undefined)) {
      const features = this.config.features.list;
      if (!(features === undefined) && features.length > 0) {
        const featuresContainers = [];
        for (let i = 0; i < features.length; ++i) {
          if (!featuresContainers.includes(features[i].container)) {
            featuresContainers.push(features[i].container);
          }
        }

        const featuresArray = [];

        for (let i = 0; i < featuresContainers.length; ++i) {
          featuresArray.push({
            id: null,
            name: featuresContainers[i],
            token: uuidv4(),
            started: null
          });
        }

        Object.assign(containers, {
          features: featuresArray
        });
      } else {
        Object.assign(containers, { features: null });
      }
    } else {
      Object.assign(containers, { features: null });
    }

    if (
      (this.config.process === 'train' || this.config.process === 'test') &&
      !(this.config.process === 'none')
    ) {
      const containerName = this.config.algorithm.container;
      Object.assign(containers, {
        learning: [{ id: null, name: containerName, token: uuidv4(), started: null }]
      });
    } else {
      Object.assign(containers, { learning: null });
    }
    return containers;
  }

  setTasks() {
    const tasks = {};
    if (this.config.windowing.enable) {
      Object.assign(tasks, { windowing: TaskState.QUEUED });
    } else {
      Object.assign(tasks, { windowing: null });
    }

    if (!(this.config.features === undefined) && this.config.features.list.length > 0) {
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

  setResults() {
    if (this.config.process === 'train' && this.config['cross-validation']) {
      return {
        accuracy: null,
        f1Score: null,
        kappa: null
      };
    }
  }
}

export default V1;
