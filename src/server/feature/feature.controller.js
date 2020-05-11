import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import APIError from '@APIError';
import Feature from './feature.model';
import { domain } from './domain';
import StringHelper from '@StringHelper';

class FeatureController {
  async getFeatures(req, res, next) {
    try {
      const features = await Feature.find()
        .select()
        .exec();

      if (!features) {
        return next(new APIError('Cannot find all features.', httpStatus.NOT_FOUND));
      }

      const data = {
        total: features.length,
        features: features
      };

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async getFeaturesByDomain(req, res, next) {
    const domainParam = req.params.domain;

    if (!(domainParam === domain.TIME || domainParam === domain.FREQ)) {
      return next(new APIError('Unknown domain', httpStatus.BAD_REQUEST));
    }

    try {
      const features = await Feature.find()
        .select()
        .where('domain')
        .in([domainParam])
        .exec();

      if (!features) {
        return next(
          new APIError('Cannot find requested features.', httpStatus.NOT_FOUND)
        );
      }

      const data = {
        total: features.length,
        features: features
      };

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async addFeature(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    const feature = new Feature();
    feature.label = req.body.label;
    feature.domain = req.body.domain;
    feature.enable = req.body.enable;
    feature.slug = StringHelper.toSlug(req.body.label, '_');
    feature.container = StringHelper.toSlug(req.body.container, '-');

    try {
      await feature.save();
    } catch (error) {
      return next(
        new APIError('Failed to create new feature', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    res.status(httpStatus.OK).json({
      data: null,
      message: 'Feature successfully created.'
    });
  }
}

export default new FeatureController();
