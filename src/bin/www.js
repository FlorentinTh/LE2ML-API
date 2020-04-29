#!/usr/bin/env node

/* eslint-disable no-unreachable */
import { app, http2Server } from '@Server';
import Logger from '@Logger';
import Config from '@Config';

const config = Config.getConfig();

const port = normalizePort(process.env.PORT || config.port);
app.set('port', port);

http2Server.listen(port);
http2Server.on('error', onError);
http2Server.on('listening', onListening);

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') throw error;

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      Logger.error(`${bind} requires elevated privileges.`);
      process.exit(1);
    case 'EADDRINUSE':
      Logger.error(`${bind} is already in use.`);
      process.exit(1);
    default:
      throw error;
  }
}

function onListening() {
  const addr = http2Server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port: ' + addr.port;

  Logger.info(`Server listening on ${bind}`);
}
