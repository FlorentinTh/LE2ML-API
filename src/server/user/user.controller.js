import httpStatus from 'http-status';
import { validationResult } from 'express-validator';

import User from '../user/user.model';
import APIError from '@APIError';
class UserController {
	constructor() {}

	async getUserById(req, res, next) {
		const id = req.params.id;

		try {
			const user = await User.findOne().where('_id').in([id]).exec();

			if(!user) {
				return next(new APIError('user not found', httpStatus.NOT_FOUND));
			}

			res.status(httpStatus.OK).json({
				data: {
					user: user
				},
				message: null
			});

		} catch (error) {
			next(new APIError(error, httpStatus.INTERNAL_SERVER_ERROR));
		}
	}

	async getUsers(req, res, next) {
		try {
			const users = await User.find().exec();

			if(!users) {
				return next(new APIError('cannot find all users', httpStatus.NOT_FOUND));
			}

			res.status(httpStatus.OK).json({
				data: {
					total: users.length,
					users: users
				},
				message: null
			});

		} catch (error) {
			next(new APIError(error, httpStatus.INTERNAL_SERVER_ERROR));
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
			const user = await User.findOneAndUpdate({_id: id}, body, {new: true}).exec();

			if(!user) {
				return next(new APIError('user not found, cannot be updated', httpStatus.NOT_FOUND));
			}

			res.status(httpStatus.OK).json({
				data: {
					user: user
				},
				message: 'user successfully updated'
			});

		} catch (error) {
			next(new APIError(error, httpStatus.INTERNAL_SERVER_ERROR));
		}
	}

	async removeUser(req, res, next) {
		const id = req.params.id;

		try {
			const user = await User.remove({_id: id}).exec();

			if(!user) {
				return next(new APIError('user not found, cannot be removed', httpStatus.NOT_FOUND));
			}

			res.status(httpStatus.OK).json({
				data: {
					user: user
				},
				message: 'user successfully deleted'
			});

		} catch (error) {
			next(new APIError(error, httpStatus.INTERNAL_SERVER_ERROR));
		}
	}
}

module.exports = new UserController();
