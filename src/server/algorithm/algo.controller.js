import httpStatus from 'http-status';
import APIError from '@APIError';
import { validationResult } from 'express-validator';
import Algorithm from './algo.model';
import StringHelper from '@StringHelper';
import Logger from '@Logger';

class AlgoController {
  async getAlgos(req, res, next) {
    try {
      const algos = await Algorithm.find()
        .select()
        .where({ isDeleted: false })
        .exec();

      if (!algos) {
        return next(new APIError('Cannot find all algorithms.', httpStatus.NOT_FOUND));
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
      message: 'Algorithm successfully created.'
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
          new APIError('Algorithm not found, cannot be updated.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          algo: algo
        },
        message: `Algorithm successfully updated.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeAlgo(req, res, next) {
    const id = req.params.id;

    try {
      const algo = await Algorithm.findOneAndUpdate(
        { _id: id },
        { isDeleted: true }
      ).exec();

      if (!algo) {
        return next(
          new APIError('Algorithm not found, cannot be deleted.', httpStatus.NOT_FOUND)
        );
      }

      Logger.info(`Algorithm ${id} deleted`);

      res.status(httpStatus.OK).json({
        data: algo,
        message: 'Algorithm successfully deleted.'
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new AlgoController();
