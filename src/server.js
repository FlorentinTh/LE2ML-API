import fs from 'fs';
import path from 'path';
// import spdy from 'spdy';
import https from 'https';
import express from 'express';
import favicon from 'serve-favicon';
import morgan from 'morgan';
import winston from './utils/logger';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import httpStatus from 'http-status';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import swaggerUI from 'swagger-ui-express';

import Config from '@Config';
import APIError from '@APIError';
import '@Passport';
import Mongo from '@Mongo';
import DocumentationBuilder from '@DocumentationBuilder';

import authRoutes from './server/auth/auth.routes';
import appsRoutes from './server/app/app.routes';
import usersRoutes from './server/user/user.routes';
import dataRoutes from './server/file/data/data.routes';
import dataInertialRoutes from './server/file/data/inertial/data.inertial.routes';
import confRoutes from './server/file/conf/conf.routes';
import dataSourcesRoutes from './server/data-source/data-source.routes';
import featuresRoutes from './server/feature/feature.routes';
import algosRoutes from './server/algorithm/algo.routes';
import windowsRoutes from './server/window/window.routes';
import jobsRoutes from './server/job/job.routes';
import logsRoutes from './server/job/log/log.routes';
import tasksRoutes from './server/job/task/task.routes';
import adminUsersRoutes from './server/user/admin/admin.user.routes';

const config = Config.getConfig();
const isDev = config.env === 'development';

const rootPath = isDev ? path.resolve(path.join(__dirname, '..')) : '';

const options = {
  key: fs.readFileSync(path.join(rootPath, config.certs.key_path)),
  cert: fs.readFileSync(path.join(rootPath, config.certs.crt_path))
};

const app = express();
const APIv1 = express();

const appServer = https.createServer(options, app);
// const appServer = spdy.createServer(options, app);

isDev ? app.use(morgan('dev')) : app.use(morgan('combined', { stream: winston.stream }));

app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.ico')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(helmet());

app.disable('x-powered-by');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

app.use(cors());
app.use(passport.initialize());

(async () => {
  await Mongo.start();
})();

const documentationBuilder = new DocumentationBuilder('v1');
const documentationFile = documentationBuilder.build();
const documentationStyle = documentationBuilder.getStyle();

APIv1.use(
  '/v1/api-doc',
  swaggerUI.serve,
  swaggerUI.setup(documentationFile, {
    customCss: documentationStyle,
    customSiteTitle: 'LE2ML API Documentation'
  })
);

APIv1.use('/v1', authRoutes);
APIv1.use('/v1/apps', appsRoutes);
APIv1.use('/v1/users', usersRoutes);
APIv1.use('/v1/files', dataRoutes);
APIv1.use('/v1/files', dataInertialRoutes);
APIv1.use('/v1/files', confRoutes);
APIv1.use('/v1/sources', dataSourcesRoutes);
APIv1.use('/v1/features', featuresRoutes);
APIv1.use('/v1/algos', algosRoutes);
APIv1.use('/v1/windows', windowsRoutes);
APIv1.use('/v1/jobs', jobsRoutes);
APIv1.use('/v1/jobs', logsRoutes);
APIv1.use('/v1/jobs', tasksRoutes);
APIv1.use('/v1/admin/users', adminUsersRoutes);
app.use('/api', APIv1);

app.use((req, res, next) => {
  const err = new APIError('API not found', httpStatus.NOT_FOUND);
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
