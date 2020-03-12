import winston from 'winston';

const logFormat = winston.format.printf(({ level, message, label, timestamp }) => {
  return `[${label}]: ${timestamp} ${level}: ${message}`;
});

// eslint-disable-next-line new-cap
const logger = new winston.createLogger({
  format: winston.format.combine(
    winston.format.label({ label: 'API' }),
    winston.format.timestamp(),
    winston.format.colorize(),
    logFormat
  ),
  transports: [new winston.transports.Console({})]
});

export default logger;
