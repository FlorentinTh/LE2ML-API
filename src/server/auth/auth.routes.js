import express from 'express';

import validation from './auth.validation';
import AuthController from './auth.controller';

const router = express.Router();

router.route('/register').post(validation.register, AuthController.register);
router.route('/login').post(validation.login, AuthController.login);

export default router;
