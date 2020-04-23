import bluebird from 'bluebird';
import redis from 'redis';
import Config from '@Config';

const config = Config.getConfig();

bluebird.promisifyAll(redis);

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
    return redis.createClient({
      host: this.host,
      port: this.port
    });
  }
}

export default new Redis();
