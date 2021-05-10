import Joi from 'joi';
import path from 'path';

import 'dotenv/config';

const defaultValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  PORT: Joi.number().default(3000),
  LOG_FILE: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  MONGO_HOST: Joi.string().required(),
  MONGO_PORT: Joi.number().required().default(27017),
  MONGO_AUTH_DB: Joi.string().required(),
  MONGO_CONF_DB: Joi.string().required(),
  MONGO_EVENT_DB: Joi.string().required(),
  MONGO_USER: Joi.string().required(),
  MONGO_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required().default(6379),
  REDIS_PASSWORD: Joi.string().required(),
  DATA_BASE_PATH: Joi.string().required(),
  CONF_SCHEMA: Joi.string().required(),
  ALGO_SCHEMA: Joi.string().required(),
  CERT_FILE_PATH: Joi.string().required(),
  KEY_FILE_PATH: Joi.string().required(),
  REMOVE_CONTAINERS: Joi.boolean().required().default(false)
})
  .unknown()
  .required();

class Config {
  static getConfig() {
    const { error, value: env } = defaultValidationSchema.validate(process.env);

    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }

    return {
      env: env.NODE_ENV,
      port: env.PORT,
      log_file: env.LOG_FILE,
      jwtSecret: env.JWT_SECRET,
      mongo: {
        host: env.MONGO_HOST,
        port: env.MONGO_PORT,
        auth_db: env.MONGO_AUTH_DB,
        conf_db: env.MONGO_CONF_DB,
        event_db: env.MONGO_EVENT_DB,
        user: env.MONGO_USER,
        password: env.MONGO_PASSWORD
      },
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD
      },
      data: {
        base_path: path.normalize(env.DATA_BASE_PATH)
      },
      schemas: {
        conf: env.CONF_SCHEMA,
        algo: env.ALGO_SCHEMA
      },
      certs: {
        crt_path: path.normalize(env.CERT_FILE_PATH),
        key_path: path.normalize(env.KEY_FILE_PATH)
      },
      containers: {
        remove: env.REMOVE_CONTAINERS
      }
    };
  }
}

export default Config;
