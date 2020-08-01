import express from 'express';
import passport from 'passport';
import validation from './window.validation';
import WindowController from './window.controller';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    WindowController.getFunctions
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.addWindow,
    WindowController.addFunction
  );

router
  .route('/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateWindow,
    WindowController.updateFunction
  );

router
  .route('/:id/state')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateState,
    WindowController.updateFunction
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    WindowController.removeFunction
  );

export default router;
