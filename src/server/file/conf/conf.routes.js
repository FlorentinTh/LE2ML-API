import express from 'express';
import passport from 'passport';
import Authority from '@Authority';
import { role } from '../../user/user.role';
import ConfController from './conf.controller';

const router = express.Router();

router
  .route('/conf/import')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    ConfController.importConfig,
    ConfController.processConfig
  );

router
  .route('/conf/convert')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    ConfController.convertConfig
  );

export default router;
