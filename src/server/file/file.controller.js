import httpStatus from 'http-status';
import APIError from '@APIError';
import fileType from './file.type';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import multer from 'multer';
import FileHelper from '../helpers/fileHelper';
import StreamHelper from '../helpers/streamHelper';
import FileType from 'file-type';
import schemaType from './schema.type';
import fileMime from './file.mime';
import { validationResult } from 'express-validator';
import striplines from 'striplines';
import csv from 'csv';
import AlgoController from '../algorithm/algo.controller';
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

    const filename = req.params.file;
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
    const destPath = path.join(basePath, userId, '.tmp', file.split('.')[0] + '.' + to);

    try {
      await fs.promises.access(fullPath);

      if (!(from === to)) {
        const opts = { encoding: 'utf-8' };
        const reader = fs.createReadStream(fullPath, opts);
        const writer = fs.createWriteStream(destPath, opts);

        if (from === 'csv' && to === 'json') {
          req.setTimeout(15 * 60 * 1000);
          await StreamHelper.csvStreamToJsonFile(fullPath, reader, writer);
        }

        writer.on('close', async () => {
          StreamHelper.zipFileStream(
            destPath,
            file.split('.')[0] + '.' + to,
            path.join(userId, '.tmp'),
            async (err, path) => {
              if (err) {
                return next(
                  new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR)
                );
              } else {
                await fs.promises.unlink(destPath);
                res.status(httpStatus.OK).json({
                  data: path,
                  message: 'success'
                });
              }
            }
          );
        });
      } else {
        StreamHelper.zipFileStream(
          fullPath,
          file,
          path.join(userId, '.tmp'),
          (err, path) => {
            if (err) {
              return next(
                new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR)
              );
            } else {
              res.status(httpStatus.OK).json({
                data: path,
                message: 'success'
              });
            }
          }
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${file} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }
  }

  async getFileHeaders(req, res, next) {
    const file = req.params.file;
    const userId = req.user.id;
    const type = req.query.type;

    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type, file);

    try {
      await fs.promises.access(fullPath);

      const lines = await StreamHelper.getFirstLineStream(fullPath);

      const attributes = lines.split(',');
      const data = [];

      for (let i = 0; i < attributes.length; ++i) {
        const attribute = attributes[i];
        data.push({ pos: i, label: attribute });
      }

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${file} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
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
      req.setTimeout(15 * 60 * 1000);
      const userId = req.user.id;
      const type = req.query.type;
      const basePath = config.data.base_path;
      const file = req.file.filename;

      const opts = { encoding: 'utf-8' };
      const reader = fs.createReadStream(req.file.path, opts);

      const destPath = path.join(basePath, userId, type, `${file.split('.')[0]}.csv`);
      const writer = fs.createWriteStream(destPath, opts);

      StreamHelper.jsonStreamToCsvFile(reader, writer);

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
    const algo = req.query.algo;
    const container = req.query.container;

    if (!Object.values(fileType).includes(fileType.CONFIG)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const uploader = multer({
      storage: multer.memoryStorage()
    });

    let uploadConfig;
    if (!(algo === undefined)) {
      uploadConfig = uploader.single(container + '.' + algo);
    } else {
      uploadConfig = uploader.single('config');
    }

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

    const algo = req.query.algo;

    try {
      let json;
      if (!(algo === undefined)) {
        json = JSON.parse(req.file.buffer.toString());
      } else {
        json = await FileHelper.ymlToJson(req.file.buffer.toString());
      }

      let version = req.query.v;

      if (version === undefined) {
        version = json.version;
      }

      const schema = algo === undefined ? schemaType.CONFIG : schemaType.ALGO;

      try {
        const validation = await FileHelper.validateJson(json, version, schema);

        if (!validation.ok) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            data: validation.errors,
            message: 'error'
          });
        }

        const container = req.query.container;
        const basePath = config.data.base_path;
        let folderPath;
        let fullPath;
        if (!(algo === undefined)) {
          folderPath = path.join(basePath, '.app-data', 'algorithms', container);
          fullPath = path.join(folderPath, algo + '.json');
        } else {
          return res.status(httpStatus.OK).json({
            data: json,
            message: 'Configuration successfully imported'
          });
        }

        try {
          await fs.promises.mkdir(folderPath, { recursive: true });
        } catch (error) {
          return next(
            new APIError(
              'Saving configuration file failed',
              httpStatus.INTERNAL_SERVER_ERROR
            )
          );
        }

        try {
          await fs.promises.writeFile(fullPath, req.file.buffer);

          if (!(algo === undefined)) {
            const id = req.query.id;
            const update = await AlgoController.updateAlgoConf(id, algo + '.json');

            if (update.ok) {
              res.status(httpStatus.OK).json({
                data: {
                  algo: update.data,
                  file: algo + '.json'
                },
                message: 'File successfully imported'
              });
            } else {
              return next(
                new APIError('Updating database failed', httpStatus.INTERNAL_SERVER_ERROR)
              );
            }
          }
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
    const version = req.query.v;

    try {
      const validation = await FileHelper.validateJson(conf, version, schemaType.CONFIG);

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

  async removeAttributes(req, res, next) {
    req.setTimeout(15 * 60 * 1000);
    const modifications = req.body.modifications;

    if (modifications === null) {
      return next(
        new APIError('No modifications to apply', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const file = req.params.file;
    const userId = req.user.id;
    const type = req.query.type;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type, file);

    try {
      await fs.promises.access(fullPath);

      if (Object.values(modifications).includes('none')) {
        const line = await StreamHelper.getFirstLineStream(fullPath);
        const attributes = line.split(',');

        const colsToRemove = [];

        for (let i = 0; i < attributes.length; ++i) {
          const attribute = attributes[i];
          for (const [key, value] of Object.entries(modifications)) {
            if (value === 'none' && key === attribute) {
              colsToRemove.push(i);
              delete modifications[key];
            }
          }
        }

        const opts = { encoding: 'utf-8' };
        const input = fs.createReadStream(fullPath, opts);
        const output = fs.createWriteStream(fullPath + '.tmp', opts);
        input
          .pipe(csv.parse())
          .pipe(
            csv.transform(record => {
              return record.filter((value, index) => {
                if (!colsToRemove.includes(index)) {
                  return value;
                }
              });
            })
          )
          .pipe(csv.stringify())
          .pipe(output);

        output.on('error', () => {
          return next(
            new APIError('File transform error', httpStatus.INTERNAL_SERVER_ERROR)
          );
        });

        output.on('close', async () => {
          next();
        });
      } else {
        next();
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return next(
          new APIError(`${file} does not exist`, httpStatus.UNPROCESSABLE_ENTITY)
        );
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }
  }

  async renameAttributes(req, res, next) {
    const modifications = req.body.modifications;

    if (modifications === null) {
      return next(
        new APIError('No modifications to apply', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    if (Object.keys(modifications).length === 0) {
      next();
    } else {
      const file = req.params.file;
      const userId = req.user.id;
      const type = req.query.type;
      const basePath = config.data.base_path;
      const fullPath = path.join(basePath, userId, type, file);

      let sourcePath;
      let removeFile = false;

      try {
        await fs.promises.access(fullPath + '.tmp');
        sourcePath = fullPath + '.tmp';
        removeFile = true;
      } catch (error) {
        if (error.code === 'ENOENT') {
          sourcePath = fullPath;
        }
      }

      try {
        const line = await StreamHelper.getFirstLineStream(sourcePath);
        const attributes = line.split(',');
        const attributesList = [];

        for (let i = 0; i < attributes.length; ++i) {
          const attribute = attributes[i];

          if (Object.keys(modifications).includes(attribute)) {
            const value = modifications[attribute];
            attributesList.push(value);
            delete modifications[attribute];
          } else {
            attributesList.push(attribute);
          }
        }

        const attributesLine = attributesList.join(',');

        const opts = { encoding: 'utf-8' };
        const input = fs.createReadStream(sourcePath, opts);
        const output = fs.createWriteStream(fullPath + '.edit.tmp', opts);

        output.write(attributesLine + '\n');

        input.pipe(striplines(1)).pipe(output);

        output.on('error', () => {
          return next(
            new APIError('File transform error', httpStatus.INTERNAL_SERVER_ERROR)
          );
        });

        output.on('close', async () => {
          if (removeFile) {
            await fs.promises.unlink(sourcePath);
          }
          await fs.promises.rename(fullPath + '.edit.tmp', sourcePath + '.tmp');
          next();
        });
      } catch (error) {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }
  }

  async editDone(req, res, next) {
    const modifications = req.body.modifications;

    if (!(Object.keys(modifications).length === 0)) {
      return next(
        new APIError(
          'All modifications were not applied',
          httpStatus.UNPROCESSABLE_ENTITY
        )
      );
    }

    const file = req.params.file;
    const userId = req.user.id;
    const type = req.query.type;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type, file);

    try {
      await fs.promises.access(fullPath + '.tmp');

      const override = req.query.override;
      const newFilename = req.body.newFilename;

      if (override && newFilename === null) {
        await fs.promises.unlink(fullPath);
        await fs.promises.rename(fullPath + '.tmp', fullPath);

        res.status(httpStatus.OK).json({
          data: {
            file: file
          },
          message: 'File successfully modified.'
        });
      } else {
        await fs.promises.rename(
          fullPath + '.tmp',
          path.join(basePath, userId, type, newFilename)
        );

        res.status(httpStatus.OK).json({
          data: {
            file: newFilename
          },
          message: 'New file successfully created.'
        });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return next(
          new APIError(`${file} does not exist`, httpStatus.UNPROCESSABLE_ENTITY)
        );
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
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
    const fileType = req.query.type;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, fileType, filename);
    const tempPath = path.join(basePath, userId, fileType, '.' + filename + '.tmp');

    const att = req.query.att;

    const line = await StreamHelper.getFirstLineStream(fullPath);
    const attributes = line.split(',');

    try {
      await fs.promises.access(fullPath);

      let attIndex;

      for (let i = 0; i < attributes.length; ++i) {
        if (att === attributes[i]) {
          attIndex = i;
        }
      }

      const opts = { encoding: 'utf-8' };
      const input = fs.createReadStream(fullPath, opts);
      const output = fs.createWriteStream(tempPath, opts);

      input
        .pipe(csv.parse())
        .pipe(
          csv.transform(record => {
            return record.filter((value, index) => {
              if (attIndex === index) {
                return value;
              }
            });
          })
        )
        .pipe(csv.stringify())
        .pipe(output);

      output.on('close', async () => {
        if (att === 'label') {
          StreamHelper.getBarChartData(tempPath).then(data => {
            res.write(data);
            res.end();
          });
        } else {
          const fileStream = fs.createReadStream(tempPath, {
            encoding: 'utf-8'
          });
          fileStream.on('data', chunk => {
            res.write(chunk);
          });
          fileStream.on('close', async () => {
            await fs.promises.unlink(tempPath);
            res.end();
          });
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(httpStatus.OK).json({
          data: false,
          message: `${filename} does not exist`
        });
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }
  }
}

export default new FileController();
