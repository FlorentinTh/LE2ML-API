import mongoose from 'mongoose';
import logger from '@Logger';
import Config from '@Config';

const config = Config.getConfig();

mongoose.Promise = global.Promise;

class Mongo {
  constructor() {
    this.connectionString = `mongodb://${config.mongo.user}:${config.mongo.password}@${config.mongo.host}:${config.mongo.port}?authSource=admin&w=1`;

    mongoose.set('useNewUrlParser', true);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useUnifiedTopology', true);
    mongoose.set('useFindAndModify', false);

    mongoose.connection.on('connected', () => {
      logger.info(`Database connected. Worker process: ${process.pid}`);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info(`Database re-onnected. Worker process: ${process.pid}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.info('Database disconnected');
    });

    mongoose.connection.on('close', () => {
      logger.info('Database connection closed');
    });

    mongoose.connection.on('error', error => {
      logger.error('Error while trying to connect to database: ' + error);
    });
  }

  async run() {
    try {
      await mongoose.connect(this.connectionString, {
        auth: {
          authdb: 'admin'
        }
      });
    } catch (error) {
      logger.error(
        `Connection to database failed on worker: ${process.pid}. Reason: ${error.message}`
      );
      process.exit(1);
    }
  }
}

export default new Mongo();
