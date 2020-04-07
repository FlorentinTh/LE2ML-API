import express from 'express';
import passport from 'passport';

import AdminController from './admin.users.controller';
import UserController from '../../user/user.controller';
import validation from './admin.users.validation';
import Authority from '@Authority';
import { roles } from '../../user/roles/roles';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    AdminController.getUsers
  );

router
  .route('/:id')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    UserController.getUserById
  );

router
  .route('/email/:email')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    AdminController.getUserByEmail
  );

router
  .route('/search/user')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    AdminController.searchUser
  );

router
  .route('/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    validation.updateUser,
    AdminController.updateUser
  );

router
  .route('/role/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    validation.updateRole,
    AdminController.updateUser
  );

router
  .route('/password/:email')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    validation.setTempPassword,
    AdminController.setTempPassword
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(roles.ADMIN),
    AdminController.removeUser
  );

export default router;
