import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import AjvFormat from 'ajv-formats';
import hideFile from 'hidefile';
import Config from '@Config';
import Logger from '@Logger';
import { SchemaType } from '../server/file/file.enums';
import DataSource from '../server/data-source/data-source.model';

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

    let sources;
    try {
      sources = await DataSource.find().exec();
    } catch (error) {
      Logger.error(`Unable to fetch data sources for user ${userId}`);
      throw new Error('Unable to fetch data sources');
    }

    try {
      await fs.promises.mkdir(basePath);
      await fs.promises.mkdir(path.join(basePath, 'jobs'));

      await fs.promises.mkdir(path.join(basePath, 'jobs', '.deleted'));
      hideFile.hide(path.join(basePath, 'jobs', '.deleted'), (err, path) => {
        if (err) {
          Logger.error(`Unable to create data directories for user ${userId}`);
          throw new Error('Unable to create data directories');
        }
      });

      await fs.promises.mkdir(path.join(basePath, 'tmp'));
      hideFile.hide(path.join(basePath, 'tmp'), (err, path) => {
        if (err) {
          Logger.error(`Unable to create data directories for user ${userId}`);
          throw new Error('Unable to create data directories');
        }
      });

      await fs.promises.mkdir(path.join(basePath, 'data'));

      if (sources) {
        for (let i = 0; i < sources.length; ++i) {
          const sourcePath = path.join(basePath, 'data', sources[i].slug);
          await fs.promises.mkdir(sourcePath);
          await fs.promises.mkdir(path.join(sourcePath, 'raw'));
          await fs.promises.mkdir(path.join(sourcePath, 'features'));
          await fs.promises.mkdir(path.join(sourcePath, 'models'));
        }
      }
    } catch (error) {
      Logger.error(`Unable to create data directories for user ${userId}`);
      throw new Error('Unable to create data directories');
    }
  }

  static async removeDataDirectories(userId, jobId = null) {
    if (!(typeof userId === 'string')) {
      throw new Error('Expected type for argument userId is String');
    }

    if (!(jobId === null)) {
      if (!(typeof jobId === 'string')) {
        throw new Error('Expected type for argument jobId is String');
      }
    }

    let basePath;
    let deletedPath;
    let destination;

    if (jobId === null) {
      basePath = path.join(config.data.base_path, userId);
      deletedPath = path.join(config.data.base_path, '.deleted');
      destination = path.join(deletedPath, userId);
    } else {
      basePath = path.join(config.data.base_path, userId, 'jobs', jobId);
      deletedPath = path.join(config.data.base_path, userId, 'jobs', '.deleted');
      destination = path.join(deletedPath, jobId);
    }

    try {
      await fs.promises.access(deletedPath);

      try {
        await fse.move(basePath, destination);
      } catch (error) {
        Logger.error(
          'Unable to remove data directories for ' + jobId === null
            ? 'user ' + userId
            : 'job ' + jobId
        );
        throw new Error('Unable to remove data directories');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        try {
          await fs.promises.mkdir(deletedPath);
          hideFile.hide(deletedPath, (err, path) => {
            if (err) {
              Logger.error(`Unable to create .deleted directory`);
              throw new Error('Unable to remove data directories');
            }
          });
        } catch (error) {
          Logger.error(
            'Unable to remove data directories for ' + jobId === null
              ? 'user ' + userId
              : 'job ' + jobId
          );
          throw new Error('Unable to remove data directories');
        }
      } else {
        Logger.error(
          'Unable to remove data directories for ' + jobId === null
            ? 'user ' + userId
            : 'job ' + jobId
        );
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

  static async validateJson(data, version, type) {
    if (!(typeof data === 'object')) {
      throw new Error('Expected type for argument data is Object');
    }

    if (!Object.values(SchemaType).includes(type)) {
      throw new Error('Unknown schema type');
    }

    const basePath = config.data.base_path;
    let fullPath;
    if (!(version === undefined)) {
      fullPath = path.resolve(
        basePath,
        '.app-data',
        'schemas',
        'v' + version,
        config.schemas[type]
      );
    } else {
      fullPath = path.resolve(basePath, '.app-data', 'schemas', config.schemas[type]);
    }

    try {
      const file = await fs.promises.readFile(fullPath);

      const schema = JSON.parse(file);
      const ajv = new Ajv({
        allErrors: true,
        jsonPointers: true,
        loadSchema: async uri => {}
      });

      AjvFormat(ajv);

      const validate = await ajv.compileAsync(schema);

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

  static async removeAlgoFiles(slug, container) {
    const basePath = config.data.base_path;
    const confPath = path.join(
      basePath,
      '.app-data',
      'algorithms',
      container,
      slug + '.json'
    );
    const deletePath = path.join(
      basePath,
      '.app-data',
      'algorithms',
      container,
      '.deleted'
    );

    try {
      await fs.promises.access(confPath);

      try {
        await fs.promises.access(deletePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.promises.mkdir(deletePath);
        } else {
          Logger.error(`Unable to create deleted directory under: ${deletePath}`);
          throw new Error('Unable to remove files');
        }
      }

      await fse.move(confPath, path.join(deletePath, slug + '.json'));
    } catch (error) {
      if (!(error.code === 'ENOENT')) {
        Logger.error(`Unable to remove files for algorithm ${container}.${slug}`);
        throw new Error('Unable to remove files');
      }
    }
  }

  static async writeToJobsLog(data) {
    if (!(typeof data === 'object')) {
      throw new Error('Expected type for argument data is Object');
    }

    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, '.app-data', 'jobs.log');

    try {
      await fs.promises.access(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        let fileHandle;
        try {
          fileHandle = await fs.promises.open(fullPath, 'w');
        } finally {
          if (!(fileHandle === undefined)) {
            await fileHandle.close();
          }
        }
      } else {
        Logger.error(`Unable to access jobs log file under: ${fullPath}`);
        throw new Error('Unable to access jobs log file');
      }
    }

    try {
      await fs.promises.appendFile(fullPath, JSON.stringify(data) + '\n', 'utf-8');
    } catch (error) {
      Logger.error(`Unable to write into jobs log file`);
      throw new Error('Unable to write into jobs log file');
    }
  }
}

export default FileHelper;
