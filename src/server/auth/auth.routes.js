import express from 'express';
import { check } from 'express-validator';

import validation from './auth.validation';
import AuthController from './auth.controller';
// import * as AuthValidation from './auth.validation';

const router = express.Router();

router.route('/register').post(validation.register, AuthController.register);
router.route('/login').post(validation.login, AuthController.login);

export default router;
