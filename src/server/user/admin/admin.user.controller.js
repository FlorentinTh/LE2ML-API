import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import APIError from '@APIError';
import User from '../user.model';
import { role } from '../user.role';
import FileHelper from '@FileHelper';
import Logger from '@Logger';

class AdminController {
  async getUserByEmail(req, res, next) {
    const email = req.params.email;

    try {
      const user = await User.findOne()
        .select(['lastname', 'firstname', 'email'])
        .where({ email: email })
        .where({ isDeleted: false })
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
    // const pageOpts = {
    //   page: parseInt(req.query.page, 10) || 0,
    //   limit: parseInt(req.query.limit, 10) || 500
    // };

    const roleParam = req.query.role || role.USER;

    if (!(roleParam === role.USER || roleParam === role.ADMIN)) {
      return next(new APIError('Unknown role', httpStatus.BAD_REQUEST));
    }

    try {
      let users = null;
      users = await User.find()
        .select([
          'lastname',
          'firstname',
          'email',
          'role',
          'dateCreated',
          'lastConnection'
        ])
        .where({ role: roleParam })
        .where({ isDeleted: false })
        .exec();
      //   users = await User.find()
      //     .select([
      //       'lastname',
      //       'firstname',
      //       'email',
      //       'role',
      //       'dateCreated',
      //       'lastConnection'
      //     ])
      //     .where('role')
      //     .in([role])
      //     .skip(pageOpts.page * pageOpts.limit)
      //     .limit(pageOpts.limit)
      //     .exec();

      if (!users) {
        return next(new APIError('Cannot find all users', httpStatus.NOT_FOUND));
      }

      const data = {
        total: users.length,
        users: users
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

      res.status(httpStatus.OK).json({
        data: {
          user: user
        },
        message: `User successfully updated`
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async removeUser(req, res, next) {
    const id = req.params.id;

    try {
      const user = await User.findOneAndUpdate({ _id: id }, { isDeleted: true }).exec();

      if (!user) {
        return next(
          new APIError('User not found, cannot be deleted', httpStatus.NOT_FOUND)
        );
      }

      try {
        await FileHelper.removeDataDirectories(id.toString());
      } catch (error) {
        return next(
          new APIError(
            'Unable to remove data directories',
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
      }

      Logger.info(`User ${id} deleted`);

      res.status(httpStatus.OK).json({
        data: user,
        message: 'User successfully deleted'
      });
    } catch (error) {
      return next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async setTempPassword(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const email = req.params.email;
    const body = req.body;

    try {
      const user = await User.findOne().where('email').in([email]).exec();

      if (!user) {
        return next(
          new APIError(
            'Email not found, temporary password cannot be set',
            httpStatus.NOT_FOUND
          )
        );
      }

      if (!(body.tempPassword === body.tempPasswordConfirm)) {
        return next(
          new APIError(
            'Both temporary password and confirmation must be identical',
            httpStatus.UNPROCESSABLE_ENTITY
          )
        );
      }

      if (user.tmpPassword) {
        return next(
          new APIError(
            'User already have a temporary password',
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
        message: 'Temporary password successfully applied'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new AdminController();
