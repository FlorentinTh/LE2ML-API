import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import AjvFormat from 'ajv-formats';
import AjvAsync from 'ajv-async';
import hideFile from 'hidefile';
import Config from '@Config';
import Logger from '@Logger';
import schemaType from '../file/schema.type';
import stream from 'stream';
import csvjson from 'csvjson';
import JSONStream from 'jsonstream';
import Archiver from 'archiver';
import dayjs from 'dayjs';

const config = Config.getConfig();

class FileHelper {
  static validationErrorsHandler(errors) {
    if (!(typeof errors === 'object')) {
      throw new Error('Expected type for argument errors is Object.');
    }

    const errorsArray = [];

    if (errors.length > 0) {
      for (let i = 0; i < errors.length; ++i) {
        const error = errors[i];
        const entry = error.dataPath.split('/').slice(-1)[0];
        const message = error.message;
        errorsArray.push({ entry: entry, message: message });
      }
    }

    return errorsArray;
  }

  static async createDataDirectories(userId) {
    if (!(typeof userId === 'string')) {
      throw new Error('Expected type for argument userId is String');
    }

    const basePath = path.join(config.data.base_path, userId);

    try {
      await fs.promises.mkdir(basePath);
      await fs.promises.mkdir(path.join(basePath, 'raw'));
      await fs.promises.mkdir(path.join(basePath, 'models'));
      await fs.promises.mkdir(path.join(basePath, 'features'));
      await fs.promises.mkdir(path.join(basePath, 'jobs'));
      await fs.promises.mkdir(path.join(basePath, 'tmp'));
      hideFile.hide(path.join(basePath, 'tmp'), (err, path) => {
        if (err) {
          Logger.error(`Unable to create data directories for user ${userId}`);
          throw new Error('Unable to create data directories');
        }
      });
    } catch (error) {
      Logger.error(`Unable to create data directories for user ${userId}`);
      throw new Error('Unable to create data directories');
    }
  }

  static async removeDataDirectories(userId) {
    if (!(typeof userId === 'string')) {
      throw new Error('Expected type for argument userId is String');
    }

    const basePath = path.join(config.data.base_path, userId);
    const deletedPath = path.join(config.data.base_path, '.deleted');
    const destination = path.join(deletedPath, userId);

    try {
      await fs.promises.access(deletedPath);

      try {
        await fse.move(basePath, destination);
      } catch (error) {
        Logger.error(`Unable to remove data directories for user ${userId}`);
        throw new Error('Unable to remove data directories');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        try {
          await fs.promises.mkdir(deletedPath);
          hideFile.hide(deletedPath, (err, path) => {
            if (err) {
              Logger.error(`Unable to create deleted directory`);
              throw new Error('Unable to remove data directories');
            }
          });
        } catch (error) {
          Logger.error(`Unable to remove data directories for user ${userId}`);
          throw new Error('Unable to remove data directories');
        }
      } else {
        Logger.error(`Unable to remove data directories for user ${userId}`);
        throw new Error('Unable to remove data directories');
      }
    }
  }

  static async ymlToJson(data) {
    if (!(typeof data === 'string')) {
      throw new Error('Expected type for argument data is String');
    }

    try {
      const res = yaml.safeLoad(data, 'utf-8');
      return res;
    } catch (error) {
      Logger.error('Conversion from YML to JSON failed');
      throw new Error('Conversion failed');
    }
  }

  static async jsonToYml(data) {
    if (!(typeof data === 'object')) {
      throw new Error('Expected type for argument data is Object');
    }

    try {
      const res = yaml.safeDump(data, 'utf-8');
      return res;
    } catch (error) {
      Logger.error('Conversion from JSON to YML failed');
      throw new Error('Conversion failed');
    }
  }

  static csvStreamToJsonFile(reader, writer) {
    if (!(typeof reader === 'object')) {
      throw new Error('Expected type for argument reader is Object');
    }

    if (!(typeof writer === 'object')) {
      throw new Error('Expected type for argument writer is Object');
    }

    const toObject = csvjson.stream.toObject();
    const stringify = csvjson.stream.stringify(4);
    reader
      .pipe(toObject)
      .pipe(stringify)
      .pipe(writer);
  }

  static jsonStreamToCsvFile(reader, writer) {
    if (!(typeof reader === 'object')) {
      throw new Error('Expected type for argument reader is Object');
    }

    if (!(typeof writer === 'object')) {
      throw new Error('Expected type for argument writer is Object');
    }

    let line = 0;
    const jsonToCsv = new stream.Transform({
      transform: function transformer(chunk, encoding, callback) {
        line++;
        callback(
          null,
          csvjson.toCSV(chunk, {
            headers: line > 1 ? 'none' : 'key'
          })
        );
      },
      readableObjectMode: true,
      writableObjectMode: true
    });

    reader
      .pipe(JSONStream.parse('*'))
      .pipe(jsonToCsv)
      .pipe(writer);
  }

  static zipFile(filePath, filename, destFolder, callback) {
    if (!(typeof filePath === 'string')) {
      throw new Error('Expected type for argument filePath is String');
    }

    if (!(typeof filename === 'string')) {
      throw new Error('Expected type for argument filename is String');
    }

    if (!(typeof destFolder === 'string')) {
      throw new Error('Expected type for argument destFolder is String');
    }

    if (!(typeof callback === 'function')) {
      throw new Error('Expected type for argument writer is Function');
    }

    const basePath = config.data.base_path;
    const archivePath = path.join(destFolder, `${dayjs().format('YYYYMMDDHHmmss')}.zip`);

    const archive = fs.createWriteStream(path.join(basePath, archivePath));
    const archiver = Archiver('zip');

    archive.on('close', () => {
      callback(null, archivePath);
    });

    archive.on('error', err => {
      if (err) {
        callback(err, null);
      }
    });

    archiver.pipe(archive);
    archiver
      .append(fs.createReadStream(filePath), {
        name: filename
      })
      .finalize();
  }

  static async validateJson(data, type) {
    if (!(typeof data === 'object')) {
      throw new Error('Expected type for argument data is Object');
    }

    if (!Object.values(schemaType).includes(type)) {
      throw new Error('Unknown schema type');
    }

    const basePath = config.data.base_path;

    try {
      const file = await fs.promises.readFile(
        path.resolve(basePath, config.schemas[type])
      );

      const schema = JSON.parse(file);
      const ajv = new Ajv({ allErrors: true, jsonPointers: true });

      AjvAsync(ajv);
      AjvFormat(ajv);

      const validate = ajv.compile(schema);

      try {
        const valid = await validate(data);
        const res = {
          ok: false,
          errors: null
        };

        if (!valid) {
          res.errors = this.validationErrorsHandler(validate.errors);
        } else {
          res.ok = true;
        }

        return res;
      } catch (error) {
        Logger.error('JSON Validation failed');
        throw new Error('JSON Validation failed');
      }
    } catch (error) {
      Logger.error('JSON schema not found');
      throw new Error('JSON schema not found');
    }
  }
}

export default FileHelper;
