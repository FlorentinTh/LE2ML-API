#!/usr/bin/env node

/* eslint-disable no-unreachable */

/**
 * Module dependencies.
 */

// import http from 'http';
import app from '@App';
import logger from '@Logger';
import path from 'path';
import fs from 'fs';
import spdy from 'spdy';

import Config from '@Config';

const config = Config.getConfig();

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Load key and cert files
 */
const rootPath = path.resolve(path.join(__dirname, '..', '..'));

const options = {
  key: fs.readFileSync(path.resolve(rootPath, config.certs.key_path)),
  cert: fs.readFileSync(path.resolve(rootPath, config.certs.crt_path))
};

/**
 * Create HTTP server.
 */

// const server = http.createServer(app);

/**
 * Create HTTP/2 server.
 */

const server = spdy.createServer(options, app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

/**
 * @param val
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port))
    // named pipe
    return val;

  if (port >= 0)
    // port number
    return port;

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

/**
 * @param error
 */
function onError(error) {
  if (error.syscall !== 'listen') throw error;

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges.`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use.`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

/**
 *
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port: ' + addr.port;
  logger.info(`Server listening on ${bind}`);
}
