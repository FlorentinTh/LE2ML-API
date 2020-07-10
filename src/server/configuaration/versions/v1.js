class V1 {
  constructor(config = null) {
    this.config = config;
  }

  getTasks() {
    const tasks = {};
    if (this.config.windowing.enable) {
      Object.assign(tasks, { windowing: 'init' });
    } else {
      Object.assign(tasks, { windowing: null });
    }

    if (!(this.config.features === undefined) && this.config.features.length > 0) {
      Object.assign(tasks, { features: 'init' });
    } else {
      Object.assign(tasks, { features: null });
    }

    if (
      (this.config.process === 'train' || this.config.process === 'test') &&
      !(this.config.process === 'none')
    ) {
      Object.assign(tasks, { learning: 'init' });
    } else {
      Object.assign(tasks, { learning: null });
    }

    return tasks;
  }
}

export default V1;
