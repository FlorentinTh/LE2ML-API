import httpStatus from 'http-status';
import APIError from '@APIError';
import Feature from './feature.model';
import { domain } from './domain';

class FeatureController {
  async getFeatures(req, res, next) {
    const domainParam = req.query.domain || domain.TIME;

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
}

export default new FeatureController();
