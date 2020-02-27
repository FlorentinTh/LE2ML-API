import { check } from 'express-validator';

const validation = {
	register: [
		check('courriel').notEmpty().isEmail(),
		check('password').notEmpty()
	],
	login: [
		check('courriel').notEmpty().isEmail(),
		check('password').notEmpty()
	]
};

module.exports = validation;
