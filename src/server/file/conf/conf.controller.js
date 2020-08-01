import httpStatus from 'http-status';
import APIError from '@APIError';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import multer from 'multer';
import FileHelper from '@FileHelper';
import fileType from 'file-type';
import { FileType } from '../file.enums';
import { SchemaType } from './conf.enums';
import AlgoController from '../../algorithm/algo.controller';

const config = Config.getConfig();

class ConfController {
  async importConfig(req, res, next) {
    const algo = req.query.algo;
    const container = req.query.container;

    if (!Object.values(FileType).includes(FileType.CONFIG)) {
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
      const type = await fileType.fromBuffer(req.file.buffer);

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

      const schema = algo === undefined ? SchemaType.CONFIG : SchemaType.ALGO;

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
    if (!Object.values(FileType).includes(FileType.CONFIG)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const conf = req.body;
    const version = req.query.v;

    try {
      const validation = await FileHelper.validateJson(conf, version, SchemaType.CONFIG);

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
}

export default new ConfController();
