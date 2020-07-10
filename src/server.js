import fs from 'fs';
import path from 'path';
import spdy from 'spdy';
import express from 'express';
import morgan from 'morgan';
import winston from './utils/logger';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import httpStatus from 'http-status';
import helmet from 'helmet';
import passport from 'passport';
import Config from '@Config';
import APIError from '@APIError';
import '@Passport';
import Mongo from '@Mongo';
import authRoutes from './server/auth/auth.routes';
import appRoutes from './server/app/app.routes';
import userRoutes from './server/user/user.routes';
import filesRoutes from './server/file/file.routes';
import featuresRoutes from './server/feature/feature.routes';
import algosRoutes from './server/algorithm/algo.routes';
import windowsRoutes from './server/window/window.routes';
import jobsRoutes from './server/job/job.routes';
import adminUsersRoutes from './server/admin/user/admin.user.routes';

const config = Config.getConfig();
const isDev = config.env === 'development';
const rootPath = path.resolve(path.join(__dirname, '..'));

const options = {
  key: fs.readFileSync(path.resolve(rootPath, config.certs.key_path)),
  cert: fs.readFileSync(path.resolve(rootPath, config.certs.crt_path))
};

const app = express();
const APIv1 = express();

const appServer = spdy.createServer(options, app);

isDev ? app.use(morgan('dev')) : app.use(morgan('combined'), { stream: winston.stream });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(cors());
app.use(passport.initialize());

Mongo.start();

APIv1.use('/v1', authRoutes);
APIv1.use('/v1/apps', appRoutes);
APIv1.use('/v1/users', userRoutes);
APIv1.use('/v1/files', filesRoutes);
APIv1.use('/v1/features', featuresRoutes);
APIv1.use('/v1/algos', algosRoutes);
APIv1.use('/v1/windows/', windowsRoutes);
APIv1.use('/v1/jobs/', jobsRoutes);
APIv1.use('/v1/admin/users', adminUsersRoutes);
app.use('/api', APIv1);

app.use((req, res, next) => {
  const err = new APIError('API not found.', httpStatus.NOT_FOUND);
  next(err);
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  winston.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${
      req.ip
    }`
  );

  res.status(err.status || 500).json({
    status: 'error',
    code: err.status,
    message: err.message
  });
});

export { app, appServer };
