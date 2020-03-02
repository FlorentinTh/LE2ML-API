import express from 'express';
import passport from 'passport';
import httpStatus from 'http-status';

import validation from './auth.validation';
import AuthController from './auth.controller';
import APIError from '@APIError';

const router = express.Router();

router.route('/register').post(validation.register, AuthController.register);
router.route('/login').post(validation.login, AuthController.login);

router.route('/test').get((req, res, next) => {
	passport.authenticate('jwt', (err, user, info) => {
		if (err) {
			return next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
		}

		if (user) {
			res.status(httpStatus.OK).json({
				message: `access granted to user: ${user._id}`
			});
		}
		else {
			return next(new APIError('user not found', httpStatus.UNAUTHORIZED));
		}
	  })(req, res, next);
});

export default router;
