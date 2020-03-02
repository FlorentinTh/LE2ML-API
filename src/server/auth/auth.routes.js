import express from 'express';
import passport from 'passport';
import httpStatus from 'http-status';

import validation from './auth.validation';
import AuthController from './auth.controller';
import APIError from '@APIError';
import Authority from './../helpers/authority';
import { roles } from './../user/roles/roles';

const router = express.Router();

router.route('/register').post(validation.register, AuthController.register);
router.route('/login').post(validation.login, AuthController.login);


router.route('/test').get(passport.authenticate('jwt', { session: false }), Authority.allowOnly(roles.ADMIN, roles.USER), (req, res, next) => {
	res.status(httpStatus.OK).json({
		message: `coucou magritte`
	});
});

export default router;
