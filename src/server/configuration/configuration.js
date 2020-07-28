import V1 from './versions/v1';

class Configuration {
  constructor(config = null) {
    this.config = config;
    this.version = config === null ? null : config.version;
  }

  getProp(prop) {
    switch (this.version) {
      case '1':
        return new V1(this.config).getProp(prop);
      default:
        throw new Error(`Version ${this.version} of configuration is not supported yet.`);
    }
  }

  setTasks() {
    switch (this.version) {
      case '1':
        return new V1(this.config).setTasks();
      default:
        throw new Error(`Version ${this.version} of configuration is not supported yet.`);
    }
  }

  setContainers() {
    switch (this.version) {
      case '1':
        return new V1(this.config).setContainers();
      default:
        throw new Error(`Version ${this.version} of configuration is not supported yet.`);
    }
  }
}

export default Configuration;
