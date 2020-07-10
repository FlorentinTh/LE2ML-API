import express from 'express';
import passport from 'passport';
import JobController from './job.controller';
import validation from './job.validation';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.getJobs
  );

router
  .route('/user')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.getJobByUser
  );

router.route('/logs').get();

router.route('/changes').get();

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.start,
    JobController.startJob
  );

router.route('/:id').post(Authority.allowOnlyTrustedApp(), JobController.updateJobTask);

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
