import httpStatus from 'http-status';
import APIError from '@APIError';
import fileType from './fileType';
import path from 'path';
import { promises as fs } from 'fs';

class FileController {
  async getFiles(req, res, next) {
    const type = req.query.type;
    const userId = req.user.id;

    if (!Object.values(fileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const basePath = path.normalize('D:/Development/PiCluster-data');
    const fullPath = path.join(basePath, userId, type);

    let files;
    try {
      files = await fs.readdir(fullPath);
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
          stats = await fs.stat(path.join(fullPath, file));
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

  async uploadFile(req, res, next) {}
}

export default new FileController();
