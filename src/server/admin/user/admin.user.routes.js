import express from 'express';
import passport from 'passport';
import AdminController from './admin.user.controller';
import UserController from '../../user/user.controller';
import validation from './admin.user.validation';
import Authority from '@Authority';
import { role } from '../../user/user.role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AdminController.getUsers
  );

router
  .route('/:id')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    UserController.getUserById
  );

router
  .route('/email/:email')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AdminController.getUserByEmail
  );

router
  .route('/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateUser,
    AdminController.updateUser
  );

router
  .route('/role/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateRole,
    AdminController.updateUser
  );

router
  .route('/password/:email')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.setTempPassword,
    AdminController.setTempPassword
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AdminController.removeUser
  );

export default router;
