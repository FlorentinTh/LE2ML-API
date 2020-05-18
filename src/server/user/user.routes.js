import express from 'express';
import passport from 'passport';
import UserController from './user.controller';
import validation from './user.validation';
import Authority from '@Authority';
import { role } from './user.role';

const router = express.Router();

router
  .route('/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    Authority.allowSameIdentity(),
    validation.updateUser,
    UserController.updateUser
  );

router
  .route('/password/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    Authority.allowSameIdentity(),
    validation.changePassword,
    UserController.changePassword
  );

export default router;
