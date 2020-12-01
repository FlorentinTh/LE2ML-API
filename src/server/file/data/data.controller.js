import httpStatus from 'http-status';
import APIError from '@APIError';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import StreamHelper from '@StreamHelper';
import { FileType } from '../file.enums';
import { validationResult } from 'express-validator';
import striplines from 'striplines';
import csv from 'csv';
import readdirp from 'readdirp';

const config = Config.getConfig();

class DataController {
  async getFiles(req, res, next) {
    const type = req.query.type;

    if (!Object.values(FileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;
    const source = req.query.source;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, type);

    let files;
    try {
      const entries = await readdirp.promise(fullPath);
      files = entries.map(file => file);
    } catch (error) {
      return res.status(httpStatus.OK).json({
        data: [],
        message: 'success'
      });
    }

    const data = [];

    if (files.length > 0) {
      for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        let stats;
        try {
          stats = await fs.promises.stat(path.resolve(file.fullPath));
        } catch (error) {
          return next(
            new APIError('Unable to read some files', httpStatus.INTERNAL_SERVER_ERROR)
          );
        }

        data.push({
          filename: path.parse(file.basename).name,
          type: file.basename.split('.').pop(),
          size: stats.size,
          dateCreated: stats.birthtime,
          container:
            type === FileType.MODEL
              ? path.basename(path.dirname(path.resolve(file.fullPath)))
              : null
        });
      }
    }

    res.status(httpStatus.OK).json({
      data: data,
      message: 'success'
    });
  }

  async isFileExists(req, res, next) {
    const type = req.query.type;

    if (!Object.values(FileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const filename = req.params.file;
    const userId = req.user.id;
    const source = req.query.source;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, type, filename);

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
    req.setTimeout(0);
    const file = req.params.file;
    const userId = req.user.id;
    const source = req.query.source;
    const type = req.query.type;
    const from = req.query.from;
    const to = req.query.to;

    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, type, file);
    const destPath = path.join(basePath, userId, '.tmp', file.split('.')[0] + '.' + to);

    try {
      await fs.promises.access(fullPath);

      if (!(from === to)) {
        const opts = { encoding: 'utf-8' };
        const reader = fs.createReadStream(fullPath, opts);
        const writer = fs.createWriteStream(destPath, opts);

        if (from === 'csv' && to === 'json') {
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
    const source = req.query.source;
    const type = req.query.type;

    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, type, file);

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
    const source = req.query.source;
    const basePath = config.data.base_path;

    const oldPath = path.join(basePath, userId, 'data', source, type, oldFilename);
    const newPath = path.join(basePath, userId, 'data', source, type, newFilename);

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
    req.setTimeout(0);

    const modifications = req.body.modifications;

    if (modifications === null) {
      return next(
        new APIError('No modifications to apply', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const file = req.params.file;
    const userId = req.user.id;
    const type = req.query.type;
    const source = req.query.source;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, type, file);

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
                return null;
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
      const source = req.query.source;
      const basePath = config.data.base_path;
      const fullPath = path.join(basePath, userId, 'data', source, type, file);

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
          await fs.promises.rename(fullPath + '.edit.tmp', fullPath + '.tmp');

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
    const source = req.query.source;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, type, file);

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
          path.join(basePath, userId, 'data', source, type, newFilename)
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
    const source = req.query.source;
    const basePath = config.data.base_path;

    const fullPath = path.join(basePath, userId, 'data', source, type, filename);

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

  async streamFile(req, res, next) {
    const filename = req.params.file;
    const userId = req.user.id;
    const source = req.query.source;
    const fileType = req.query.type;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', source, fileType, filename);
    const tempPath = path.join(
      basePath,
      userId,
      'data',
      source,
      fileType,
      '.' + filename + '.tmp'
    );

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
              return null;
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

export default new DataController();
