import httpStatus from 'http-status';
import APIError from '@APIError';
import fileType from './file.type';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import multer from 'multer';
import FileHelper from '../helpers/fileHelper';
import FileType from 'file-type';
import hideFile from 'hidefile';

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
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/vnd.ms-excel' ||
          file.mimetype === 'application/json'
        ) {
          cb(null, true);
        } else {
          cb(null, false);
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

  async uploadFileDone(req, res, next) {
    if (!req.file) {
      return next(
        new APIError(
          'File upload failed, only JSON and CSV files are allowed',
          httpStatus.UNPROCESSABLE_ENTITY
        )
      );
    }

    res.status(httpStatus.OK).json({
      data: req.file.filename,
      message: 'success'
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
        const validation = await FileHelper.validateJson(json);

        if (!validation.ok) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            data: validation.errors,
            message: 'error'
          });
        }

        const basePath = config.data.base_path;
        const fullPath = path.join(basePath, req.user.id, fileType.CONFIG + '.yml');

        try {
          await fs.promises.writeFile(fullPath, req.file.buffer);

          hideFile.hide(fullPath, (err, path) => {
            if (err) {
              throw new Error('Impossible to make file hidden');
            }
          });

          res.status(httpStatus.OK).json({
            data: null,
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
}

export default new FileController();
