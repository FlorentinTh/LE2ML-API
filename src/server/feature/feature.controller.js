import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import APIError from '@APIError';
import Feature from './feature.model';
import { domain } from './domain';
import StringHelper from '@StringHelper';
import Logger from '@Logger';

class FeatureController {
  async getFeatures(req, res, next) {
    try {
      const features = await Feature.find()
        .select()
        .where({ isDeleted: false })
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
        .where({ enabled: true })
        .where({ isDeleted: false })
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
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const feature = new Feature();
    feature.label = req.body.label.toLowerCase();
    feature.domain = req.body.domain.toLowerCase();
    feature.enabled = req.body.enabled;
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
      data: feature,
      message: 'Feature successfully created.'
    });
  }

  async updateFeature(req, res, next) {
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
      domain: req.body.domain.toLowerCase(),
      enabled: req.body.enabled,
      container: StringHelper.toSlug(req.body.container, '-')
    };

    try {
      const feature = await Feature.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!feature) {
        return next(
          new APIError('Feature not found, cannot be updated.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          feature: feature
        },
        message: `Feature successfully updated.`
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeFeature(req, res, next) {
    const id = req.params.id;

    try {
      const feature = await Feature.findOneAndUpdate(
        { _id: id },
        { isDeleted: true }
      ).exec();

      if (!feature) {
        return next(
          new APIError('Feature not found, cannot be deleted.', httpStatus.NOT_FOUND)
        );
      }

      Logger.info(`Feature ${id} deleted`);

      res.status(httpStatus.OK).json({
        data: feature,
        message: 'Feature successfully deleted.'
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new FeatureController();
