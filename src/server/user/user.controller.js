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
        return next(new APIError('User not found', httpStatus.NOT_FOUND));
      }

      res.status(httpStatus.OK).json({
        data: {
          user
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
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const id = req.params.id;
    const body = req.body;

    try {
      const user = await User.findOneAndUpdate({ _id: id }, body, {
        new: true
      }).exec();

      if (!user) {
        return next(
          new APIError('User not found, cannot be updated', httpStatus.NOT_FOUND)
        );
      }

      const isValidPassword = await user.validatePassword(body.password);

      if (!isValidPassword) {
        return next(new APIError('Invalid password.', httpStatus.UNAUTHORIZED));
      }

      if (!(body.password === body.passwordConfirm)) {
        return next(
          new APIError(
            'Both new password and confirmation must be identical',
            httpStatus.UNPROCESSABLE_ENTITY
          )
        );
      }

      const token = user.generateJwt(user);

      res.status(httpStatus.OK).json({
        data: {
          user: {
            token
          }
        },
        message: 'User successfully updated'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async changePassword(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const id = req.params.id;
    const body = req.body;

    try {
      const user = await User.findOne().where('_id').in([id]).exec();

      if (!user) {
        return next(
          new APIError('User not found, password cannot be changed', httpStatus.NOT_FOUND)
        );
      }

      const isValidPassword = await user.validatePassword(body.currentPassword);

      if (!isValidPassword) {
        return next(new APIError('invalid current password', httpStatus.FORBIDDEN));
      }

      if (!(body.newPassword === body.newPasswordConfirm)) {
        return next(
          new APIError(
            'Both new password and confirmation must be identical',
            httpStatus.UNPROCESSABLE_ENTITY
          )
        );
      }

      if (body.currentPassword === body.newPassword) {
        return next(
          new APIError(
            'New password cannot be the same as current one',
            httpStatus.UNPROCESSABLE_ENTITY
          )
        );
      }

      await user.setPassword(body.newPassword, true);
      await user.save();

      const token = user.generateJwt(user);

      res.status(httpStatus.OK).json({
        data: {
          user: {
            token
          }
        },
        message: 'Password successfully modified'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new UserController();
