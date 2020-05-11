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
      await fs.promises.mkdir(path.join(basePath, 'inputs'));
      await fs.promises.mkdir(path.join(basePath, 'models'));
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
    if (!(typeof data === 'string')) {
      throw new Error('Expected type for argument data is String');
    }

    try {
      const res = yaml.safeDump(data, 'utf-8');
      return res;
    } catch (error) {
      Logger.error('Conversion from JSON to YML failed');
      throw new Error('Conversion failed');
    }
  }

  static async csvToJson(data) {
    const lines = data.replace(/\r/g, '').split(/\n/);
    const headers = lines[0].split(',');

    const result = [];

    let length = lines.length;
    if (lines[lines.length] === undefined) {
      length -= 1;
    }

    for (let i = 1; i < length; ++i) {
      const obj = {};
      const line = lines[i].split(',');

      for (let j = 0; j < headers.length; ++j) {
        const header = headers[j];
        obj[header] = line[j];
      }

      result.push(obj);
    }

    return result;
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
