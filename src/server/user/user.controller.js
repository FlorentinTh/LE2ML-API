import httpStatus from 'http-status';
import { validationResult } from 'express-validator';

import User from '../user/user.model';
import APIError from '@APIError';

class UserController {
  async getUserById(req, res, next) {
    const id = req.params.id;

    try {
      const user = await User.findOne()
        .where('_id')
        .in([id])
        .select(['lastname', 'firstname', 'email', 'role'])
        .exec();

      if (!user) {
        return next(new APIError('User not found.', httpStatus.NOT_FOUND));
      }

      res.status(httpStatus.OK).json({
        data: {
          user: user
        },
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async getUsers(req, res, next) {
    try {
      const users = await User.find()
        .select(['lastname', 'firstname', 'email', 'role', 'dateCreated'])
        .exec();

      if (!users) {
        return next(new APIError('Cannot find all users.', httpStatus.NOT_FOUND));
      }

      res.status(httpStatus.OK).json({
        data: {
          total: users.length,
          users: users
        },
        message: 'success'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async updateUser(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    const id = req.params.id;
    const body = req.body;

    try {
      const user = await User.findOneAndUpdate({ _id: id }, body, { new: true }).exec();

      if (!user) {
        return next(
          new APIError('User not found, cannot be updated.', httpStatus.NOT_FOUND)
        );
      }

      const isValidPassword = await user.validatePassword(body.password);

      if (!isValidPassword) {
        return next(new APIError('Invalid password.', httpStatus.UNAUTHORIZED));
      }

      if (!(body.password === body.passwordConfirm)) {
        return next(
          new APIError(
            'Both new password and confirmation must be identical.',
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
      }

      const token = user.generateJwt(user);

      res.status(httpStatus.OK).json(user.isAuthenticated(token));
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeUser(req, res, next) {
    const id = req.params.id;

    try {
      const user = await User.remove({ _id: id }).exec();

      if (!user) {
        return next(
          new APIError('User not found, cannot be removed.', httpStatus.NOT_FOUND)
        );
      }

      res.status(httpStatus.OK).json({
        data: {
          user: user
        },
        message: 'User successfully deleted.'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async changePassword(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    const id = req.params.id;
    const body = req.body;

    try {
      const user = await User.findOne()
        .where('_id')
        .in([id])
        .exec();

      if (!user) {
        return next(
          new APIError(
            'User not found, password cannot be changed.',
            httpStatus.NOT_FOUND
          )
        );
      }

      const isValidPassword = await user.validatePassword(body.currentPassword);

      if (!isValidPassword) {
        return next(new APIError('invalid current password', httpStatus.FORBIDDEN));
      }

      if (!(body.newPassword === body.newPasswordConfirm)) {
        return next(
          new APIError(
            'Both new password and confirmation must be identical.',
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
      }

      await user.setPassword(body.newPassword);

      await user.save();
      res.status(httpStatus.OK).json({
        data: null,
        message: 'Password successfully changed.'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new UserController();
