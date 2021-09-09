import mongoose from 'mongoose';
import Logger from '@Logger';
import Config from '@Config';

const config = Config.getConfig();

mongoose.Promise = global.Promise;

class Mongo {
  constructor() {
    this.connectionString = `mongodb+srv://${config.mongo.user}:${config.mongo.password}@${config.mongo.host}/test?retryWrites=true&w=majority`;

    mongoose.connection.on('reconnected', () => {
      Logger.info(`Database re-onnected, worker process: ${process.pid}`);
    });

    mongoose.connection.on('connected', () => {
      Logger.info(`Database connected, worker process: ${process.pid}`);
    });

    mongoose.connection.on('disconnected', () => {
      Logger.info('Database disconnected');
    });

    mongoose.connection.on('close', () => {
      Logger.info('Database connection closed');
    });

    mongoose.connection.on('error', error => {
      Logger.error('Error while trying to connect to database: ' + error);
    });
  }

  async start() {
    try {
      await mongoose.connect(this.connectionString, {});
    } catch (error) {
      Logger.error(
        `Connection to database failed on worker: ${process.pid}, reason: ${error.message}`
      );
      process.exit(1);
    }
  }
}

export default new Mongo();
