import express from 'express';
import passport from 'passport';
import JobController from './job.controller';
import validation from './job.validation';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/user')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.getJobByUser
  );

router
  .route('/log/entries')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    JobController.getJobLogEntries
  );

router
  .route('/changes')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.getJobChanges
  );

router
  .route('/admin/changes')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    JobController.getAdminJobChanges
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.start,
    JobController.startJob
  );

router.route('/:id').post(Authority.allowOnlyTrustedApp(), JobController.updateJob);

router
  .route('/complete/:id')
  .post(Authority.allowOnlyTrustedApp(), JobController.completeJob);

router
  .route('/cancel/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.cancelJob
  );

router
  .route('/restart/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.restartJob
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.removeJob
  );

export default router;
