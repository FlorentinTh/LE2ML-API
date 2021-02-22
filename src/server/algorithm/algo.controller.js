import httpStatus from 'http-status';
import APIError from '@APIError';
import { validationResult } from 'express-validator';
import Algorithm from './algo.model';
import StringHelper from '@StringHelper';
import Config from '@Config';
import Logger from '@Logger';
import path from 'path';
import fs from 'fs';
import FileHelper from '@FileHelper';

const config = Config.getConfig();
class AlgoController {
  async getAlgos(req, res, next) {
    try {
      const algos = await Algorithm.find().select().where({ isDeleted: false }).exec();

      if (!algos) {
        return next(new APIError('Cannot find all algorithms', httpStatus.NOT_FOUND));
      }

      const data = {
        total: algos.length,
        algorithms: algos
      };

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async getParamsConf(req, res, next) {
    const file = req.params.file;
    const container = req.query.container;
    const basePath = config.data.base_path;
    const fullPath = path.join(basePath, '.app-data', 'algorithms', container, file);

    try {
      await fs.promises.access(fullPath);
      const test = await fs.promises.readFile(fullPath);
      const json = JSON.parse(test.toString());

      res.status(httpStatus.OK).json({
        data: json,
        message: 'success'
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return next(new APIError('File does not exists', httpStatus.NOT_FOUND));
      } else {
        return next(new APIError('File system error', httpStatus.INTERNAL_SERVER_ERROR));
      }
    }
  }

  async addAlgo(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const algo = new Algorithm();
    algo.label = req.body.label.toLowerCase();
    algo.type = req.body.type.toLowerCase();
    algo.enabled = req.body.enabled;
    algo.slug = StringHelper.toSlug(req.body.label, '_');
    algo.container = StringHelper.toSlug(req.body.container, '-');

    try {
      await algo.save();
    } catch (error) {
      return next(
        new APIError('Failed to create new algorithm', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    res.status(httpStatus.OK).json({
      data: algo,
      message: 'Algorithm successfully created'
    });
  }

  async updateAlgo(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const id = req.params.id;

    const data = {
      label: req.body.label.toLowerCase(),
      slug: StringHelper.toSlug(req.body.label, '_'),
      type: req.body.type.toLowerCase(),
      enabled: req.body.enabled,
      container: StringHelper.toSlug(req.body.container, '-')
    };

    try {
      const algo = await Algorithm.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!algo) {
        return next(
          new APIError('Algorithm not found, cannot be updated', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          algo: algo
        },
        message: `Algorithm successfully updated`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async updateAlgoConf(id, filename) {
    const data = {
      config: filename
    };

    try {
      const algorithm = await Algorithm.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!algorithm) {
        return {
          ok: false,
          data: null
        };
      }

      return {
        ok: true,
        data: algorithm
      };
    } catch (error) {
      return {
        ok: false,
        data: null
      };
    }
  }

  async removeAlgo(req, res, next) {
    const id = req.params.id;

    try {
      const algo = await Algorithm.findOneAndUpdate(
        { _id: id },
        { isDeleted: true, enabled: false }
      ).exec();

      if (!algo) {
        return next(
          new APIError('Algorithm not found, cannot be deleted', httpStatus.NOT_FOUND)
        );
      }

      FileHelper.removeAlgoFiles(algo.slug, algo.container);

      Logger.info(`Algorithm ${id} deleted`);

      res.status(httpStatus.OK).json({
        data: algo,
        message: 'Algorithm successfully deleted'
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new AlgoController();
