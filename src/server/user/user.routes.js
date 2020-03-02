import express from 'express';

import User from '../user/user.model';
import UserController from './user.controller';
import validation from './user.validation';

const router = express.Router();

router.route('/').get(UserController.getUsers);
router.route('/:id').get(UserController.getUserById);
router.route('/:id').put(validation.updateUser, UserController.updateUser);
router.route('/:id').delete(UserController.removeUser);

export default router;
