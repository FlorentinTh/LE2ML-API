import express from 'express';
import passport from 'passport';
import Authority from '@Authority';
import { role } from '../../../user/user.role';
import DataInertialController from './data.inertial.controller';

const router = express.Router();

router
  .route('/inertial/upload/')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataInertialController.uploadInertialFile,
    DataInertialController.convertInertialFile,
    DataInertialController.validInertialFile
  );

export default router;
