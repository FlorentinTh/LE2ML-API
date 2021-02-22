import httpStatus from 'http-status';
import APIError from '@APIError';
import DataSource from './data-source.model';
import { validationResult } from 'express-validator';
import StringHelper from '@StringHelper';

class DataSourceController {
  async getDataSources(req, res, next) {
    try {
      const sources = await DataSource.find().select().exec();

      if (!sources) {
        return next(new APIError('Cannot find all data sources', httpStatus.NOT_FOUND));
      }

      const data = {
        total: sources.length,
        sources: sources
      };

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async addDataSource(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const source = new DataSource();
    source.label = req.body.label.toLowerCase();
    source.enabled = req.body.enabled;
    source.editableFiles = req.body.editableFiles;
    source.slug = StringHelper.toSlug(req.body.label, '_');

    try {
      await source.save();
    } catch (error) {
      return next(
        new APIError('Failed to create new data source', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    res.status(httpStatus.OK).json({
      data: source,
      message: 'Data source successfully created'
    });
  }

  async updateDataSource(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const id = req.params.id;

    const data = {
      enabled: req.body.enabled
    };

    try {
      const source = await DataSource.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!source) {
        return next(
          new APIError('Data source not found, cannot be updated', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          source: source
        },
        message: 'Data source successfully updated'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new DataSourceController();
