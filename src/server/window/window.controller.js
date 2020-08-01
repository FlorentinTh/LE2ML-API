import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import APIError from '@APIError';
import Window from './window.model';
import StringHelper from '@StringHelper';
import Logger from '@Logger';

class WindowController {
  async getFunctions(req, res, next) {
    try {
      const functions = await Window.find()
        .select()
        .where({ isDeleted: false })
        .exec();

      if (!functions) {
        return next(
          new APIError('Cannot find all window functions', httpStatus.NOT_FOUND)
        );
      }

      const data = {
        total: functions.length,
        functions: functions
      };

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async addFunction(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const func = new Window();
    func.label = req.body.label.toLowerCase();
    func.enabled = req.body.enabled;
    func.slug = StringHelper.toSlug(req.body.label, '_');
    func.container = StringHelper.toSlug(req.body.container, '-');

    try {
      await func.save();
    } catch (error) {
      return next(
        new APIError(
          'Failed to create new window function',
          httpStatus.INTERNAL_SERVER_ERROR
        )
      );
    }

    res.status(httpStatus.OK).json({
      data: func,
      message: 'Window function successfully created'
    });
  }

  async updateFunction(req, res, next) {
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
      enabled: req.body.enabled,
      container: StringHelper.toSlug(req.body.container, '-')
    };

    try {
      const func = await Window.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!func) {
        return next(
          new APIError(
            'Window function not found, cannot be updated',
            httpStatus.NOT_FOUND
          )
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          function: func
        },
        message: 'Window function successfully updated'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeFunction(req, res, next) {
    const id = req.params.id;

    try {
      const func = await Window.findOneAndUpdate({ _id: id }, { isDeleted: true }).exec();

      if (!func) {
        return next(
          new APIError(
            'Window function not found, cannot be deleted',
            httpStatus.NOT_FOUND
          )
        );
      }

      Logger.info(`Window function ${id} deleted`);

      res.status(httpStatus.OK).json({
        data: func,
        message: 'Window function successfully deleted'
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new WindowController();
