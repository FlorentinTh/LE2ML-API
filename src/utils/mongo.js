import mongoose from 'mongoose';
import MongooseConnectionConfig from 'mongoose-connection-config';
import logger from '@logger';
import config from '@config';

const defaultOptions = {
	host: config.mongo.host,
	port: config.mongo.port,
	database: config.mongo.db,
	connectOptions: {
		user: config.mongo.user,
		pass: config.mongo.password
	}
};

mongoose.Promise = global.Promise;

class Mongo {
	constructor(options = defaultOptions) {
		this.options = options;
	}

	async run() {
		const connectionConfig = new MongooseConnectionConfig(this.options);

		await mongoose.connect(connectionConfig.getMongoUri(), {});

		mongoose.connection.on('connected', () => {
			logger.info('Successfully connected to mongo');
		});

		mongoose.connection.on('reconnected', () => {
			logger.info('Successfully re-connected to mongo');
		});

		mongoose.connection.on('disconnected', () => {
			logger.info('Successfully disconnected from mongo');
		});

		mongoose.connection.on('close', () => {
			logger.info('Connection to mongo successfully closed');
		});

		mongoose.connection.on('error', (error) => {
			logger.error('ERROR: ' + error);
		});
	}
}

module.exports = Mongo;
