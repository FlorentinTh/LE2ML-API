import httpStatus from 'http-status';
import { validationResult } from 'express-validator';
import User from '../user/user.model';
import APIError from '@APIError';
import FileHelper from '@FileHelper';
import Logger from '@Logger';

class AuthController {
  async register(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    if (!(req.body.password === req.body.passwordConfirm)) {
      return next(
        new APIError(
          'Both password and confirmation must be identical',
          httpStatus.UNPROCESSABLE_ENTITY
        )
      );
    }

    const user = new User();
    user.firstname = req.body.firstname;
    user.lastname = req.body.lastname;
    user.email = req.body.email;

    try {
      await user.setPassword(req.body.password);
    } catch (error) {
      return next(new APIError('Registration failed', httpStatus.INTERNAL_SERVER_ERROR));
    }

    try {
      await user.save();
    } catch (error) {
      return next(new APIError('Registration failed', httpStatus.INTERNAL_SERVER_ERROR));
    }

    try {
      await FileHelper.createDataDirectories(user._id.toString());
    } catch (error) {
      return next(new APIError('Registration failed', httpStatus.INTERNAL_SERVER_ERROR));
    }

    res.status(httpStatus.OK).json({
      data: null,
      message: 'User successfully registered.'
    });
  }

  async login(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(
        new APIError('Some form inputs are not valid', httpStatus.UNPROCESSABLE_ENTITY)
      );
    }

    const email = req.body.email;
    const password = req.body.password;

    try {
      const user = await User.findOne()
        .where({ email: email })
        .where({ isDeleted: false })
        .exec();

      if (!user) {
        return next(new APIError('Authentication failed', httpStatus.UNAUTHORIZED));
      }

      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        return next(new APIError('Invalid password', httpStatus.UNAUTHORIZED));
      }

      const updateConnection = await User.findOneAndUpdate(
        { _id: user.id },
        { lastConnection: Date.now() }
      ).exec();

      if (!updateConnection) {
        return next(new APIError('Sign-in failed', httpStatus.INTERNAL_SERVER_ERROR));
      }

      const token = user.generateJwt(user);
      Logger.info(`Login of ${user._id}`);

      res.status(httpStatus.OK).json(user.isAuthenticated(token));
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new AuthController();
