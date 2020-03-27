import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import APIError from '@APIError';
import User from '../../user/user.model';
import { roles } from '../../user/roles/roles';

class AdminController {
  async getUserByEmail(req, res, next) {
    const email = req.params.email;

    try {
      const user = await User.findOne()
        .where('email')
        .in([email])
        .select(['lastname', 'firstname', 'email'])
        .exec();

      if (!user) {
        return next(new APIError(`${email} is not found.`, httpStatus.NOT_FOUND));
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
        .select([
          'lastname',
          'firstname',
          'email',
          'role',
          'dateCreated',
          'lastConnection'
        ])
        .exec();

      if (!users) {
        return next(new APIError('Cannot find all users.', httpStatus.NOT_FOUND));
      }

      const adminUsers = users.filter(user => user.role === roles.ADMIN);
      const normalUsers = users.filter(user => user.role !== roles.ADMIN);

      const data = {
        admin: {
          total: adminUsers.length,
          users: adminUsers
        },
        normal: {
          total: normalUsers.length,
          users: normalUsers
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

      res.status(httpStatus.OK).json({
        data: {
          user: user
        },
        message: `User successfully updated.`
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeUser(req, res, next) {
    const id = req.params.id;

    try {
      const user = await User.findOneAndDelete({ _id: id }).exec();

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

  async setTempPassword(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    const email = req.params.email;
    const body = req.body;

    try {
      const user = await User.findOne()
        .where('email')
        .in([email])
        .exec();

      if (!user) {
        return next(
          new APIError(
            'Email not found, temporary password cannot be set.',
            httpStatus.NOT_FOUND
          )
        );
      }

      if (!(body.tempPassword === body.tempPasswordConfirm)) {
        return next(
          new APIError(
            'Both temporary password and confirmation must be identical.',
            httpStatus.UNPROCESSABLE_ENTITY
          )
        );
      }

      if (user.tmpPassword) {
        return next(
          new APIError(
            'User already have a temporary password.',
            httpStatus.UNPROCESSABLE_ENTITY
          )
        );
      }

      user.tmpPassword = true;
      await user.setPassword(body.tempPassword);
      await user.save();

      res.status(httpStatus.OK).json({
        data: {
          user: user
        },
        message: 'Temporary password successfully applied.'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new AdminController();
