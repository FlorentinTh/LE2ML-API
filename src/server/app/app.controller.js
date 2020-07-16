import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import App from './app.model';
import { Types } from 'mongoose';
import APIError from '@APIError';
import Logger from '@Logger';

class AppController {
  async getKeys(req, res, next) {
    try {
      const appKeys = await App.find()
        .select(['name', 'description', 'dateCreated', 'user'])
        .where()
        .exec();

      if (!appKeys) {
        return next(new APIError('Cannot find all app keys.', httpStatus.NOT_FOUND));
      }

      const results = [];

      for (let i = 0; i < appKeys.length; ++i) {
        const user = await appKeys[i].getUserDetails(appKeys[i].user);
        const appKeyObj = appKeys[i].toObject();
        appKeyObj.user = user;

        results.push(appKeyObj);
      }

      const data = {
        total: results.length,
        app: {
          keys: results
        }
      };

      res.status(httpStatus.OK).json({
        data: data,
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async generateKey(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const app = new App();
    app.name = req.body.name;
    app.description = req.body.description;
    app.user = Types.ObjectId(req.user.id);

    let key;
    try {
      key = await app.generateKey();
    } catch (error) {
      return next(
        new APIError('[501] App key generation failed', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    try {
      await app.save();
    } catch (error) {
      return next(
        new APIError('[502] App key generation failed', httpStatus.INTERNAL_SERVER_ERROR)
      );
    }

    Logger.info(`New app key (${req.body.name}) registered by user: ${req.user.id}`);
    res.status(httpStatus.OK).json({
      data: {
        app: {
          key: key
        }
      },
      message: 'App key successfully generated.'
    });
  }

  async updateKey(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const id = req.params.id;

    const data = {
      name: req.body.name.toLowerCase(),
      description: req.body.description.toLowerCase()
    };

    try {
      const appKey = await App.findOneAndUpdate({ _id: id }, data, {
        new: true
      }).exec();

      if (!appKey) {
        return next(
          new APIError('App key not found, cannot be updated.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          appKey: appKey
        },
        message: `App key successfully updated.`
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async revokeKey(req, res, next) {
    const appId = req.params.id;
    const app = await App.findOneAndDelete(
      { _id: appId },
      { select: { name: 1 } }
    ).exec();

    if (!app) {
      return next(
        new APIError('App key not found, cannot be revoked.', httpStatus.NOT_FOUND)
      );
    }

    Logger.info(`App key ${appId} revoked by user: ${req.user.id}`);

    res.status(httpStatus.OK).json({
      data: app,
      message: 'App key successfully revoked.'
    });
  }

  async revokeKeys(req, res, next) {
    const app = await App.remove().exec();

    if (!(app.ok === 1)) {
      return next(new APIError('App keys cannot be all revoked.', httpStatus.NOT_FOUND));
    }

    Logger.info(`All app keys revoked by user: ${req.user.id}`);

    res.status(httpStatus.OK).json({
      data: {
        total: app.deletedCount
      },
      message: 'All app keys successfully revoked.'
    });
  }
}

export default new AppController();
