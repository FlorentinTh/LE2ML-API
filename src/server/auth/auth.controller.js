import httpStatus from 'http-status';
import { validationResult } from 'express-validator';

import User from '../user/user.model';
import APIError from '@APIError';

class AuthController {
  async register(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    if (!(req.body.password === req.body.passwordConfirm)) {
      return next(
        new APIError(
          'Both password and confirmation must be identical.',
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
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }

    try {
      await user.save();
      res.status(httpStatus.OK).json({
        data: null,
        message: 'User successfully registered.'
      });
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  async login(req, res, next) {
    const bodyErrors = validationResult(req);

    if (!bodyErrors.isEmpty()) {
      return next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
    }

    const email = req.body.email;
    const password = req.body.password;

    try {
      const user = await User.findOne()
        .where('email')
        .in([email])
        .exec();

      if (!user) {
        return next(new APIError('Authentication failed.', httpStatus.UNAUTHORIZED));
      }

      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        return next(new APIError('Invalid password.', httpStatus.UNAUTHORIZED));
      }

      const updateConnection = await User.findOneAndUpdate(
        { _id: user.id },
        { lastConnection: Date.now() }
      ).exec();

      if (!updateConnection) {
        return next(new APIError('Login failed.', httpStatus.INTERNAL_SERVER_ERROR));
      }

      const token = user.generateJwt(user);
      res.status(httpStatus.OK).json(user.isAuthenticated(token));
    } catch (error) {
      next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default new AuthController();
