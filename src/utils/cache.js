import redisCache from 'express-redis-cache';
import Redis from '@Redis';
import Logger from '@Logger';

const cache = redisCache({
  client: Redis.createClient(),
  expire: 60,
  prefix: 'liara'
});

cache.on('message', message => {
  Logger.info(`Cache: ${message}`);
});

cache.on('error', error => {
  Logger.error(`Cache error: ${error}`);
});

export default cache;
