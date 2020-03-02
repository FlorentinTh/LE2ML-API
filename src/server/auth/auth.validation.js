import { check } from 'express-validator';

const validation = {
	register: [
		check('firstname').notEmpty().isString(),
		check('lastname').notEmpty().isString(),
		check('email').notEmpty().isEmail(),
		check('password').notEmpty()
	],
	login: [
		check('email').notEmpty().isEmail(),
		check('password').notEmpty()
	]
};

module.exports = validation;
