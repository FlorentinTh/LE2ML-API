import { createClient } from 'redis';
import Config from '@Config';

const config = Config.getConfig();

class Redis {
  constructor() {
    this.host = config.redis.host;
    this.port = config.redis.port;
  }

  getConfiguration() {
    return {
      host: this.host,
      port: this.port
    };
  }

  createClient() {
    return createClient({
      legacyMode: true,
      host: this.host,
      port: this.port
    });
  }
}

export default new Redis();
