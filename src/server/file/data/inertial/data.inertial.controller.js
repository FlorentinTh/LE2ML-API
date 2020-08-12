import httpStatus from 'http-status';
import APIError from '@APIError';
import path from 'path';
import fs from 'fs';
import Config from '@Config';
import multer from 'multer';
import StreamHelper from '@StreamHelper';
import { FileType, FileMime } from '../../file.enums';
import FileHelper from '../../../../helpers/file.helper';

const config = Config.getConfig();

class DataInertialController {
  async uploadInertialFile(req, res, next) {
    const type = req.query.type;

    if (!Object.values(FileType).includes(type)) {
      return next(new APIError('Unknown type', httpStatus.BAD_REQUEST));
    }

    const userId = req.user.id;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, userId, 'data', 'inertial', type);

    try {
      await fs.promises.access(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.promises.mkdir(fullPath, { recursive: true, mode: 755 });
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }

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
        if (!Object.values(FileMime).includes(file.mimetype)) {
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

  async convertInertialFile(req, res, next) {
    req.setTimeout(0);

    if (!req.file) {
      return next(
        new APIError(
          'File upload failed, only JSON and CSV files are allowed',
          httpStatus.UNPROCESSABLE_ENTITY
        )
      );
    }

    if (req.file.mimetype === FileMime.JSON) {
      const userId = req.user.id;
      const type = req.query.type;
      const basePath = config.data.base_path;
      const file = req.file.filename;

      const opts = { encoding: 'utf-8' };
      const reader = fs.createReadStream(req.file.path, opts);

      const destPath = path.join(
        basePath,
        userId,
        'data',
        'inertial',
        type,
        `${file.split('.')[0]}.csv`
      );
      const writer = fs.createWriteStream(destPath, opts);

      StreamHelper.jsonStreamToCsvFile(reader, writer);

      reader.on('close', async () => {
        try {
          await fs.promises.unlink(req.file.path);
          req.file.path = destPath;
          req.file.mimetype = FileMime.CSV;

          next();
        } catch (error) {
          return next(
            new APIError('File processing failed', httpStatus.INTERNAL_SERVER_ERROR)
          );
        }
      });
    } else if (req.file.mimetype === FileMime.CSV) {
      next();
    }
  }

  async validInertialFile(req, res, next) {
    const opts = { encoding: 'utf-8' };
    const reader = fs.createReadStream(req.file.path, opts);
    let isValid = false;

    reader.on('data', async chunk => {
      reader.pause();

      const firstLine = chunk
        .toString()
        .replace(/\r/g, '')
        .split(/\n/)[0];

      const attributes = firstLine.split(',');
      isValid = await FileHelper.validateInertialFile(attributes);
      reader.destroy();
    });

    reader.on('close', async () => {
      if (!isValid) {
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
}

export default new DataInertialController();
