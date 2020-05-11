import httpStatus from 'http-status';
import APIError from '@APIError';
import { validationResult } from 'express-validator';
import Algorithm from './algo.model';
import StringHelper from '@StringHelper';

class AlgoController {
  async getAlgos(req, res, next) {
    try {
      const algos = await Algorithm.find()
        .select()
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
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    const algo = new Algorithm();
    algo.label = req.body.label;
    algo.type = req.body.type;
    algo.enable = req.body.enable;
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
      data: null,
      message: 'Algorithm successfully created.'
    });
  }
}

export default new AlgoController();
