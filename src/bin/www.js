#!/usr/bin/env node

/* eslint-disable no-unreachable */
import http from 'http';
import Server from '@Server';
import Logger from '@Logger';
import path from 'path';
import fs from 'fs';
import spdy from 'spdy';
import Config from '@Config';

const config = Config.getConfig();

const port = normalizePort(process.env.PORT || config.port);
Server.set('port', port);

const rootPath = path.resolve(path.join(__dirname, '..', '..'));

const options = {
  key: fs.readFileSync(path.resolve(rootPath, config.certs.key_path)),
  cert: fs.readFileSync(path.resolve(rootPath, config.certs.crt_path))
};

// const httpServer = http.createServer(server);
const spdyServer = spdy.createServer(options, Server);

spdyServer.listen(port);
spdyServer.on('error', onError);
spdyServer.on('listening', onListening);

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
  const addr = spdyServer.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port: ' + addr.port;

  Logger.info(`Server listening on ${bind}`);
}
