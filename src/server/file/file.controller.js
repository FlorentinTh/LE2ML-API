import httpStatus from 'http-status';
import APIError from '@APIError';
import fileType from './file.type';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import multer from 'multer';
import FileHelper from '../helpers/fileHelper';
import FileType from 'file-type';
import schemaType from './schema.type';
import fileMime from './file.mime';
import { validationResult } from 'express-validator';

const config = Config.getConfig();

class FileController {
  async getFiles(req, res, next) {
    const type = req.query.type;

    if (!Object.values(fileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type);

    let files;
    try {
      files = await fs.promises.readdir(fullPath);
    } catch (error) {
      return next(
        new APIError(
          'Unable to access to the directory',
          httpStatus.INTERNAL_SERVER_ERROR
        )
      );
    }

    const data = [];

    if (files.length > 0) {
      for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        let stats;
        try {
          stats = await fs.promises.stat(path.join(fullPath, file));
        } catch (error) {
          return next(
            new APIError('Unable to read some files', httpStatus.INTERNAL_SERVER_ERROR)
          );
        }

        data.push({
          filename: path.parse(file).name,
          type: file.split('.').pop(),
          size: stats.size,
          dateCreated: stats.birthtime
        });
      }
    }

    res.status(httpStatus.OK).json({
      data: data,
      message: 'success'
    });
  }

  async fileExists(req, res, next) {
    const type = req.query.type;

    if (!Object.values(fileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const filename = req.query.file;
    const userId = req.user.id;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type, filename);

    try {
      await fs.promises.access(fullPath);

      res.status(httpStatus.OK).json({
        data: true,
        message: `${filename} already exists`
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${filename} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.BAD_REQUEST));
      }
    }
  }

  async downloadFile(req, res, next) {
    const file = req.params.file;
    const userId = req.user.id;
    const type = req.query.type;
    const from = req.query.from;
    const to = req.query.to;

    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type, file);
    const destPath = path.join(basePath, userId, 'tmp', file.split('.')[0] + '.' + to);

    try {
      await fs.promises.access(fullPath);

      if (!(from === to)) {
        try {
          await fs.promises.access(destPath);

          res.status(httpStatus.OK).json({
            data: new URL(
              'http://127.0.0.1:8080/' +
                path.join(userId, 'tmp', file.split('.')[0] + '.' + to)
            ),
            message: 'success'
          });
        } catch (error) {
          if (error.code === 'ENOENT') {
            const opts = { encoding: 'utf-8' };
            const reader = fs.createReadStream(fullPath, opts);
            const writer = fs.createWriteStream(destPath, opts);

            if (from === 'csv' && to === 'json') {
              FileHelper.csvStreamToJsonFile(reader, writer);
            } else if (from === 'json' && to === 'csv') {
              FileHelper.jsonStreamToCsvFile(reader, writer);
            }

            writer.on('close', () => {
              res.status(httpStatus.OK).json({
                data: new URL(
                  'http://127.0.0.1:8080/' +
                    path.join(userId, 'tmp', file.split('.')[0] + '.' + to)
                ),
                message: 'success'
              });
            });
          }
        }
      } else {
        res.status(httpStatus.OK).json({
          data: new URL('http://127.0.0.1:8080/' + path.join(userId, type, file)),
          message: 'success'
        });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${file} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.BAD_REQUEST));
      }
    }
  }

  async uploadFile(req, res, next) {
    const type = req.query.type;

    if (!Object.values(fileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type);

    const uploader = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, fullPath);
        },
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        }
      }),
      fileFilter: async (req, file, cb) => {
        if (!Object.values(fileMime).includes(file.mimetype)) {
          cb(null, false);
        } else {
          const override = req.query.override === 'true';

          if (override) {
            try {
              await fs.promises.unlink(path.join(fullPath, file.originalname));
            } catch (error) {
              return next(
                new APIError('File override failed', httpStatus.INTERNAL_SERVER_ERROR)
              );
            }
          }
          cb(null, true);
        }
      }
    });

    const uploadFile = uploader.single('file-input');

    uploadFile(req, res, err => {
      if (err) {
        return next(new APIError('File upload failed', httpStatus.UNPROCESSABLE_ENTITY));
      }

      next();
    });
  }

  async convertFile(req, res, next) {
    if (!req.file) {
      return next(
        new APIError(
          'File upload failed, only JSON and CSV files are allowed',
          httpStatus.UNPROCESSABLE_ENTITY
        )
      );
    }

    if (req.file.mimetype === fileMime.JSON) {
      const userId = req.user.id;
      const type = req.query.type;
      const basePath = config.data.base_path;
      const file = req.file.filename;

      const opts = { encoding: 'utf-8' };
      const reader = fs.createReadStream(req.file.path, opts);

      const destPath = path.join(basePath, userId, type, `${file.split('.')[0]}.csv`);
      const writer = fs.createWriteStream(destPath, opts);

      FileHelper.jsonStreamToCsvFile(reader, writer);

      reader.on('close', async () => {
        try {
          await fs.promises.unlink(req.file.path);
          req.file.path = destPath;
          req.file.mimetype = fileMime.CSV;

          next();
        } catch (error) {
          return next(
            new APIError('File processing failed', httpStatus.INTERNAL_SERVER_ERROR)
          );
        }
      });
    } else if (req.file.mimetype === fileMime.CSV) {
      next();
    }
  }

  async validFile(req, res, next) {
    const opts = { encoding: 'utf-8' };
    const reader = fs.createReadStream(req.file.path, opts);
    let errorOccurs = false;

    reader.on('data', chunk => {
      reader.pause();

      const firstLine = chunk
        .toString()
        .replace(/\r/g, '')
        .split(/\n/)[0];

      const attributes = firstLine.split(',');

      if (!(attributes[attributes.length - 1] === 'label')) {
        errorOccurs = true;
      }
      reader.destroy();
    });

    reader.on('close', async () => {
      if (errorOccurs) {
        try {
          await fs.promises.unlink(req.file.path);
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            data: null,
            message: 'error'
          });
        } catch (error) {
          return next(
            new APIError('File processing failed', httpStatus.INTERNAL_SERVER_ERROR)
          );
        }
      }
      res.status(httpStatus.OK).json({
        data: req.file.filename,
        message: 'success'
      });
    });
  }

  async importConfig(req, res, next) {
    if (!Object.values(fileType).includes(fileType.CONFIG)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const uploader = multer({
      storage: multer.memoryStorage()
    });

    const uploadConfig = uploader.single('config');

    uploadConfig(req, res, err => {
      if (err) {
        return next(
          new APIError('Config import failed', httpStatus.UNPROCESSABLE_ENTITY)
        );
      }

      next();
    });
  }

  async processConfig(req, res, next) {
    if (!req.file) {
      return next(new APIError('Config import failed', httpStatus.UNPROCESSABLE_ENTITY));
    }

    try {
      const type = await FileType.fromBuffer(req.file.buffer);

      if (!(type === undefined)) {
        return next(
          new APIError('Not supported type of file', httpStatus.UNSUPPORTED_MEDIA_TYPE)
        );
      }
    } catch (error) {
      return next(
        new APIError('Fail to check type of file', httpStatus.UNSUPPORTED_MEDIA_TYPE)
      );
    }

    try {
      const json = await FileHelper.ymlToJson(req.file.buffer.toString());

      try {
        const validation = await FileHelper.validateJson(json, schemaType.CONFIG);

        if (!validation.ok) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            data: validation.errors,
            message: 'error'
          });
        }

        const basePath = config.data.base_path;
        const fullPath = path.join(
          basePath,
          req.user.id,
          'jobs',
          fileType.CONFIG + '.yml'
        );

        try {
          await fs.promises.writeFile(fullPath, req.file.buffer);

          res.status(httpStatus.OK).json({
            data: json,
            message: 'success'
          });
        } catch (error) {
          return next(
            new APIError(
              'Saving configuration file failed',
              httpStatus.INTERNAL_SERVER_ERROR
            )
          );
        }
      } catch (error) {
        return next(
          new APIError('File validation failed', httpStatus.UNPROCESSABLE_ENTITY)
        );
      }
    } catch (error) {
      return next(
        new APIError('File conversion failed', httpStatus.UNSUPPORTED_MEDIA_TYPE)
      );
    }
  }

  async convertConfig(req, res, next) {
    if (!Object.values(fileType).includes(fileType.CONFIG)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const conf = req.body;

    try {
      const validation = await FileHelper.validateJson(conf, schemaType.CONFIG);

      if (!validation.ok) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          data: validation.errors,
          message: 'error'
        });
      }

      try {
        const obj = JSON.parse(JSON.stringify(conf));
        const yml = await FileHelper.jsonToYml(obj);

        res.status(httpStatus.OK).json({
          data: yml,
          message: 'success'
        });
      } catch (error) {
        return next(
          new APIError('File conversion failed', httpStatus.INTERNAL_SERVER_ERROR)
        );
      }
    } catch (error) {
      return next(
        new APIError('File validation failed', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }
  }

  async renameFile(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const oldFilename = req.body.oldFilename;
    const newFilename = req.body.newFilename;
    const type = req.body.fileType;
    const userId = req.user.id;
    const basePath = config.data.base_path;

    const oldPath = path.join(basePath, userId, type, oldFilename);
    const newPath = path.join(basePath, userId, type, newFilename);

    try {
      await fs.promises.access(oldPath);

      try {
        await fs.promises.rename(oldPath, newPath);

        res.status(httpStatus.OK).json({
          data: {
            file: newFilename
          },
          message: 'File successfully renamed.'
        });
      } catch (error) {
        return next(
          new APIError(`Impossible to rename ${oldFilename}`, httpStatus.BAD_REQUEST)
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${oldFilename} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.BAD_REQUEST));
      }
    }
  }

  async removeFile(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const filename = req.body.filename;
    const type = req.body.fileType;
    const userId = req.user.id;
    const basePath = config.data.base_path;

    const fullPath = path.join(basePath, userId, type, filename);

    try {
      await fs.promises.access(fullPath);

      try {
        await fs.promises.unlink(fullPath);
        res.status(httpStatus.OK).json({
          data: {
            file: filename
          },
          message: 'File successfully deleted.'
        });
      } catch (error) {
        return next(
          new APIError(`Impossible to delete ${filename}`, httpStatus.BAD_REQUEST)
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${filename} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.BAD_REQUEST));
      }
    }
  }

  async streamDataFile(req, res, next) {
    const filename = req.params.file;
    const userId = req.user.id;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, fileType.RAW, filename);

    try {
      await fs.promises.access(fullPath);
      const readStream = fs.createReadStream(fullPath);
      readStream.pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${filename} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.BAD_REQUEST));
      }
    }
  }
}

export default new FileController();
