import httpStatus from 'http-status';
import APIError from '@APIError';
import fileType from './fileType';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import formidable from 'formidable';

const config = Config.getConfig();

class FileController {
  async getFiles(req, res, next) {
    const type = req.query.type;
    const userId = req.user.id;

    if (!Object.values(fileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, type);

    let files;
    try {
      files = await fs.promises.readdir(fullPath);
    } catch (error) {
      return next(
        new APIError(
          `Unable to access directory ${fullPath}`,
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
            new APIError(`Unable to read file ${file}`, httpStatus.INTERNAL_SERVER_ERROR)
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

  async uploadFile(req, res, next) {
    const type = req.query.type;
    const userId = req.user.id;
    const override = req.query.override || false;

    const basePath = config.data.base_path;

    if (!Object.values(fileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    let exists = true;

    if (!override) {
      const filename = req.body.filename;
      const fullPath = path.join(basePath, userId, type, filename);

      try {
        await fs.promises.stat(fullPath);
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          exists = false;
        }
      }

      res.status(httpStatus.OK).json({
        data: exists,
        message: exists ? 'File already exists' : null
      });
    } else {
      const form = new formidable.IncomingForm();

      let filename;
      let pathError = false;

      form
        .parse(req)
        .on('fileBegin', async (name, file) => {
          filename = file.name;
          try {
            file.path = path.join(basePath, userId, type, file.name);
          } catch (error) {
            pathError = true;
          }
        })
        .on('error', () => {
          return next(
            new APIError('File upload failed.', httpStatus.INTERNAL_SERVER_ERROR)
          );
        })
        .on('end', () => {
          if (pathError) {
            return next(
              new APIError('File upload failed.', httpStatus.INTERNAL_SERVER_ERROR)
            );
          }

          res.status(httpStatus.OK).json({
            data: filename,
            message: 'success'
          });
        });
    }
  }
}

export default new FileController();
