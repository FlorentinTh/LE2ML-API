import express from 'express';
import passport from 'passport';

import UserController from './user.controller';
import validation from './user.validation';
import Authority from './../helpers/authority';
import { roles } from './roles/roles';

const router = express.Router();

router
  .route('/:id')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN, roles.USER),
    Authority.allowSameIdentity(),
    UserController.getUserById
  );

router
  .route('/:id')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN, roles.USER),
    Authority.allowSameIdentity(),
    validation.updateUser,
    UserController.updateUser
  );

router
  .route('/password/:id')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN, roles.USER),
    Authority.allowSameIdentity(),
    validation.changePassword,
    UserController.changePassword
  );

export default router;
