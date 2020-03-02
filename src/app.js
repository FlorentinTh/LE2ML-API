import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compress from 'compression';
import cors from 'cors';
import httpStatus from 'http-status';
import helmet from 'helmet';
import passport from 'passport';
import Config from '@Config';
import APIError from '@APIError';
import '@Passport';
import Mongo from '@Mongo';
import routes from './server/auth/auth.routes';

const isDev = Config.getConfig().env === 'development';

const app = express();
const v1 = express();

if (isDev) {
	app.use(logger('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(compress());

app.use(helmet());

app.use(cors());

app.use(passport.initialize());

Mongo.run();

v1.use('/v1', routes);
app.use('/api', v1);


app.use((req, res, next) => {
	const err = new APIError('API not found', httpStatus.NOT_FOUND);
	next(err);
});


app.use((err, req, res, next) => {
	res.status(err.status || 500).json({
		status: 'error',
		code: err.status,
		message: err.message
	  });
});

export default app;
