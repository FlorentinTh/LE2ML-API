import express from 'express';
import validation from './auth.validation';
import AuthController from './auth.controller';

const router = express.Router();

router.route('/hello').get((req, res, next) => {
  res.status(200).json({ message: 'Hello World!' });
});

router.route('/register').put(validation.register, AuthController.register);
router.route('/login').post(validation.login, AuthController.login);

export default router;
