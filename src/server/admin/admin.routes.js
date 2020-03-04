import express from 'express';
import passport from 'passport';

import UserController from '../user/user.controller';
import validation from '../user/user.validation';
import Authority from './../helpers/authority';
import { roles } from '../user/roles/roles';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    UserController.getUsers
  );

router
  .route('/:id')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    UserController.getUserById
  );

router
  .route('/:id')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    validation.updateUser,
    UserController.updateUser
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    UserController.removeUser
  );

export default router;
