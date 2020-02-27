import mongoose from 'mongoose';
import logger from '@Logger';
import Config from '@Config';

const config = Config.getConfig();

mongoose.Promise = global.Promise;

class Mongo {
	constructor() {
		this.connectionString = `mongodb://${config.mongo.user}:${config.mongo.password}@${config.mongo.host}:${config.mongo.port}/${config.mongo.db}?authSource=admin&w=1`;
	}

	async run() {
		try {
			await mongoose.connect(this.connectionString, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
				useCreateIndex: true,
				auth: {
					authdb: 'admin'
				}
			});
		}
		catch (error) {
			logger.error(`Connection to database failed, error: ${error.message} on worker process: ${process.pid}`);
			process.exit(1);
		}

		mongoose.connection.on('connected', () => {
			logger.info(`Connected to database on Worker process: ${process.pid}`);
		});

		mongoose.connection.on('reconnected', () => {
			logger.info(`Re-onnected to database on Worker process: ${process.pid}`);
		});

		mongoose.connection.on('disconnected', () => {
			logger.info('Disconnected from database');
		});

		mongoose.connection.on('close', () => {
			logger.info('Connection to database closed');
		});

		mongoose.connection.on('error', (error) => {
			logger.error('ERROR: ' + error);
		});
	}
}

module.exports = new Mongo();
