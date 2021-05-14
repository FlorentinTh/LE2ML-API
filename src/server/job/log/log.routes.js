import express from 'express';
import passport from 'passport';
import LogController from './log.controller';
import Authority from '@Authority';
import { role } from '../../user/user.role';

const router = express.Router();

router
  .route('/log/entries')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    LogController.getJobLogEntries
  );

router
  .route('/log/file')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    LogController.downloadJobLogFile
  );

router
  .route('/log/changes')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    LogController.getJobLogChanges
  );

export default router;
