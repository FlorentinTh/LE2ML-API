import http from 'http';
import Server from 'socket.io';
import ioAuth from 'socketio-auth';
import Adapter from 'socket.io-redis';
import Redis from '@Redis';
import Config from '@Config';
import Logger from '@Logger';

const config = Config.getConfig();

class WebSocket {
  constructor() {
    this.redis = Redis.createClient();
    this.port = this.normalizePort(config.ws.port);
    this.ws = http.createServer();
    this.redisAdapter = Adapter(Redis.getConfiguration());
    this.io = new Server();
  }

  async verifyUser(user) {}

  async run() {
    this.ws.listen(this.port);

    this.ws.on('error', error => {
      if (error.syscall !== 'listen') throw error;

      const bind = typeof port === 'string' ? 'Pipe ' + this.port : 'Port ' + this.port;

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
    });

    this.ws.on('listening', () => {
      const addr = this.ws.address();
      const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port: ' + addr.port;

      Logger.info(`WebSocket listening on ${bind}`);
    });

    this.io.attach(this.ws);
    this.io.adapter(this.redisAdapter);

    // ioAuth(io, {
    //   authenticate: async (socket, data, callback) => {
    //     const { token } = data;

    //     try {
    //       const user = await verifyUser(token);
    //       const canConnect = await redis.setAsync(
    //         `users:${user.id}`,
    //         socket.id,
    //         'NX',
    //         'EX',
    //         30
    //       );

    //       if (!canConnect) {
    //         return callback({ message: 'ALREADY_LOGGED_IN' });
    //       }

    //       socket.user = user;

    //       return callback(null, true);
    //     } catch (e) {
    //       console.log(`Socket ${socket.id} unauthorized.`);
    //       return callback({ message: 'UNAUTHORIZED' });
    //     }
    //   },
    //   postAuthenticate: async socket => {
    //     console.log(`Socket ${socket.id} authenticated.`);

    //     socket.conn.on('packet', async packet => {
    //       if (socket.auth && packet.type === 'ping') {
    //         await redis.setAsync(`users:${socket.user.id}`, socket.id, 'XX', 'EX', 30);
    //       }
    //     });
    //   },
    //   disconnect: async socket => {
    //     console.log(`Socket ${socket.id} disconnected.`);

    //     if (socket.user) {
    //       await redis.delAsync(`users:${socket.user.id}`);
    //     }
    //   }
    // });
  }

  normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
      return val;
    }

    if (port >= 0) {
      return port;
    }

    return false;
  }
}

// async function verifyUser(user) {
//   return new Promise((resolve, reject) => {
//     // const user = users.find(user => user.token === token);

//     if (!user) {
//       // return reject('USER_NOT_FOUND');
//     }

//     return resolve(user);
//   });
// }

export default new WebSocket();
