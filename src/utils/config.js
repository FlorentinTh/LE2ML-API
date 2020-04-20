import Joi from '@hapi/joi';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const defaultValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().required(),
  MONGO_HOST: Joi.string().required(),
  MONGO_PORT: Joi.number()
    .required()
    .default(27017),
  MONGO_AUTH_DB: Joi.string().required(),
  MONGO_API_DB: Joi.string().required(),
  MONGO_CONF_DB: Joi.string().required(),
  MONGO_USER: Joi.string().required(),
  MONGO_PASSWORD: Joi.string().required(),
  DATA_BASE_PATH: Joi.string().required(),
  CERT_FILE_PATH: Joi.string().required(),
  KEY_FILE_PATH: Joi.string().required()
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
      jwtSecret: env.JWT_SECRET,
      mongo: {
        host: env.MONGO_HOST,
        port: env.MONGO_PORT,
        auth_db: env.MONGO_AUTH_DB,
        api_db: env.MONGO_API_DB,
        conf_db: env.MONGO_CONF_DB,
        user: env.MONGO_USER,
        password: env.MONGO_PASSWORD
      },
      data: {
        base_path: path.normalize(env.DATA_BASE_PATH)
      },
      certs: {
        crt_path: path.normalize(env.CERT_FILE_PATH),
        key_path: path.normalize(env.KEY_FILE_PATH)
      }
    };
  }
}

export default Config;
