import express from 'express';
import passport from 'passport';
import JobController from './job.controller';
import validation from './job.validation';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/start')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.startJob,
    JobController.startJob
  );

export default router;
