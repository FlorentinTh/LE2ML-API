import express from 'express';
import passport from 'passport';
import JobController from './job.controller';
import TaskController from './task/task.controller';
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
  .route('/changes')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.getJobChanges
  );

router
  .route('/:id/download')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.downloadResultFile
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.start,
    JobController.startJob,
    TaskController.startTask,
    TaskController.failTask
  );

router
  .route('/:id/cancel')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.cancelJob
  );

router
  .route('/:id/restart')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.restartJob,
    TaskController.startTask,
    TaskController.failTask
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    JobController.removeJob
  );

export default router;
