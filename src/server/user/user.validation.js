import { check } from 'express-validator';
import { roles } from './../user/roles/roles';

const validation = {
	updateUser: [
		check('lastname').notEmpty().isString(),
		check('firstname').notEmpty().isString(),
		check('email').notEmpty().isEmail(),
		check('role').notEmpty().isString().isIn([roles.ADMIN, roles.USER])
	]
};

module.exports = validation;
