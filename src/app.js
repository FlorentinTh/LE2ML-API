import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';

// import indexRouter from './server/routes/index';

var app = express();

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// app.use(express.static(path.join(__dirname, '../public')));

// app.use('/', indexRouter);

export default app;
