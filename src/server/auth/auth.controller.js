import passport from 'passport';
import httpStatus from 'http-status';
import { validationResult } from 'express-validator';

import User from '../user/user.model';
import APIError from '@APIError';

class AuthController {
	constructor() {}

	async register(req, res, next) {

		const bodyErrors = validationResult(req);

		if (!bodyErrors.isEmpty()) {
			next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
		}

		const user = new User();
		user.courriel = req.body.courriel;
		user.setPassword(req.body.password);

		try {
			await user.save();
			const token = user.generateJwt();
			res.status(httpStatus.OK).json({
				token
			});
		}
		catch (error) {
			next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
		}
	}

	login(req, res, next) {

		const bodyErrors = validationResult(req);

		if (!bodyErrors.isEmpty()) {
			next(new APIError(bodyErrors.array(), httpStatus.UNPROCESSABLE_ENTITY));
		}

		passport.authenticate('local', (err, user, info) => {
			if (err) {
				next(err);
			}

			if (user) {
				const token = user.generateJwt();
				res.status(httpStatus.OK).json({ token });
			}
			else {
				next(info);
			}
		})(req, res, next);
	}
}

module.exports = new AuthController();
