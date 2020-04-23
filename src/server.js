import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compress from 'compression';
import cors from 'cors';
import httpStatus from 'http-status';
import helmet from 'helmet';
import passport from 'passport';
import WS from '@WS';
import Config from '@Config';
import APIError from '@APIError';
import '@Passport';
import Mongo from '@Mongo';
import authRoutes from './server/auth/auth.routes';
import userRoutes from './server/user/user.routes';
import filesRoutes from './server/file/file.routes';
import featuresRoutes from './server/feature/feature.routes';
import adminUsersRoutes from './server/admin/user/admin.user.routes';

const config = Config.getConfig();
const isDev = config.env === 'development';

const server = express();
const APIv1 = express();

if (isDev) {
  server.use(logger('dev'));
}

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(compress());
server.use(helmet());
server.use(cors());
server.use(passport.initialize());

Mongo.run();
WS.run();

APIv1.use('/v1', authRoutes);
APIv1.use('/v1/users', userRoutes);
APIv1.use('/v1/files', filesRoutes);
APIv1.use('/v1/features', featuresRoutes);
APIv1.use('/v1/admin/users', adminUsersRoutes);
server.use('/api', APIv1);

server.use((req, res, next) => {
  const err = new APIError('API not found.', httpStatus.NOT_FOUND);
  next(err);
});

server.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    status: 'error',
    code: err.status,
    message: err.message
  });
});

export default server;
