import express from 'express';
import validation from './app.validation';
import AppController from './app.controller';
import passport from 'passport';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/keys')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AppController.getKeys
  );

router
  .route('/keys/generate')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.addOrUpdate,
    AppController.generateKey
  );

router
  .route('/keys/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.addOrUpdate,
    AppController.updateKey
  );

router
  .route('/keys/revoke/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AppController.revokeKey
  );

router
  .route('/keys/revoke')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AppController.revokeKeys
  );

export default router;
